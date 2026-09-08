import { createHash } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/database/client";

type RateLimitRow = { count: number; expiresAt: Date };

function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export async function consumeRateLimit(key: string, max: number, seconds: number) {
  const keyHash = hashKey(key);
  const rows = await prisma.$queryRaw<RateLimitRow[]>(Prisma.sql`
    INSERT INTO "security_rate_limits" ("keyHash", "count", "expiresAt", "updatedAt")
    VALUES (${keyHash}, 1, CURRENT_TIMESTAMP + (${seconds} * INTERVAL '1 second'), CURRENT_TIMESTAMP)
    ON CONFLICT ("keyHash") DO UPDATE SET
      "count" = CASE
        WHEN "security_rate_limits"."expiresAt" <= CURRENT_TIMESTAMP THEN 1
        ELSE "security_rate_limits"."count" + 1
      END,
      "expiresAt" = CASE
        WHEN "security_rate_limits"."expiresAt" <= CURRENT_TIMESTAMP
          THEN CURRENT_TIMESTAMP + (${seconds} * INTERVAL '1 second')
        ELSE "security_rate_limits"."expiresAt"
      END,
      "updatedAt" = CURRENT_TIMESTAMP
    RETURNING "count", "expiresAt"
  `);
  const row = rows[0];
  if (!row) throw new Error("Não foi possível aplicar o limite de requisições.");
  return {
    allowed: row.count <= max,
    retryAfter: row.count <= max ? null : Math.max(1, Math.ceil((row.expiresAt.getTime() - Date.now()) / 1000)),
    count: row.count,
  };
}

export async function rateLimit(key: string, max: number, seconds: number) {
  const result = await consumeRateLimit(key, max, seconds);
  return {
    success: result.allowed,
    limit: max,
    remaining: result.allowed ? Math.max(0, max - result.count) : 0,
    reset: Date.now() + (result.retryAfter ?? seconds) * 1000,
    pending: Promise.resolve(),
  };
}
