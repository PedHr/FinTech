-- Distributed rate limiting without an additional hosted service.
-- Keys are SHA-256 hashes so raw IP/e-mail combinations are not persisted.
CREATE TABLE "security_rate_limits" (
  "keyHash" CHAR(64) NOT NULL,
  "count" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "security_rate_limits_pkey" PRIMARY KEY ("keyHash")
);

CREATE INDEX "security_rate_limits_expiresAt_idx" ON "security_rate_limits"("expiresAt");
