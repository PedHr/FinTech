import { Search } from "lucide-react";
import { z } from "zod";
import { requirePageSession } from "@/server/auth/session";
import { financeOptions, transactionList, type TransactionFilters } from "@/server/finance/queries";
import { formatBRL } from "@/shared/lib/money";
import { TransactionForms } from "@/features/transactions/transaction-forms";
import { TransactionRowActions } from "@/features/transactions/row-actions";
import { Card, EmptyState, PageHeader } from "@/shared/ui/card";
import { Input, Select } from "@/shared/ui/form-controls";
import { RecurringForm } from "@/features/transactions/recurring-form";
import { recurringList } from "@/server/recurrences/service";

const uuid = z.string().uuid();
const money = z.string().regex(/^\d{1,15}([.,]\d{1,4})?$/);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function valid<T>(schema: z.ZodType<T>, value: string | undefined) {
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

type Params = Record<string, string | undefined>;

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const session = await requirePageSession();
  const params = await searchParams;
  const context = { userId: session.user.id };
  const filters: TransactionFilters = {
    query: params.q?.trim() || undefined,
    accountId: valid(uuid, params.accountId),
    institutionId: valid(uuid, params.institutionId),
    categoryId: valid(uuid, params.categoryId),
    kind: valid(z.enum(["INCOME", "EXPENSE", "REFUND", "ADJUSTMENT"]), params.kind),
    source: valid(z.enum(["MANUAL", "PDF_IMPORT", "CSV_IMPORT", "SYSTEM"]), params.source),
    dateFrom: valid(date, params.dateFrom),
    dateTo: valid(date, params.dateTo),
    minAmount: valid(money, params.minAmount),
    maxAmount: valid(money, params.maxAmount),
  };
  const [options, transactions, recurrences] = await Promise.all([
    financeOptions(context),
    transactionList(context, filters),
    recurringList(context),
  ]);

  return <div className="space-y-7">
    <PageHeader title="Transações" description="Receitas, despesas e transferências sem misturar seus efeitos." />
    <Card><TransactionForms accounts={options.accounts} categories={options.categories} /></Card>
    <Card>
      <details>
        <summary className="cursor-pointer font-semibold">Transações recorrentes ({recurrences.length})</summary>
        <div className="mt-5"><RecurringForm accounts={options.accounts.filter((item) => item.type !== "CREDIT_CARD")} categories={options.categories} /></div>
        {recurrences.length ? <div className="muted mt-5 flex flex-wrap gap-2 text-xs">{recurrences.map((item) => <span key={item.id} className="rounded-full bg-[var(--accent)] px-3 py-1">{item.description} · próxima {item.nextRunOn.toLocaleDateString("pt-BR", { timeZone: "UTC" })}</span>)}</div> : null}
      </details>
    </Card>
    <Card>
      <form className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="relative sm:col-span-2">
          <Search className="muted absolute left-3 top-3 size-4" />
          <Input className="w-full pl-9" name="q" defaultValue={params.q} placeholder="Buscar Uber, Amazon, Netflix..." />
        </div>
        <Select name="accountId" defaultValue={params.accountId}><option value="">Todas as contas</option>{options.accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
        <Select name="institutionId" defaultValue={params.institutionId}><option value="">Todos os bancos</option>{options.institutions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
        <Select name="categoryId" defaultValue={params.categoryId}><option value="">Todas as categorias</option>{options.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
        <Select name="kind" defaultValue={params.kind}><option value="">Todos os tipos</option><option value="INCOME">Receita</option><option value="EXPENSE">Despesa</option><option value="REFUND">Estorno</option><option value="ADJUSTMENT">Ajuste</option></Select>
        <Select name="source" defaultValue={params.source}><option value="">Todas as origens</option><option value="MANUAL">Manual</option><option value="PDF_IMPORT">PDF</option><option value="CSV_IMPORT">CSV</option><option value="SYSTEM">Sistema</option></Select>
        <Input aria-label="Data inicial" name="dateFrom" type="date" defaultValue={params.dateFrom} />
        <Input aria-label="Data final" name="dateTo" type="date" defaultValue={params.dateTo} />
        <Input aria-label="Valor mínimo" name="minAmount" inputMode="decimal" defaultValue={params.minAmount} placeholder="Valor mínimo" />
        <div className="flex gap-2"><Input aria-label="Valor máximo" name="maxAmount" inputMode="decimal" defaultValue={params.maxAmount} placeholder="Valor máximo" /><button className="rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white">Filtrar</button></div>
      </form>
      {transactions.length ? <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="muted border-b text-xs uppercase"><tr><th className="px-2 py-3">Data</th><th>Descrição</th><th>Categoria</th><th>Conta</th><th className="text-right">Valor</th><th className="text-right">Ações</th></tr></thead>
          <tbody className="divide-y">{transactions.map((item) => <tr key={item.id}>
            <td className="px-2 py-4">{item.transactionDate.toLocaleDateString("pt-BR", { timeZone: "UTC" })}</td>
            <td className="font-medium"><p>{item.description}</p>{item.tags.length ? <p className="muted mt-1 text-xs">{item.tags.map(({ tag }) => `#${tag.name}`).join(" · ")}</p> : null}</td>
            <td>{item.category?.name ?? "—"}</td>
            <td><p>{item.account.name}</p><p className="muted text-xs">{item.account.institution?.name}</p></td>
            <td className={`tabular text-right font-semibold ${item.direction === "CREDIT" ? "text-emerald-600 dark:text-emerald-400" : ""}`}>{item.direction === "CREDIT" ? "+ " : "− "}{formatBRL(item.amount.toString())}</td>
            <td><TransactionRowActions item={{ id: item.id, description: item.description, amount: item.amount.toString(), date: item.transactionDate.toISOString().slice(0, 10), categoryId: item.categoryId, note: item.note, tags: item.tags.map(({ tag }) => tag.name) }} categories={options.categories} /></td>
          </tr>)}</tbody>
        </table>
      </div> : <EmptyState title="Nenhuma transação encontrada" description="Registre uma movimentação ou ajuste os filtros." />}
    </Card>
  </div>;
}
