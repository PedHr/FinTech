import { requireSession } from "@/server/auth/session";
import { withTenant } from "@/server/database/tenant";

export async function GET(request: Request) {
  const session = await requireSession();
  const pathname = new URL(request.url).searchParams.get("pathname");
  if (!pathname) return Response.json({ error: { message: "Caminho ausente." } }, { status: 400 });
  const item = await withTenant({ userId: session.user.id }, (tx) => tx.importedFile.findFirst({ where: { userId: session.user.id, storageKey: pathname }, select: { id: true, status: true } }));
  return item ? Response.json(item) : Response.json({ error: { message: "Importação ainda não registrada." } }, { status: 404 });
}
