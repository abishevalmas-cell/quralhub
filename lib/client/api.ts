// Small fetch wrapper for client components: JSON in, JSON out, Russian error message on failure.
export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const response = await fetch(path, {
    method: init.method || (init.body === undefined ? "GET" : "POST"),
    headers: init.body === undefined || init.body instanceof FormData ? undefined : { "content-type": "application/json" },
    body: init.body === undefined ? undefined : init.body instanceof FormData ? init.body : JSON.stringify(init.body),
    credentials: "same-origin",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, data.error || "Сервис временно недоступен. Попробуйте ещё раз", data.code);
  return data as T;
}
