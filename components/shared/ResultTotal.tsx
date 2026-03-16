export function ResultTotal({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between pt-4 mt-2 border-t-2 border-primary text-base sm:text-lg font-extrabold gap-2">
      <span className="min-w-0 shrink">{label}</span>
      <span className="text-primary whitespace-nowrap shrink-0">{value}</span>
    </div>
  )
}
