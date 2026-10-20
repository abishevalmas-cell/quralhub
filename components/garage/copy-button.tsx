"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";

async function writeClipboard(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    // Older WebViews (messenger in-app browsers) have no async clipboard API.
    const area = document.createElement("textarea");
    area.value = value;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setState("idle"), 1600);
    return () => clearTimeout(timer);
  }, [state]);

  return (
    <button
      type="button"
      onClick={async () => setState((await writeClipboard(value)) ? "copied" : "failed")}
      aria-label={label}
      title={label}
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-soft hover:text-ink"
    >
      <Icon name={state === "copied" ? "check" : "copy"} className="size-4" />
      <span className="sr-only" role="status">
        {state === "copied" ? "Скопировано" : state === "failed" ? "Не удалось скопировать" : ""}
      </span>
    </button>
  );
}
