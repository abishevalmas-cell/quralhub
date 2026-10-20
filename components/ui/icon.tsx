import { cn } from "@/lib/utils";

const paths = {
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
  car: <path d="m4 10 2-6h12l2 6M3 10h18v9H3zM6 14h2m8 0h2M5 19v2m14-2v2" />,
  camera: <><path d="M3 7h4l2-3h6l2 3h4v14H3z" /><circle cx="12" cy="13" r="4" /></>,
  box: <path d="m12 2 10 5v10l-10 5-10-5V7zm0 10v10M2 7l10 5 10-5" />,
  chat: <path d="M3 3h18v14H9l-6 4zM7 8h10M7 12h6" />,
  queue: <path d="M4 5h16M4 10h16M4 15h10M4 20h7" />,
  settings: <><path d="M3 6h18M3 12h18M3 18h18" /><circle cx="8" cy="6" r="2" /><circle cx="16" cy="12" r="2" /><circle cx="10" cy="18" r="2" /></>,
  plus: <path d="M12 4v16M4 12h16" />,
  check: <path d="m5 12 4 4L19 6" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V4H4v12h4" /></>,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  spark: <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z" />,
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn("size-5 shrink-0 fill-none stroke-current", className)}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}
