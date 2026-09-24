import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const LINK_DAYS = 7
const enc = new TextEncoder()
const b64u = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const signToken = async (p: { o: string; u: string; e: number }) => {
  const secret = Deno.env.get('OFFER_LINK_SECRET')
  if (!secret || secret.length < 32) throw new Error('OFFER_LINK_SECRET missing or too short')

  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const body = b64u(enc.encode(JSON.stringify(p)))
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body))
  return `${body}.${b64u(sig)}`
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json()
    const offer = payload.record // newly inserted offer row

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Get country/area name from the view, keyed by request_id
    const { data: requestInfo, error: requestError } = await supabase
      .from('travel_requests_agent')
      .select('country_name, area_name')
      .eq('id', offer.request_id)
      .single()

    if (requestError || !requestInfo) {
      console.error('Could not find travel request info', requestError)
      return new Response('Travel request not found', { status: 400 })
    }

    // 2. Get client name
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('first_name, second_name, user_id')
      .eq('user_id', offer.request_creator)
      .single()

    if (clientError || !client) {
      console.error('Could not find client', clientError)
      return new Response('Client not found', { status: 400 })
    }

    // 3. Get email from auth.users
    const { data: userData, error: userError } =
      await supabase.auth.admin.getUserById(offer.request_creator)

    if (userError || !userData?.user?.email) {
      console.error('Could not find user email', userError)
      return new Response('User email not found', { status: 400 })
    }

    const email = userData.user.email
    const fullName = `${client.first_name} ${client.second_name}`.trim()
    const location = `${requestInfo.area_name}, ${requestInfo.country_name}`
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
  type: 'magiclink',
  email,
})
const tokenHash = linkData?.properties?.hashed_token
    let offerLink = `https://alghorfa.net/offer/${offer.id}`
    try {
      const token = await signToken({
        o: String(offer.id),
        u: offer.request_creator,
        e: Date.now() + LINK_DAYS * 24 * 3600 * 1000,
      })
      offerLink = `${offerLink}?k=${token}`
    } catch (e) {
      // The plain link still works: signin, then the offer. Log the message only.
      console.error('Could not sign offer link:', (e as Error).message)
    }
//const offerLink = !linkError && tokenHash
//  ? `https://alghorfa.net/offer/${offer.id}?token_hash=${encodeURIComponent(tokenHash)}`
 // : `https://alghorfa.net/offer/${offer.id}`
   // const offerLink = `https://alghorfa.net/client/offer/${offer.id}`
        // Offer summary fields
    const numHotels = offer.num_of_hotels ?? null
    const minCost = offer.min_cost ?? null
    const maxCost = offer.max_cost ?? null

    const hasHotelCount = numHotels !== null
    const hasPriceRange = minCost !== null && maxCost !== null
    // 4. Build bilingual subject and body
    const subject = `Alghorfa | ${requestInfo.area_name}: رد جديد / New reply`

    const htmlContent = `
  <div lang="ar" dir="rtl" style="font-family: Arial, sans-serif; text-align: right; margin-bottom: 24px;">
    <p>مرحباً،</p>
    <p>وصلك رد جديد على طلب رحلتك إلى <strong>${location}</strong>.</p>
    ${hasHotelCount ? `<p>عدد الفنادق المعروضة: <strong>${numHotels}</strong></p>` : ''}
    ${hasPriceRange ? `<p>نطاق السعر: <strong>${minCost} - ${maxCost}</strong></p>` : ''}
    <p><a href="${offerLink}" style="color: #1a73e8;">يمكنك الاطلاع على التفاصيل</a></p>
  </div>
  <hr style="border: none; border-top: 1px solid #ddd;" />
  <div lang="en" dir="ltr" style="font-family: Arial, sans-serif; text-align: left; margin-top: 24px;">
    <p>Hello,</p>
    <p>You have a new reply on your trip request to <strong>${location}</strong>.</p>
    ${hasHotelCount ? `<p>Hotels offered: <strong>${numHotels}</strong></p>` : ''}
    ${hasPriceRange ? `<p>Price range: <strong>${minCost} - ${maxCost}</strong></p>` : ''}
    <p><a href="${offerLink}" style="color: #1a73e8;">You can see the details</a></p>
  </div>
`
    // 5. Send via Brevo
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': Deno.env.get('BREVO_API_KEY')!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Alghorfa', email: 'feedback@alghorfa.net' },
        to: [{ email, name: fullName }],
        subject,
        htmlContent,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Brevo error', err)
      return new Response('Failed to send email', { status: 500 })
    }

    return new Response('Email sent', { status: 200 })
  } catch (err) {
    console.error('Unexpected error', err)
    return new Response('Internal error', { status: 500 })
  }
})
