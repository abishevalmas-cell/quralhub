import { requireActor } from "@/lib/auth/current";
import { getDb } from "@/lib/db";
import { AppError, badRequest } from "@/lib/server/errors";
import { json, route } from "@/lib/server/http";
import { addAttachment } from "@/lib/services/requests";

type Ctx = { params: Promise<{ id: string }> };

// A 10 MB photo plus multipart overhead. Bigger bodies are refused before anything is read.
const MAX_BODY_BYTES = 11 * 1024 * 1024;
const TOO_BIG = "Фото больше 10 МБ. Сожмите его или выберите другое";

export const POST = route(async (request, { params }: Ctx) => {
  const actor = await requireActor();
  const { id } = await params;
  const length = Number(request.headers.get("content-length"));
  // Browsers always send the length of a FormData body; without it the size cannot be checked up front.
  if (!request.headers.get("content-length") || !Number.isFinite(length) || length <= 0)
    throw new AppError(411, "Не удалось загрузить фото. Попробуйте ещё раз");
  if (length > MAX_BODY_BYTES) throw new AppError(413, TOO_BIG);
  if (!(request.headers.get("content-type") || "").toLowerCase().startsWith("multipart/form-data"))
    throw badRequest("Выберите фото");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw badRequest("Не удалось прочитать файл. Попробуйте ещё раз");
  }
  const file = form.get("file");
  if (!file || typeof file === "string") throw badRequest("Выберите фото");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const attachment = await addAttachment(await getDb(), actor, id, {
    bytes,
    name: file.name,
    declaredMime: file.type,
    size: file.size,
  });
  return json({ attachment }, 201);
});
