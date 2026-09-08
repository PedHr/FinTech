import { requireSession } from "@/server/auth/session";
import { withTenant } from "@/server/database/tenant";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function csv(value: string) {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const session = await requireSession();
  const url = new URL(request.url);
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");
  const rows = await withTenant({ userId: session.user.id }, (tx) => tx.transaction.findMany({
    where: {
      userId: session.user.id,
      status: { not: "VOIDED" },
      ...(dateFrom && datePattern.test(dateFrom) || dateTo && datePattern.test(dateTo) ? { transactionDate: {
        ...(dateFrom && datePattern.test(dateFrom) ? { gte: new Date(`${dateFrom}T00:00:00.000Z`) } : {}),
        ...(dateTo && datePattern.test(dateTo) ? { lte: new Date(`${dateTo}T00:00:00.000Z`) } : {}),
      } } : {}),
    },
    include: { account: { include: { institution: true } }, category: true, tags: { include: { tag: true } } },
    orderBy: { transactionDate: "desc" },
    take: 10_000,
  }));
  const lines = [
    "data,descricao,tipo,direcao,valor,moeda,categoria,instituicao,conta,origem,tags",
    ...rows.map((item) => [
      item.transactionDate.toISOString().slice(0, 10), item.description, item.kind, item.direction,
      item.amount.toFixed(2), item.currency, item.category?.name ?? "", item.account.institution?.name ?? "",
      item.account.name, item.source, item.tags.map(({ tag }) => tag.name).join(";"),
    ].map((value) => csv(String(value))).join(",")),
  ];
  return new Response(`\uFEFF${lines.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fincontrol-transacoes-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
