import { groupThousands } from "@/lib/pricing";
import { ASTANA_OFFSET_MS } from "@/lib/utils";

const MONTHS = ["янв.", "февр.", "мар.", "апр.", "мая", "июн.", "июл.", "авг.", "сент.", "окт.", "нояб.", "дек."];
const pad = (n: number) => String(n).padStart(2, "0");

// Journal times in Astana time (UTC+5) whatever the server's time zone: "20 окт., 13:05:42".
export function astanaDateTime(value: Date | string): string {
  const d = new Date(new Date(value).getTime() + ASTANA_OFFSET_MS);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

export const formatCount = (n: number) => groupThousands(n);
