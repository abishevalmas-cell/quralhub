import { Icon } from "@/components/ui/icon";

type Photo = { id: string; name: string; mime: string };

// Photos are served by the auth-checked attachment route; HEIC does not render in most browsers, so it is a link.
export function StaffPhotos({ photos }: { photos: Photo[] }) {
  if (!photos.length) return <p className="text-sm text-muted">Клиент не прикрепил фото. Если нужно, попросите в переписке.</p>;
  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {photos.map((photo) => {
        const href = `/api/attachments/${photo.id}`;
        return (
          <li key={photo.id}>
            <a
              href={href}
              target="_blank"
              rel="noopener"
              title={photo.name}
              className="group relative block aspect-square overflow-hidden rounded-xl border border-line bg-soft"
            >
              {photo.mime === "image/heic" ? (
                <span className="grid h-full place-content-center justify-items-center gap-1 p-2 text-center text-xs text-muted">
                  <Icon name="camera" />
                  <span className="line-clamp-2 break-all">{photo.name}</span>
                </span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- private, auth-checked images are served by our API
                <img src={href} alt={photo.name} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
              )}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
