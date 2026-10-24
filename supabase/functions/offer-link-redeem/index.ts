// supabase/functions/redeem-offer-link/index.ts
//
// Exchanges a signed offer-link token (?k=...) for a fresh Supabase login.
//
// Secrets:
//   OFFER_LINK_SECRET   same value as the send-offer function (32+ chars)
//   ONE_TIME_LINKS      optional. Set to "true" to make each link usable once
//                       (needs the used_offer_tokens table and a "j" field in the token)
//
// Deploy with:  supabase functions deploy <name> --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
// near the top, with the other helpers
const stripPlaceholders = (s: unknown) =>
  String(s ?? '').replace(/\{\{\s*\d+\s*\}\}/g, '').trim()

const enc = new TextEncoder()
const fromB64u = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))

const verifyToken = async (t: string) => {
  try {
    const secret = Deno.env.get('OFFER_LINK_SECRET')
    if (!secret || secret.length < 32) throw new Error('OFFER_LINK_SECRET missing or too short')

    const [body, sig] = String(t).split('.')
    if (!body || !sig) return null

    const key = await crypto.subtle.importKey(
      'raw', enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    )
    const ok = await crypto.subtle.verify('HMAC', key, fromB64u(sig), enc.encode(body))
    if (!ok) return null

    const p = JSON.parse(new TextDecoder().decode(fromB64u(body)))
    return p.e > Date.now() ? p : null // expired tokens are rejected
  } catch (e) {
    console.error('verifyToken:', (e as Error).message) // message only, never the secret or the token
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  console.log('redeem: called')

  try {
    //const { offerId, k } = await req.json()
    const body = await req.json()
    const offerId = stripPlaceholders(body.offerId)
    const k = stripPlaceholders(body.k)

    console.log('redeem: input', { hasOfferId: !!offerId, hasK: !!k })
    const rawId = String(offerId ?? '')
console.log('redeem: raw offerId', JSON.stringify(rawId.slice(0, 60)), {
  len: rawId.length,
  hasQuestion: rawId.includes('?'),
  hasPercent: rawId.includes('%'),
  kLen: String(k ?? '').length,
})

    // Same 401 for wrong, expired and mismatched (the log line says which)
    const p = await verifyToken(k)
    if (!p) { console.log('redeem: token invalid or expired'); return json({ ok: false }, 401) }
    if (p.o !== String(offerId)) { console.log('redeem: offerId mismatch'); return json({ ok: false }, 401) }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // Optional one-time use: the token id (j) can be recorded only once
    if (Deno.env.get('ONE_TIME_LINKS') === 'true') {
      if (p.j) {
        const { error: useErr } = await admin.from('used_offer_tokens').insert({ jti: String(p.j) })
        if (useErr) {
          if (useErr.code === '23505') { // unique violation: already used
            console.log('redeem: token already used')
            return json({ ok: false }, 401)
          }
          console.error('redeem: could not record token use:', useErr.message)
          return json({ ok: false }, 500)
        }
      } else {
        console.log('redeem: token has no j (older link), skipping one-time check')
      }
    }

    const { data: u, error: getErr } = await admin.auth.admin.getUserById(p.u)
    if (!u?.user) { console.log('redeem: user not found', getErr?.message); return json({ ok: false }, 401) }

    console.log('redeem: user', { hasEmail: !!u.user.email, hasPhone: !!u.user.phone })

    let email = u.user.email

    // Phone-only user: give them a placeholder email so they can get a magic link.
    // This is a login identity only, not a real mailbox.
    if (!email && u.user.phone) {
      const candidate = `${u.user.id}@alghorfa.net`.toLowerCase()
      const { error: upErr } = await admin.auth.admin.updateUserById(u.user.id, {
        email: candidate,
        email_confirm: true,
      })
      if (upErr) {
        console.error('redeem: placeholder email failed:', upErr.message, upErr.status)
      } else {
        email = candidate
        console.log('redeem: placeholder email set')
      }
    }

    if (email) {
      // Fresh Supabase login, used by the app within seconds
      const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
      if (error || !data?.properties?.hashed_token) {
        console.error('redeem: generateLink failed:', error?.message)
        return json({ ok: false }, 500)
      }
      console.log('redeem: returning token_hash')
      return json({ ok: true, token_hash: data.properties.hashed_token })
    }

    if (u.user.phone) {
      // No phone equivalent to a magic link exists in Supabase.
      // The app signs this client in another way, prefilled with this number.
      console.log('redeem: returning phone branch')
      const phone = u.user.phone.startsWith('+') ? u.user.phone : `+${u.user.phone}`
      return json({ ok: true, phone })
    }

    console.log('redeem: no email and no phone')
    return json({ ok: false }, 401)
  } catch (e) {
    console.error('redeem error:', (e as Error).message)
    return json({ ok: false }, 500)
  }
})
