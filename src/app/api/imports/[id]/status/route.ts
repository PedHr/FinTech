import { requireSession } from "@/server/auth/session";
import { withTenant } from "@/server/database/tenant";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(); const { id } = await params;
  const item = await withTenant({ userId: session.user.id }, (tx) => tx.importedFile.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, status: true, itemCount: true, selectedCount: true, errorCode: true, errorMessage: true },
  }));
  return item ? Response.json(item) : Response.json({ error: { message: "Importação não encontrada." } }, { status: 404 });
}
