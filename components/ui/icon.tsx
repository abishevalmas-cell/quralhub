import { cn } from "@/lib/utils";

// 24×24 line icons drawn with the current text colour. Decorative: the control around an icon carries the label.
const paths = {
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
  car: <path d="m4 10 2-6h12l2 6M3 10h18v9H3zM6 14h2m8 0h2M5 19v2m14-2v2" />,
  camera: <><path d="M4 8h3l1.6-2.5h6.8L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13.5" r="3.5" /></>,
  box: <path d="m12 2 10 5v10l-10 5-10-5V7zm0 10v10M2 7l10 5 10-5M7 4.5l10 5V14" />,
  chat: <path d="M3 3h18v14H9l-6 4zM7 8h10M7 12h6" />,
  queue: <path d="M4 5h16M4 10h16M4 15h10M4 20h7" />,
  settings: <><path d="M3 6h3m4 0h11M3 12h11m4 0h3M3 18h5m4 0h9" /><circle cx="8" cy="6" r="2" /><circle cx="16" cy="12" r="2" /><circle cx="10" cy="18" r="2" /></>,
  sliders: <><path d="M3 6h4m4 0h10M3 12h10m4 0h4M3 18h6m4 0h8" /><circle cx="9" cy="6" r="2" /><circle cx="15" cy="12" r="2" /><circle cx="11" cy="18" r="2" /></>,
  plus: <path d="M12 4v16M4 12h16" />,
  minus: <path d="M5 12h14" />,
  check: <path d="m5 12 4 4L19 6" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V4H4v12h4" /></>,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  chevron: <path d="m9 6 6 6-6 6" />,
  "chevron-left": <path d="m15 6-6 6 6 6" />,
  "chevron-down": <path d="m6 9 6 6 6-6" />,
  spark: <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5zm7-1v5m-2.5-2.5h5" />,
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  scan: <path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5M7 8v8m3-8v8m4-8v8m3-8v8" />,
  clipboard: <><rect x="8.5" y="2.5" width="7" height="4" rx="1" /><path d="M8.5 4.5H6a1 1 0 0 0-1 1V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V5.5a1 1 0 0 0-1-1h-2.5M8.5 11.5h7m-7 4h4.5" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  pin: <><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.5h.01" /></>,
  external: <path d="M14 4h6v6m0-6-9 9m7 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
  wrench: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z" />,
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  droplet: <path d="M12 2.7S6 9.3 6 14a6 6 0 0 0 12 0c0-4.7-6-11.3-6-11.3Z" />,
  wind: <path d="M9.6 4.6A2 2 0 1 1 11 8H2m10.6 11.4A2 2 0 1 0 14 16H2m15.7-8.3A2.5 2.5 0 1 1 19.5 12H2" />,
  thermo: <><path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0Z" /><path d="M12 11v6" /></>,
  seat: <path d="M7.6 3h3.1a1.5 1.5 0 0 1 1.5 1.7l-1 7.3H17a2 2 0 0 1 2 2v1.5a1.5 1.5 0 0 1-1.5 1.5H9.1a2 2 0 0 1-2-1.8L6.1 4.7A1.5 1.5 0 0 1 7.6 3ZM10 17v4m7-4v4M8.5 21h10" />,
  battery: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M6.5 7V4.5h3V7m5 0V4.5h3V7M6.5 13.5h3.5m4 0h3.5M15.75 11.75v3.5" /></>,
  light: <path d="M11 5h1.5a7 7 0 0 1 0 14H11zM3 8h5M3 12h5M3 16h5" />,
  shield: <><path d="M12 3 4.5 6v5.5c0 4.5 3.2 8.2 7.5 9.5 4.3-1.3 7.5-5 7.5-9.5V6z" /><path d="m9 12 2 2 4-4" /></>,
  engine: <path d="M7 8h3V6h5v2h2l2 2.5h2v5h-2l-2 2.5H9.5L7 15H5v2H3V9h2v2h2zM10 4h5" />,
  disc: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="2.5" /><path d="M15.5 3.7a9 9 0 0 1 4.8 4.8" /></>,
  gearbox: <><path d="M6 6.5v11M12 6.5v11M18 6.5V12H6" /><circle cx="6" cy="4.5" r="2" /><circle cx="12" cy="4.5" r="2" /><circle cx="18" cy="4.5" r="2" /><circle cx="6" cy="19.5" r="2" /><circle cx="12" cy="19.5" r="2" /></>,
  wheel: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /><path d="M12 9V3m0 18v-6m-3-3H3m18 0h-6" /></>,
  filter: <path d="M3 4h18l-7 8.5V19l-4 2v-8.5z" />,
  door: <path d="M5 20V9l5-5h8a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1ZM5 11h14m-5 3h2" />,
  key: <><circle cx="7.5" cy="15.5" r="4.5" /><path d="m10.7 12.3 9.3-9.3m-3.5 3.5 2.5 2.5M14 9l2 2" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.2 2" /></>,
  truck: <><path d="M2.5 5.5h11v10h-11zm11 3.5h4.3l3.7 3.6v2.9h-8" /><circle cx="6.5" cy="17.5" r="2" /><circle cx="17" cy="17.5" r="2" /></>,
  card: <><rect x="2.5" y="5" width="19" height="14" rx="2" /><path d="M2.5 9.5h19M6 15h4" /></>,
} as const;

export type IconName = keyof typeof paths;
export const ICON_NAMES = Object.keys(paths) as IconName[];

export function Icon({ name, className, strokeWidth = 1.7 }: { name: IconName; className?: string; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={cn("size-5 shrink-0 fill-none stroke-current", className)}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}
