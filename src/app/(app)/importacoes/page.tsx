import Link from "next/link";
import { FilePlus2 } from "lucide-react";
import { requirePageSession } from "@/server/auth/session";
import { importList } from "@/server/imports/queries";
import { Card, EmptyState, PageHeader } from "@/shared/ui/card";

const labels: Record<string, string> = { QUEUED: "Na fila", EXTRACTING: "Extraindo", OCR: "OCR", PARSING: "Interpretando", REVIEW_READY: "Revisar", COMPLETED: "Concluída", DUPLICATE_FILE: "Arquivo duplicado", FAILED: "Falhou", CANCELLED: "Cancelada" };

export default async function ImportsPage() {
  const session = await requirePageSession(); const imports = await importList({ userId: session.user.id });
  const action = <Link href="/importacoes/nova" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white"><FilePlus2 className="size-4" />Importar fatura</Link>;
  return <div className="space-y-7"><PageHeader title="Importações" description="Histórico de documentos processados sem expor seus PDFs." action={action} /><Card>{imports.length ? <div className="divide-y">{imports.map((item) => <Link key={item.id} href={`/importacoes/${item.id}/revisao`} className="flex items-center justify-between gap-4 py-4"><div><p className="font-semibold">{item.displayName}</p><p className="muted text-xs">{item.creditCard.account.name} · {item.createdAt.toLocaleString("pt-BR")}</p></div><span className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-[var(--primary)]">{labels[item.status] ?? item.status}</span></Link>)}</div> : <EmptyState title="Nenhuma fatura importada" description="Envie um PDF para extrair, revisar e confirmar os lançamentos." />}</Card></div>;
}
