import { AppError } from "@/shared/lib/result";

export function validateRequestOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host");
  if (!host) throw new AppError("FORBIDDEN", "Origem da requisição inválida.", 403);
  try {
    if (new URL(origin).host !== host) throw new Error("host mismatch");
  } catch {
    throw new AppError("FORBIDDEN", "Origem da requisição inválida.", 403);
  }
}
