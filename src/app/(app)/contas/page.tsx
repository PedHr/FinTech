import Link from "next/link";
import { Building2, CreditCard, WalletCards } from "lucide-react";
import { requirePageSession } from "@/server/auth/session";
import { accountBalances, financeOptions } from "@/server/finance/queries";
import { formatBRL } from "@/shared/lib/money";
import { AccountForm, InstitutionForm } from "@/features/accounts/account-forms";
import { Card, EmptyState, PageHeader } from "@/shared/ui/card";

export default async function AccountsPage() {
  const session = await requirePageSession();
  const context = { userId: session.user.id };
  const [balances, options] = await Promise.all([accountBalances(context), financeOptions(context)]);
  return <div className="space-y-7"><PageHeader title="Contas e instituições" description="Saldos calculados a partir do seu histórico financeiro." />
    <Card><h2 className="mb-4 font-semibold">Nova instituição</h2><InstitutionForm /></Card>
    <Card><h2 className="mb-4 font-semibold">Nova conta</h2><AccountForm institutions={options.institutions} /></Card>
    <section><h2 className="mb-4 font-semibold">Suas contas</h2>{balances.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{balances.map((account) => <Link key={account.id} href={account.institutionId ? `/contas/${account.institutionId}` : "/contas"}><Card className="h-full transition hover:-translate-y-0.5 hover:shadow-lg"><div className="flex justify-between"><span className="grid size-10 place-items-center rounded-xl bg-[var(--accent)] text-[var(--primary)]">{account.type === "CREDIT_CARD" ? <CreditCard className="size-5" /> : <WalletCards className="size-5" />}</span><span className="muted text-xs">{account.institution}</span></div><p className="mt-5 font-semibold">{account.name}</p><p className="tabular mt-1 text-2xl font-bold">{formatBRL(account.balance.amount)}</p></Card></Link>)}</div> : <EmptyState title="Nenhuma conta ativa" description="Cadastre sua primeira conta para começar." />}</section>
    <section><h2 className="mb-4 font-semibold">Instituições</h2><div className="flex flex-wrap gap-3">{options.institutions.map((item) => <Link key={item.id} href={`/contas/${item.id}`} className="surface flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold"><Building2 className="size-4 text-[var(--primary)]" />{item.name}</Link>)}</div></section>
  </div>;
}
