import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/database/client";

export type TenantContext = Readonly<{ userId: string }>;

type TenantWork<T> = (tx: Prisma.TransactionClient) => Promise<T>;

export async function withTenant<T>(
  context: TenantContext,
  work: TenantWork<T>,
  isolationLevel: Prisma.TransactionIsolationLevel = "ReadCommitted",
) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_user_id', ${context.userId}, true)`;
      return work(tx);
    },
    { isolationLevel },
  );
}
