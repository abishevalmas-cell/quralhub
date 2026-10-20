import { requireActor } from "@/lib/auth/current";
import { getDb } from "@/lib/db";
import { route } from "@/lib/server/http";
import { getAttachmentFile } from "@/lib/services/requests";

type Ctx = { params: Promise<{ id: string }> };

// The stored name already passed safeFileName(); the ASCII fallback is for old clients that ignore filename*.
function contentDisposition(name: string, inline: boolean) {
  const ascii = name.replace(/[^\x20-\x7e]/g, "_").replace(/["\;%]/g, "_").trim() || "photo";
  return `${inline ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

export const GET = route(async (_request, { params }: Ctx) => {
  const actor = await requireActor();
  const { id } = await params;
  const file = await getAttachmentFile(await getDb(), actor, id);
  const inline = file.mime.startsWith("image/");
  return new Response(new Uint8Array(file.bytes), {
    status: 200,
    headers: {
      "content-type": file.mime,
      "content-length": String(file.bytes.byteLength),
      "content-disposition": contentDisposition(file.name, inline),
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; sandbox",
      "cross-origin-resource-policy": "same-origin",
    },
  });
});
