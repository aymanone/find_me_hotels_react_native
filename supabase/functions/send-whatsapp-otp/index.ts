// supabase/functions/send-whatsapp-otp/index.ts
//
// Supabase "Send SMS" auth hook -> delivers the OTP through Meta WhatsApp Cloud API
// using an approved AUTHENTICATION template (e.g. login_code).
// Supabase generates AND verifies the code; this function only delivers it.
// Your React Native screens stay unchanged.
//
// Secrets (supabase secrets set ...):
//   SEND_SMS_HOOK_SECRET   the "v1,whsec_..." secret shown when you enable the hook
//   WA_PHONE_NUMBER_ID     Phone number ID of your WhatsApp number (not the number itself)
//   WA_ACCESS_TOKEN        permanent System User token
//   WA_TEMPLATE_NAME       approved authentication template, e.g. login_code
//   WA_TEMPLATE_LANG       exact language code of that template, e.g. ar
//
// Deploy with:  supabase functions deploy send-whatsapp-otp --no-verify-jwt

import { Webhook } from "npm:standardwebhooks@1.0.0";

const GRAPH_VERSION = "v21.0";
const META_TIMEOUT_MS = 4000; // Supabase gives hooks about 5s, so stay under it
const GENERIC_ERROR = "Could not send the verification code";

const fail = (httpCode: number, message: string) =>
  new Response(JSON.stringify({ error: { http_code: httpCode, message } }), {
    status: httpCode,
    headers: { "Content-Type": "application/json" },
  });

const ok = () =>
  new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  // 0. Config check: fail loudly instead of crashing
  const rawSecret = Deno.env.get("SEND_SMS_HOOK_SECRET");
  const phoneId = Deno.env.get("WA_PHONE_NUMBER_ID");
  const waToken = Deno.env.get("WA_ACCESS_TOKEN");
  const templateName = Deno.env.get("WA_TEMPLATE_NAME");
  const templateLang = Deno.env.get("WA_TEMPLATE_LANG");
  if (!rawSecret || !phoneId || !waToken || !templateName || !templateLang) {
    console.error("Missing env:", {
      SEND_SMS_HOOK_SECRET: !!rawSecret,
      WA_PHONE_NUMBER_ID: !!phoneId,
      WA_ACCESS_TOKEN: !!waToken,
      WA_TEMPLATE_NAME: !!templateName,
      WA_TEMPLATE_LANG: !!templateLang,
    });
    return fail(500, GENERIC_ERROR);
  }

  // 1. Only Supabase Auth may call this
  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);
  let user: { phone?: string };
  let sms: { otp?: string };
  try {
    ({ user, sms } = new Webhook(rawSecret.replace("v1,whsec_", "")).verify(payload, headers) as any);
  } catch {
    console.error("Invalid webhook signature (check SEND_SMS_HOOK_SECRET matches Auth > Hooks)");
    return new Response("invalid signature", { status: 401 });
  }

  const to = String(user?.phone ?? "").replace(/\D/g, ""); // digits only, no "+"
  const otp = String(sms?.otp ?? "");
  if (!to || !/^\d{4,8}$/.test(otp)) {
    console.error("Bad phone/otp from hook. otp length:", otp.length);
    return fail(500, GENERIC_ERROR);
  }

  // 2. Send the authentication template
  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`,
      {
        method: "POST",
        signal: AbortSignal.timeout(META_TIMEOUT_MS),
        headers: {
          Authorization: `Bearer ${waToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: {
            name: templateName,
            language: { code: templateLang },
            components: [
              // {{1}} in the template body
              { type: "body", parameters: [{ type: "text", text: otp }] },
              // the "copy code" button of authentication templates
              {
                type: "button",
                sub_type: "url",
                index: "0",
                parameters: [{ type: "text", text: otp }],
              },
            ],
          },
        }),
      },
    );

    if (!res.ok) {
      // HTTP status and Meta's error code only: never the phone number or the code
      const j = await res.json().catch(() => ({}));
      console.error("WhatsApp send failed:", res.status, j?.error?.code, j?.error?.error_subcode);
      const limited = res.status === 429 || j?.error?.code === 130429 || j?.error?.code === 131056;
      return limited ? fail(429, "Too many requests") : fail(500, GENERIC_ERROR);
    }

    return ok();
  } catch (e) {
    console.error("WhatsApp request failed:", (e as Error).message);
    return fail(500, GENERIC_ERROR);
  }
});
