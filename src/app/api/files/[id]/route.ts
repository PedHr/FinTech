import { requireSession } from "@/server/auth/session";
import { withTenant } from "@/server/database/tenant";
import { storageProvider } from "@/server/storage/provider";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(); const { id } = await params;
  const file = await withTenant({ userId: session.user.id }, (tx) => tx.importedFile.findFirst({ where: { id, userId: session.user.id, storageDeletedAt: null } }));
  if (!file) return Response.json({ error: { message: "Documento não encontrado." } }, { status: 404 });
  const bytes = await storageProvider().get(file.storageKey);
  return new Response(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${file.displayName}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
