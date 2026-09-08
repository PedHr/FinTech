import { ArrowDownRight, ArrowUpRight, Banknote, Landmark, PiggyBank, TrendingUp, WalletCards } from "lucide-react";
import { dashboardData } from "@/server/finance/queries";
import { requirePageSession } from "@/server/auth/session";
import { formatBRL } from "@/shared/lib/money";
import { Card, EmptyState, PageHeader } from "@/shared/ui/card";
import { CategoryChart, InstitutionChart, NetWorthChart } from "@/features/dashboard/charts";

const metricIcons = [Landmark, WalletCards, PiggyBank, ArrowDownRight, ArrowUpRight, TrendingUp];

export default async function DashboardPage() {
  const session = await requirePageSession();
  const data = await dashboardData({ userId: session.user.id });
  const metrics = [
    ["Patrimônio total", data.summary.netWorth.amount], ["Saldo disponível", data.summary.available.amount],
    ["Investimentos", data.summary.investments.amount], ["Gastos no mês", data.summary.expenses.amount],
    ["Receitas no mês", data.summary.income.amount], ["Rendimento no mês", data.summary.returns.amount],
  ] as const;
  const month = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date());
  return <div className="space-y-7">
    <PageHeader title={`Olá, ${session.user.name.split(" ")[0]}`} description={`Visão consolidada · ${month}`} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{metrics.map(([label, value], index) => { const Icon = metricIcons[index] ?? Banknote; return <Card key={label} className="relative overflow-hidden"><div className="flex items-start justify-between"><p className="muted text-xs font-semibold uppercase tracking-wider">{label}</p><span className="grid size-9 place-items-center rounded-xl bg-[var(--accent)] text-[var(--primary)]"><Icon className="size-4" /></span></div><p className="tabular mt-5 text-2xl font-bold">{formatBRL(value)}</p></Card>; })}</div>
    <Card><div><h2 className="font-semibold">Evolução patrimonial</h2><p className="muted text-sm">Últimos seis meses</p></div><NetWorthChart data={data.history} /></Card>
    <div className="grid gap-6 xl:grid-cols-2"><Card><h2 className="font-semibold">Gastos por categoria</h2><CategoryChart data={data.categoryData} /></Card><Card><h2 className="font-semibold">Saldo por instituição</h2><InstitutionChart data={data.institutionData} /></Card></div>
    <Card><h2 className="font-semibold">Transações recentes</h2><div className="mt-4 divide-y">{data.recent.length ? data.recent.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.description}</p><p className="muted truncate text-xs">{item.category} · {item.institution} · {item.account}</p></div><p className={`tabular shrink-0 font-semibold ${item.direction === "CREDIT" ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--foreground)]"}`}>{item.direction === "CREDIT" ? "+ " : "− "}{formatBRL(item.amount.amount)}</p></div>) : <EmptyState title="Seu histórico começa aqui" description="Adicione uma receita ou despesa para acompanhar sua evolução." />}</div></Card>
  </div>;
}
