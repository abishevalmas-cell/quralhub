"use client";

import type { ActionFailure } from "./use-staff-action";

export function ActionError({ error, onRefresh }: { error: ActionFailure | null; onRefresh: () => void }) {
  if (!error) return null;
  return (
    <p role="alert" className="text-sm text-bad">
      {error.message}
      {error.conflict ? (
        <>
          {" "}
          <button type="button" onClick={onRefresh} className="font-semibold text-ink underline">
            Обновить
          </button>
        </>
      ) : null}
    </p>
  );
}
