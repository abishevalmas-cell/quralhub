// Shown while a garage page waits for the server: with live 17VIN a catalog page can take a few seconds.
export function LoadingState({ text }: { text: string }) {
  return (
    <div className="grid max-w-5xl gap-5" aria-busy="true">
      <p role="status" className="flex items-center gap-2 text-sm font-semibold text-muted">
        <span className="inline-block size-4 animate-spin rounded-full border-2 border-line border-t-ink" aria-hidden="true" />
        {text}
      </p>
      <div className="h-9 w-2/3 animate-pulse rounded-xl bg-soft" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-[18px] border border-line bg-card" />
        ))}
      </div>
    </div>
  );
}
