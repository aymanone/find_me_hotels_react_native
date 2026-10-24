// supabase/functions/send-akedly-otp/index.ts
//
// Supabase "Send SMS" auth hook -> delivers the OTP through Akedly (V1.2 REST API).
// Supabase generates AND verifies the code; Akedly only delivers it ("bring your own OTP").
//
// Secrets (supabase secrets set ...):
//   SEND_SMS_HOOK_SECRET   the "v1,whsec_..." secret shown when you enable the hook
//   AKEDLY_API_KEY         Account & Billing > API Keys
//   AKEDLY_PIPELINE_ID     pipeline "Basic Details" (pipeline must be on API Version V1.2)
//   AKEDLY_OTP_LANGUAGE    optional: "ar" or "en"
//
// Deploy with:  supabase functions deploy send-akedly-otp --no-verify-jwt
//
// Changes vs the previous version:
//  - missing secrets fail fast with a clear log instead of crashing on .replace
//  - every Akedly call has a deadline and logs how long it took
//  - Supabase's hook limit is a hard 5s, so if Akedly is slow we answer 200
//    after ~3.8s and let the delivery finish in the background

import { Webhook } from "npm:standardwebhooks@1.0.0";
import { createHash } from "node:crypto";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

const BASE = "https://api.akedly.io/api/v1.2/transactions";
const POW_BUDGET_MS = 1000; // PoW blocks the event loop, keep it small
const RESPOND_WITHIN_MS = 3800; // must answer Supabase before its 5s hard limit
const AKEDLY_TIMEOUT_MS = 25000; // upper bound for the background continuation
const GENERIC_ERROR = "Could not send the verification code";

type Result = { ok: true } | { ok: false; httpCode: number; message: string };

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

// SHA256(challenge + ":" + nonce) must start with `difficulty` hex zeros
function solvePow(challenge: string, difficulty: number): number | null {
  const prefix = "0".repeat(difficulty);
  const start = Date.now();
  for (let nonce = 0; ; nonce++) {
    const h = createHash("sha256").update(`${challenge}:${nonce}`).digest("hex");
    if (h.startsWith(prefix)) return nonce;
    if (nonce % 2000 === 0 && Date.now() - start > POW_BUDGET_MS) return null;
  }
}

// Whole Akedly flow. Never throws: always resolves to a Result.
async function sendViaAkedly(
  apiKey: string,
  pipelineID: string,
  phoneNumber: string,
  otp: string,
): Promise<Result> {
  const t0 = Date.now();
  const lap = (label: string) => console.log(`[akedly] ${label} +${Date.now() - t0}ms`);
  const signal = AbortSignal.timeout(AKEDLY_TIMEOUT_MS);
  const bad = (httpCode = 500, message = GENERIC_ERROR): Result => ({ ok: false, httpCode, message });

  try {
    // 1. Fresh challenge (never cache: it expires in ~90 s)
    const cRes = await fetch(
      `${BASE}/challenge?APIKey=${encodeURIComponent(apiKey)}&pipelineID=${encodeURIComponent(pipelineID)}`,
      { signal },
    );
    const cJson = await cRes.json().catch(() => ({}));
    lap("challenge response");
    if (!cRes.ok || cJson?.status !== "success") {
      console.error("Akedly challenge failed:", cRes.status, cJson?.code);
      return bad();
    }
    const ch = cJson.data;

    // Turnstile needs a real browser; a server cannot produce that token
    if (ch.turnstile?.required) {
      console.error("Pipeline has Turnstile enabled: turn it off for server-side sends");
      return bad();
    }

    // 2. Proof-of-work only when the server asks for it
    let powSolution: { challengeToken: string; nonce: number } | undefined;
    if (ch.challengeRequired) {
      const nonce = solvePow(ch.challenge, ch.difficulty);
      lap(`pow done (difficulty ${ch.difficulty})`);
      if (nonce === null) {
        console.error("PoW too slow at difficulty", ch.difficulty);
        return bad();
      }
      powSolution = { challengeToken: ch.challengeToken, nonce };
    }

    // 3. Send: Supabase's own code, delivered by Akedly
    const lang = Deno.env.get("AKEDLY_OTP_LANGUAGE");
    const sRes = await fetch(`${BASE}/send`, {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        APIKey: apiKey,
        pipelineID,
        verificationAddress: { phoneNumber },
        ...(powSolution ? { powSolution } : {}),
        otp,
        digits: otp.length,
        ...(lang ? { otpLanguage: lang } : {}),
      }),
    });
    const sJson = await sRes.json().catch(() => ({}));
    lap("send response");

    if (!sRes.ok || sJson?.status !== "success") {
      // status and error code only: never the phone number or the code
      console.error("Akedly send failed:", sRes.status, sJson?.code);
      return sRes.status === 429 ? bad(429, "Too many requests") : bad();
    }
    return { ok: true };
  } catch (e) {
    console.error("Akedly request failed:", (e as Error).message);
    return bad();
  }
}

Deno.serve(async (req) => {
  // 0. Config check: fail loudly instead of crashing
  const rawSecret = Deno.env.get("SEND_SMS_HOOK_SECRET");
  const apiKey = Deno.env.get("AKEDLY_API_KEY");
  const pipelineID = Deno.env.get("AKEDLY_PIPELINE_ID");
  if (!rawSecret || !apiKey || !pipelineID) {
    console.error("Missing env:", {
      SEND_SMS_HOOK_SECRET: !!rawSecret,
      AKEDLY_API_KEY: !!apiKey,
      AKEDLY_PIPELINE_ID: !!pipelineID,
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

  const phoneNumber = "+" + String(user?.phone ?? "").replace(/\D/g, "");
  const otp = String(sms?.otp ?? "");

  // Akedly accepts 4, 5 or 6 digit custom codes only
  if (!/^\d{4,6}$/.test(otp) || phoneNumber === "+") {
    console.error("Bad phone/otp from hook. otp length:", otp.length);
    return fail(500, GENERIC_ERROR);
  }

  // 2. Race the Akedly flow against Supabase's 5s limit
  const work = sendViaAkedly(apiKey, pipelineID, phoneNumber, otp);
  let timer: number | undefined;
  const slow = new Promise<"slow">((resolve) => {
    timer = setTimeout(() => resolve("slow"), RESPOND_WITHIN_MS);
  });
  const result = await Promise.race([work, slow]);
  clearTimeout(timer);

  if (result === "slow") {
    console.warn(`Akedly not done after ${RESPOND_WITHIN_MS}ms: replying 200, finishing in background`);
    EdgeRuntime.waitUntil(
      work.then((r) => {
        if (r.ok) console.log("[akedly] background send succeeded");
        else console.error("[akedly] background send FAILED", r.httpCode);
      }),
    );
    return ok();
  }

  return result.ok ? ok() : fail(result.httpCode, result.message);
});
