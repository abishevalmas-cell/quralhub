import { maskPhone } from "@/lib/auth/phone";
import { isDemoPreview } from "@/lib/server/demo";

// Delivery of login codes. Production needs an SMS or WhatsApp gateway (e.g. Mobizon for KZ, Eskiz for UZ);
// until one is configured, codes are only logged on the server and shown on screen in development.
export async function deliverOtp(phone: string, code: string): Promise<{ channel: "console" | "sms"; devCode?: string }> {
  const gateway = process.env.SMS_GATEWAY_URL;
  if (gateway) {
    const response = await fetch(gateway, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.SMS_GATEWAY_TOKEN || ""}` },
      body: JSON.stringify({ to: "+" + phone, text: `Tetix: код для входа ${code}. Никому не сообщайте его.` }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("SMS gateway returned " + response.status);
    return { channel: "sms" };
  }
  console.info(`[tetix] login code for ${maskPhone(phone)}: ${code}`);
  return { channel: "console", devCode: showDevCodes() ? code : undefined };
}

export function showDevCodes() {
  return process.env.NODE_ENV !== "production" || process.env.AUTH_DEV_CODES === "1" || isDemoPreview();
}
