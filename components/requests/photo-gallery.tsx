"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { api } from "@/lib/client/api";
import { cn } from "@/lib/utils";

type Photo = { id: string; name: string; mime: string };

const MAX_PHOTOS = 10;
const MAX_BYTES = 10 * 1024 * 1024;

function Thumb({ photo }: { photo: Photo }) {
  const [broken, setBroken] = useState(photo.mime === "image/heic");
  const href = `/api/attachments/${photo.id}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="group relative block aspect-square overflow-hidden rounded-xl border border-line bg-soft"
      title={photo.name}
    >
      {broken ? (
        // Most browsers cannot show HEIC; the file still opens or downloads from the link.
        <span className="grid h-full place-content-center justify-items-center gap-1 p-2 text-center text-xs text-muted">
          <Icon name="camera" />
          <span className="line-clamp-2 break-all">{photo.name}</span>
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- private, auth-checked images are served by our API
        <img
          src={href}
          alt={photo.name}
          loading="lazy"
          className="h-full w-full object-cover transition group-hover:scale-[1.02]"
          onError={() => setBroken(true)}
        />
      )}
    </a>
  );
}

export function PhotoGallery({ requestId, photos, canUpload }: { requestId: string; photos: Photo[]; canUpload: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const left = MAX_PHOTOS - photos.length;

  async function upload(files: FileList | null) {
    const list = Array.from(files ?? []);
    if (!list.length) return;
    setError(null);
    const chosen = list.slice(0, Math.max(left, 0));
    const problems: string[] = [];
    if (list.length > chosen.length) problems.push(`Можно добавить ещё ${left} фото, остальные пропустили`);
    let done = 0;
    for (const file of chosen) {
      setProgress(chosen.length > 1 ? `Загружаем ${done + 1} из ${chosen.length}…` : "Загружаем…");
      if (file.size > MAX_BYTES) {
        problems.push(`${file.name}: больше 10 МБ`);
        continue;
      }
      const form = new FormData();
      form.append("file", file);
      try {
        await api(`/api/requests/${requestId}/attachments`, { body: form });
        done++;
      } catch (e) {
        problems.push(`${file.name}: ${(e as Error).message}`);
      }
    }
    setProgress(null);
    if (problems.length) setError(problems.join(". "));
    if (input.current) input.current.value = "";
    if (done) router.refresh();
  }

  return (
    <div className="grid gap-3">
      {photos.length ? (
        <ul className="grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <li key={p.id}>
              <Thumb photo={p} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Фото старой детали, номера на ней или места установки помогут найти точно ту же.</p>
      )}
      {canUpload && left > 0 ? (
        <div>
          <input
            ref={input}
            id={`photo-${requestId}`}
            type="file"
            accept="image/*"
            multiple
            className="peer sr-only"
            disabled={Boolean(progress)}
            onChange={(e) => upload(e.target.files)}
          />
          <label
            htmlFor={`photo-${requestId}`}
            className={cn(
              "inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-soft px-4 text-[15px] font-semibold text-ink transition hover:bg-line",
              "peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-lime-ink",
              progress && "pointer-events-none opacity-60",
            )}
          >
            <Icon name="camera" />
            {progress ?? (photos.length ? "Добавить ещё фото" : "Добавить фото")}
          </label>
          <p className="mt-1.5 text-xs text-muted">JPG, PNG, WebP или HEIC до 10 МБ. Можно добавить ещё {left}.</p>
        </div>
      ) : canUpload ? (
        <p className="text-sm text-muted">Добавлено {MAX_PHOTOS} фото — это максимум.</p>
      ) : null}
      <p className="text-sm text-bad" role="alert">
        {error}
      </p>
    </div>
  );
}
