import { CreditCard as CardIcon } from "lucide-react";
import { requirePageSession } from "@/server/auth/session";
import { accountBalances, financeOptions } from "@/server/finance/queries";
import { formatBRL } from "@/shared/lib/money";
import { CardForm, InstallmentForm } from "@/features/cards/card-forms";
import { Card, EmptyState, PageHeader } from "@/shared/ui/card";

export default async function CardsPage() {
  const session = await requirePageSession(); const context = { userId: session.user.id };
  const [options, balances] = await Promise.all([financeOptions(context), accountBalances(context)]);
  const cardBalances = balances.filter((item) => item.type === "CREDIT_CARD");
  return <div className="space-y-7"><PageHeader title="Cartões" description="Limite e faturas conectados ao mesmo livro financeiro." />
    <Card><h2 className="mb-4 font-semibold">Novo cartão</h2><CardForm institutions={options.institutions} accounts={options.accounts} /></Card>
    {options.cards.length ? <Card><h2 className="mb-4 font-semibold">Compra parcelada</h2><InstallmentForm cards={options.cards.map((item) => ({ id: item.id, name: item.account.name }))} categories={options.categories} /></Card> : null}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cardBalances.length ? cardBalances.map((item) => { const used = Math.max(0, -Number(item.balance.amount)); const limit = Number(item.creditLimit?.amount ?? 0); return <Card key={item.id} className="bg-gradient-to-br from-[#123a2b] to-[#091d15] text-white"><div className="flex justify-between"><CardIcon /><span className="text-sm text-emerald-100/70">{item.institution}</span></div><p className="mt-8 font-semibold">{item.name}</p><div className="mt-4 flex justify-between text-sm"><div><p className="text-emerald-100/60">Utilizado</p><p className="tabular font-semibold">{formatBRL(used)}</p></div><div className="text-right"><p className="text-emerald-100/60">Disponível</p><p className="tabular font-semibold">{formatBRL(Math.max(0, limit - used))}</p></div></div><div className="mt-4 h-1.5 rounded-full bg-white/15"><div className="h-full rounded-full bg-emerald-300" style={{ width: `${limit ? Math.min(100, used / limit * 100) : 0}%` }} /></div></Card>; }) : <div className="sm:col-span-2 xl:col-span-3"><EmptyState title="Nenhum cartão" description="Adicione um cartão para controlar faturas e parcelas." /></div>}</div>
  </div>;
}
