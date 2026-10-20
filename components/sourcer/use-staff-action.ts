"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { ApiError } from "@/lib/client/api";

export type ActionFailure = { message: string; conflict: boolean; code?: string };

// Runs one API call at a time and refreshes the page on success. A 409 means someone else changed the request:
// the caller shows the message with a refresh button instead of retrying with a stale version.
export function useStaffAction() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<ActionFailure | null>(null);

  const run = useCallback(
    async (key: string, task: () => Promise<unknown>, after?: () => void): Promise<boolean> => {
      setBusy(key);
      setError(null);
      try {
        await task();
        if (after) after();
        else router.refresh();
        return true;
      } catch (e) {
        const api = e instanceof ApiError ? e : null;
        setError({ message: (e as Error).message, conflict: api?.status === 409, code: api?.code });
        return false;
      } finally {
        setBusy(null);
      }
    },
    [router],
  );

  const refresh = useCallback(() => {
    setError(null);
    router.refresh();
  }, [router]);

  return { busy, error, setError, run, refresh };
}
