import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const LINK_DAYS = 3 // was 7: shorter window limits damage if a message leaks
const BASE_URL = 'https://alghorfa.net'
const enc = new TextEncoder()

const b64u = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

// Escape anything that ends up inside the HTML
const esc = (v: unknown) =>
  String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

// Constant-time comparison for the webhook secret
const safeEqual = (a: string, b: string) => {
  const x = enc.encode(a), y = enc.encode(b)
  if (x.length !== y.length) return false
  let diff = 0
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i]
  return diff === 0
}

const signToken = async (p: { o: string; u: string; e: number }) => {
  const secret = Deno.env.get('OFFER_LINK_SECRET')
  if (!secret || secret.length < 32) throw new Error('OFFER_LINK_SECRET missing or too short')
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const body = b64u(enc.encode(JSON.stringify(p)))
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body))
  return `${body}.${b64u(sig)}`
}

Deno.serve(async (req) => {
  // 0. Only our database webhook may call this (it can trigger paid WhatsApp sends)
  const expected = Deno.env.get('WEBHOOK_SECRET')
  const got = req.headers.get('x-webhook-secret') ?? ''
  if (!expected || !safeEqual(got, expected)) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const { record: offer } = await req.json() // newly inserted offer row
    if (!offer?.id || !offer.request_id || !offer.request_creator) {
      return new Response('Bad payload', { status: 400 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1-3. Independent lookups, run together
    const [reqRes, clientRes, userRes] = await Promise.all([
      supabase.from('travel_requests_agent')
        .select('country_name, area_name, offers_number')
        .eq('id', offer.request_id).single(),
      supabase.from('clients')
        .select('first_name, second_name, phone_number, whatsapp_opt_in')
        .eq('user_id', offer.request_creator).single(),
      supabase.auth.admin.getUserById(offer.request_creator),
    ])

    const requestInfo = reqRes.data
    const client = clientRes.data
    const email: string | null = userRes.data?.user?.email ?? null

    if (reqRes.error || !requestInfo) {
      console.error('Travel request not found', reqRes.error?.message)
      return new Response('Travel request not found', { status: 400 })
    }
    if (clientRes.error || !client) {
      console.error('Client not found', clientRes.error?.message)
      return new Response('Client not found', { status: 400 })
    }

    // Normalize phone: keep digits and a leading +, drop spaces/dashes/etc.
    const toE164 = (v: string) => {
  const d = String(v ?? '').replace(/\D/g, '')
  return d ? '+' + d : ''
}
const phone = toE164(client.phone_number)
    const useWhatsapp = !!(phone && client.whatsapp_opt_in)

    // Email is required unless we are going to deliver by WhatsApp
    if (!useWhatsapp && !email) {
      console.error('User email not found', userRes.error?.message)
      return new Response('User email not found', { status: 400 })
    }

    // 4. Offer link: signed capability token only. The redeem function mints a
    // fresh Supabase login when the link is clicked, so nothing is burned by
    // link previews or prefetching.
    let offerLink = `${BASE_URL}/offer/${offer.id}`
    try {
      const token = await signToken({
        o: String(offer.id),
        u: offer.request_creator,
        e: Date.now() + LINK_DAYS * 24 * 3600 * 1000,
      })
      offerLink += `?k=${encodeURIComponent(token)}`
    } catch (e) {
      // Plain link still works: sign in, then the offer
      console.error('Could not sign offer link:', (e as Error).message)
    }

    // Content fields
    const fullName = `${client.first_name ?? ''} ${client.second_name ?? ''}`.trim()
    const location = `${requestInfo.area_name}, ${requestInfo.country_name}`
    const totalOffers = requestInfo.offers_number
    const numHotels = offer.num_of_hotels ?? null
    const hasHotelCount = numHotels !== null
    const hasPriceRange = offer.min_cost != null && offer.max_cost != null
    const range = hasPriceRange ? `${offer.min_cost} - ${offer.max_cost}` : ''

    // 5a. WhatsApp via Twilio (falls back to email if it fails)
    if (useWhatsapp) {
      try {
        const sid = Deno.env.get('TWILIO_ACCOUNT_SID')!
        const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')!
        // Accept TWILIO_WHATSAPP_FROM with or without the "whatsapp:" prefix
        const from = (Deno.env.get('TWILIO_WHATSAPP_FROM') ?? '').replace(/^whatsapp:/, '')

        const twilioRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + btoa(`${sid}:${authToken}`),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              From: `whatsapp:${from}`,
              To: `whatsapp:${phone}`,
              ContentSid: Deno.env.get('TWILIO_OFFER_TEMPLATE_SID')!,
              ContentVariables: JSON.stringify({
                '1': location,
                '2': String(totalOffers),
                // If your template uses this as a BUTTON URL, pass only the
                // dynamic suffix here (e.g. `${offer.id}?k=...`), not the full URL.
                '3': offerLink,
              }),
            }),
          }
        )

        if (twilioRes.ok) {
          return new Response('WhatsApp message sent', { status: 200 })
        }
        // Status only: the body can contain phone numbers
        console.error('Twilio error, status', twilioRes.status)
      } catch (e) {
        console.error('Twilio request failed:', (e as Error).message)
      }

      if (!email) {
        return new Response('Failed to send WhatsApp message', { status: 500 })
      }
      // otherwise fall through and send the email instead
    }

    // 5b. Email via Brevo
    const subject = `Alghorfa | ${requestInfo.area_name}: رد جديد / New reply`

    const button = (label: string) => `
      <p style="text-align:center;margin-top:20px;">
        <a href="${esc(offerLink)}" style="background-color:#1a73e8;color:#ffffff;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">${label}</a>
      </p>`

    const htmlContent = `
  <div lang="ar" dir="rtl" style="font-family:Arial,sans-serif;text-align:right;margin-bottom:24px;">
    <p>مرحباً،</p>
    <p>وصلك رد جديد على طلب رحلتك إلى <strong>${esc(location)}</strong>.</p>
    <p>لديك الآن <strong>${esc(totalOffers)}</strong> ردود على طلبك.</p>
    ${hasHotelCount ? `<p>عدد الفنادق المعروضة: <strong>${esc(numHotels)}</strong></p>` : ''}
    ${hasPriceRange ? `<p>نطاق السعر: <strong>${esc(range)}</strong></p>` : ''}
    ${button('يمكنك رؤية التفاصيل')}
  </div>
  <hr style="border:none;border-top:1px solid #ddd;" />
  <div lang="en" dir="ltr" style="font-family:Arial,sans-serif;text-align:left;margin-top:24px;">
    <p>Hello,</p>
    <p>You have a new reply on your trip request to <strong>${esc(location)}</strong>.</p>
    <p>You now have <strong>${esc(totalOffers)}</strong> replies on your trip.</p>
    ${hasHotelCount ? `<p>Hotels offered: <strong>${esc(numHotels)}</strong></p>` : ''}
    ${hasPriceRange ? `<p>Price range: <strong>${esc(range)}</strong></p>` : ''}
    ${button('You can see the details')}
  </div>`

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': Deno.env.get('BREVO_API_KEY')!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Alghorfa', email: 'feedback@alghorfa.net' },
        to: [{ email, name: fullName || undefined }],
        subject,
        htmlContent,
      }),
    })

    if (!res.ok) {
      console.error('Brevo error', res.status, await res.text())
      return new Response('Failed to send email', { status: 500 })
    }

    return new Response('Email sent', { status: 200 })
  } catch (err) {
    console.error('Unexpected error', (err as Error).message)
    return new Response('Internal error', { status: 500 })
  }
})
