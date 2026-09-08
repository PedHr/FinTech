export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "DUPLICATE_FILE"
  | "INVALID_PDF"
  | "UNSUPPORTED_PDF"
  | "IMPORT_FAILED"
  | "INTERNAL_ERROR";

export type ActionError = {
  code: ErrorCode;
  message: string;
  requestId: string;
  fieldErrors?: Record<string, string[]>;
};

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ActionError };

export function requestId() {
  return crypto.randomUUID();
}

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function publicError(error: unknown, id = requestId()): ActionError {
  if (error instanceof AppError) {
    return { code: error.code, message: error.message, requestId: id };
  }
  return {
    code: "INTERNAL_ERROR",
    message: "Não foi possível concluir esta operação. Tente novamente.",
    requestId: id,
  };
}
