import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  BETTER_AUTH_SECRET: z.string().min(32),
  DATABASE_URL: z.string().min(1),
  STORAGE_DRIVER: z.enum(["local", "vercel-blob"]).default("local"),
  LOCAL_STORAGE_PATH: z.string().default(".data/uploads"),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  EMAIL_DRIVER: z.enum(["smtp", "resend", "console"]).default("console"),
  EMAIL_FROM: z.string().default("FinControl <no-reply@finance.local>"),
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  CRON_SECRET: z.string().min(16).optional(),
});

let cached: z.infer<typeof schema> | undefined;

export function env() {
  if (cached) return cached;

  const isProductionBuild =
    process.env.FINCONTROL_BUILD === "1" || process.env.NEXT_PHASE === "phase-production-build";
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  const inferredAppUrl = process.env.APP_URL || (vercelHost ? `https://${vercelHost}` : undefined);
  const result = schema.safeParse({
    ...process.env,
    APP_URL: inferredAppUrl,
    ...(isProductionBuild
      ? {
          APP_URL: vercelHost ? `https://${vercelHost}` : "http://localhost:3000",
          BETTER_AUTH_SECRET: "build-only-secret-never-used-at-runtime",
          DATABASE_URL: "postgresql://build:build@127.0.0.1:5432/build",
          STORAGE_DRIVER: "vercel-blob",
          BLOB_READ_WRITE_TOKEN: "build-only-blob-token",
          EMAIL_DRIVER: "resend",
          RESEND_API_KEY: "build-only-resend-key",
          SMTP_PORT: 1025,
          CRON_SECRET: "build-only-cron-secret",
        }
      : {}),
  });
  if (!result.success) {
    const keys = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Configuração inválida. Revise: ${keys}`);
  }

  if (result.data.NODE_ENV === "production" && !isProductionBuild) {
    if (result.data.STORAGE_DRIVER !== "vercel-blob" || !result.data.BLOB_READ_WRITE_TOKEN) {
      throw new Error("Produção exige Vercel Blob privado configurado.");
    }
  }

  cached = result.data;
  return result.data;
}
