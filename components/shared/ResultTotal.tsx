export function ResultTotal({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between pt-4 mt-2 border-t-2 border-primary text-lg font-extrabold">
      <span>{label}</span>
      <span className="text-primary">{value}</span>
    </div>
  )
}
