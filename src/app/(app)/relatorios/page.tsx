import { formatISO, startOfYear, subDays, subMonths } from "date-fns";
import { requirePageSession } from "@/server/auth/session";
import { reportData } from "@/server/finance/reports";
import { formatBRL } from "@/shared/lib/money";
import { CashFlowChart, CategoryChart, InstitutionChart } from "@/features/dashboard/charts";
import { Card, PageHeader } from "@/shared/ui/card";
import { Input, Select } from "@/shared/ui/form-controls";

type Params = { period?: string; dateFrom?: string; dateTo?: string };
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function range(params: Params) {
  const now = new Date();
  const to = params.period === "custom" && params.dateTo && datePattern.test(params.dateTo) ? params.dateTo : formatISO(now, { representation: "date" });
  let from: string;
  if (params.period === "3m") from = formatISO(subMonths(now, 3), { representation: "date" });
  else if (params.period === "6m") from = formatISO(subMonths(now, 6), { representation: "date" });
  else if (params.period === "12m") from = formatISO(subMonths(now, 12), { representation: "date" });
  else if (params.period === "year") from = formatISO(startOfYear(now), { representation: "date" });
  else if (params.period === "custom" && params.dateFrom && datePattern.test(params.dateFrom)) from = params.dateFrom;
  else from = formatISO(subDays(now, 30), { representation: "date" });
  return from <= to ? { from, to } : { from: to, to: from };
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const session = await requirePageSession();
  const params = await searchParams;
  const selected = params.period ?? "30d";
  const dates = range(params);
  const data = await reportData({ userId: session.user.id }, dates.from, dates.to);
  const exportQuery = new URLSearchParams({ dateFrom: dates.from, dateTo: dates.to }).toString();

  return <div className="space-y-7">
    <PageHeader title="Relatórios" description="Análises construídas exclusivamente a partir dos seus lançamentos." action={<a className="inline-flex h-10 items-center rounded-xl border bg-[var(--card)] px-4 text-sm font-semibold" href={`/api/exports/transactions.csv?${exportQuery}`}>Exportar CSV</a>} />
    <Card>
      <form className="grid gap-3 sm:grid-cols-4">
        <Select name="period" defaultValue={selected}><option value="30d">Últimos 30 dias</option><option value="3m">3 meses</option><option value="6m">6 meses</option><option value="12m">12 meses</option><option value="year">Ano atual</option><option value="custom">Personalizado</option></Select>
        <Input aria-label="Data inicial" name="dateFrom" type="date" defaultValue={params.dateFrom ?? dates.from} />
        <Input aria-label="Data final" name="dateTo" type="date" defaultValue={params.dateTo ?? dates.to} />
        <button className="rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white">Aplicar período</button>
      </form>
    </Card>
    <div className="grid gap-4 sm:grid-cols-3">
      <Card><p className="muted text-xs uppercase">Receitas</p><p className="mt-2 text-2xl font-bold text-emerald-600">{formatBRL(data.summary.income.amount)}</p></Card>
      <Card><p className="muted text-xs uppercase">Despesas</p><p className="mt-2 text-2xl font-bold">{formatBRL(data.summary.expenses.amount)}</p></Card>
      <Card><p className="muted text-xs uppercase">Fluxo líquido</p><p className="mt-2 text-2xl font-bold">{formatBRL(data.summary.cashFlow.amount)}</p><p className="muted mt-1 text-xs">{data.count} lançamentos no período</p></Card>
    </div>
    <Card><h2 className="font-semibold">Receitas x despesas</h2><CashFlowChart data={data.monthly} /></Card>
    <div className="grid gap-6 xl:grid-cols-2">
      <Card><h2 className="font-semibold">Gastos por categoria</h2><CategoryChart data={data.categories} /></Card>
      <Card><h2 className="font-semibold">Gastos por instituição</h2><InstitutionChart data={data.institutions} /></Card>
    </div>
  </div>;
}
