import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

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
  try {
    const { offerId, k } = await req.json()
    const p = await verifyToken(k)
    // Same answer for wrong, expired and mismatched
    if (!p || p.o !== String(offerId)) return json({ ok: false }, 401)

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: u } = await admin.auth.admin.getUserById(p.u)
    if (!u?.user?.email) return json({ ok: false }, 401)

    // Fresh Supabase login, used by the app within seconds
    const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email: u.user.email })
    if (error || !data?.properties?.hashed_token) return json({ ok: false }, 500)

    return json({ ok: true, token_hash: data.properties.hashed_token })
  } catch (e) {
    console.error('redeem error:', (e as Error).message)
    return json({ ok: false }, 500)
  }
})
