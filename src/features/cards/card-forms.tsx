"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createCardAction, createInstallmentAction } from "./actions";
import { Button } from "@/shared/ui/button";
import { Field, Input, Select } from "@/shared/ui/form-controls";

type Option = { id: string; name: string; type?: string };

export function CardForm({ institutions, accounts }: { institutions: Option[]; accounts: Option[] }) {
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); const result = await createCardAction(new FormData(event.currentTarget)); setPending(false);
    if (!result.ok) return toast.error(result.error.message); event.currentTarget.reset(); toast.success("Cartão adicionado.");
  }
  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Field label="Nome"><Input name="name" placeholder="Cartão principal" required /></Field><Field label="Instituição"><Select name="institutionId" required><option value="">Selecione</option>{institutions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field><Field label="Limite"><Input name="creditLimit" inputMode="decimal" required /></Field><Field label="Bandeira"><Input name="brand" placeholder="Mastercard" /></Field><Field label="Fechamento"><Input name="closingDay" type="number" min={1} max={28} required /></Field><Field label="Vencimento"><Input name="dueDay" type="number" min={1} max={28} required /></Field><Field label="Conta para pagamento"><Select name="paymentAccountId"><option value="">Definir depois</option>{accounts.filter((item) => item.type !== "CREDIT_CARD").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field><div className="self-end"><Button className="w-full" disabled={pending}>{pending ? "Salvando..." : "Adicionar cartão"}</Button></div></form>;
}

export function InstallmentForm({ cards, categories }: { cards: Option[]; categories: Option[] }) {
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); const result = await createInstallmentAction(new FormData(event.currentTarget)); setPending(false);
    if (!result.ok) return toast.error(result.error.message); event.currentTarget.reset(); toast.success("Parcelas criadas nas faturas futuras.");
  }
  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><Field label="Cartão"><Select name="creditCardId" required><option value="">Selecione</option>{cards.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field><Field label="Descrição"><Input name="description" required /></Field><Field label="Valor total"><Input name="totalAmount" inputMode="decimal" required /></Field><Field label="Parcelas"><Input name="installmentCount" type="number" min={1} max={120} required /></Field><Field label="Data da compra"><Input name="purchaseDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></Field><Field label="Categoria"><Select name="categoryId"><option value="">Sem categoria</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field><div className="sm:col-span-2 xl:col-span-3"><Button className="w-full" disabled={pending}>{pending ? "Criando..." : "Criar compra parcelada"}</Button></div></form>;
}
