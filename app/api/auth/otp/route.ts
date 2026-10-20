import { z } from "zod";
import { requestOtp } from "@/lib/auth/otp";
import { getDb } from "@/lib/db";
import { deliverOtp } from "@/lib/notify/otp";
import { json, readJson, route } from "@/lib/server/http";
import { assertRate, RATE_RULES } from "@/lib/server/rate-limit";

const Body = z.object({ phone: z.string().max(40) });

export const POST = route(async (request) => {
  assertRate(request, [RATE_RULES.otpShort, RATE_RULES.otpDay]);
  const { phone } = await readJson(request, Body);
  const { phone: normalized, code } = await requestOtp(await getDb(), phone);
  const delivery = await deliverOtp(normalized, code);
  return json({ ok: true, phone: normalized, channel: delivery.channel, devCode: delivery.devCode });
});
