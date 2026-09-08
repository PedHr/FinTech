import { prisma } from "@/server/database/client";
import { withTenant } from "@/server/database/tenant";
import { storageProvider } from "@/server/storage/provider";
import { logger } from "@/server/observability/logger";

export async function purgeExpiredImports(now = new Date()) {
  await prisma.rateLimitBucket.deleteMany({ where: { expiresAt: { lt: now } } });
  const users = await prisma.user.findMany({ select: { id: true }, take: 10_000 });
  let deleted = 0;
  let failed = 0;

  for (const user of users) {
    const files = await withTenant({ userId: user.id }, (tx) => tx.importedFile.findMany({
      where: { userId: user.id, expiresAt: { lte: now }, storageDeletedAt: null },
      select: { id: true, storageKey: true, status: true },
      take: 100,
    }));
    for (const file of files) {
      try {
        await storageProvider().delete(file.storageKey);
        await withTenant({ userId: user.id }, (tx) => tx.importedFile.update({
          where: { id: file.id },
          data: {
            storageDeletedAt: now,
            ...(file.status === "COMPLETED" || file.status === "DUPLICATE_FILE" ? {} : { status: "CANCELLED" as const }),
          },
        }));
        deleted += 1;
      } catch (error) {
        failed += 1;
        logger.error({ err: error, importId: file.id, userId: user.id }, "Falha ao remover PDF expirado");
      }
    }
  }
  return { deleted, failed };
}
