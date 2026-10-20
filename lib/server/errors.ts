// Errors carry a user-facing Russian message and an HTTP status.
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, code?: string) => new AppError(400, message, code);
export const unauthorized = (message = "Войдите по номеру телефона") => new AppError(401, message, "unauthorized");
export const forbidden = (message = "Нет доступа") => new AppError(403, message, "forbidden");
export const notFound = (message = "Не найдено") => new AppError(404, message, "not_found");
export const conflict = (message: string) => new AppError(409, message, "conflict");
export const tooMany = (message: string) => new AppError(429, message, "rate_limited");
