"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createAccountAction, createInstitutionAction } from "./actions";
import { Button } from "@/shared/ui/button";
import { Field, Input, Select } from "@/shared/ui/form-controls";

type Institution = { id: string; name: string };

export function InstitutionForm() {
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true);
    const result = await createInstitutionAction(new FormData(event.currentTarget)); setPending(false);
    if (!result.ok) return toast.error(result.error.message);
    event.currentTarget.reset(); toast.success("Instituição adicionada.");
  }
  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-[1fr_9rem_auto] sm:items-end"><Field label="Nome"><Input name="name" placeholder="Ex.: Inter" required /></Field><Field label="Cor"><Input name="color" type="color" defaultValue="#0f8a5f" /></Field><Button type="submit" disabled={pending}>{pending ? "Salvando..." : "Adicionar banco"}</Button></form>;
}

export function AccountForm({ institutions }: { institutions: Institution[] }) {
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true);
    const result = await createAccountAction(new FormData(event.currentTarget)); setPending(false);
    if (!result.ok) return toast.error(result.error.message);
    event.currentTarget.reset(); toast.success("Conta adicionada.");
  }
  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <Field label="Nome da conta"><Input name="name" placeholder="Conta principal" required /></Field>
    <Field label="Instituição"><Select name="institutionId"><option value="">Sem instituição</option>{institutions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
    <Field label="Tipo"><Select name="type"><option value="CHECKING">Conta corrente</option><option value="SAVINGS">Poupança</option><option value="PAYMENT">Conta de pagamento</option><option value="WALLET">Carteira</option><option value="CASH">Dinheiro</option><option value="INVESTMENT">Investimentos</option><option value="OTHER">Outro</option></Select></Field>
    <Field label="Saldo inicial"><Input name="openingBalance" defaultValue="0,00" inputMode="decimal" required /></Field>
    <Field label="Data inicial"><Input name="openingDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></Field>
    <input type="hidden" name="currency" value="BRL" />
    <Field label="Cor"><Input name="color" type="color" defaultValue="#0f8a5f" /></Field>
    <div className="sm:col-span-2 xl:self-end"><Button className="w-full" type="submit" disabled={pending}>{pending ? "Salvando..." : "Adicionar conta"}</Button></div>
  </form>;
}
