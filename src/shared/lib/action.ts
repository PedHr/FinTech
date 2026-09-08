import { ZodError, type ZodType } from "zod";
import { logger } from "@/server/observability/logger";
import { publicError, requestId, type ActionResult } from "./result";

export function formObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export function parseForm<T>(schema: ZodType<T>, formData: FormData): T {
  return schema.parse(formObject(formData));
}

export async function safeAction<T>(work: () => Promise<T>): Promise<ActionResult<T>> {
  const id = requestId();
  try {
    return { ok: true, data: await work() };
  } catch (error) {
    if (error instanceof ZodError) {
      const flattened = error.flatten();
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Revise os campos destacados.",
          fieldErrors: flattened.fieldErrors as Record<string, string[]>,
          requestId: id,
        },
      };
    }
    logger.error({ err: error, requestId: id }, "Falha em Server Action");
    return { ok: false, error: publicError(error, id) };
  }
}
