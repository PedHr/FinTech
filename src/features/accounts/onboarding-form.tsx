"use client";

import { useState } from "react";
import { toast } from "sonner";
import { completeOnboardingAction } from "./actions";
import { Button } from "@/shared/ui/button";
import { Field, Input, Select } from "@/shared/ui/form-controls";

export function OnboardingForm() {
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true);
    const result = await completeOnboardingAction(new FormData(event.currentTarget));
    setPending(false);
    if (!result.ok) return toast.error(result.error.message);
    toast.success("Sua primeira conta está pronta.");
    window.location.replace("/dashboard");
  }
  return <form className="mt-8 grid gap-5" onSubmit={submit}>
    <Field label="Instituição"><Input name="institutionName" placeholder="Ex.: Nubank" required /></Field>
    <Field label="Nome da conta"><Input name="accountName" placeholder="Ex.: Conta principal" required /></Field>
    <Field label="Tipo"><Select name="accountType" defaultValue="CHECKING"><option value="CHECKING">Conta corrente</option><option value="SAVINGS">Poupança</option><option value="PAYMENT">Conta de pagamento</option><option value="WALLET">Carteira</option><option value="CASH">Dinheiro</option><option value="INVESTMENT">Conta de investimentos</option><option value="OTHER">Outro</option></Select></Field>
    <div className="grid gap-5 sm:grid-cols-2"><Field label="Saldo inicial"><Input name="openingBalance" inputMode="decimal" defaultValue="0,00" required /></Field><Field label="Data do saldo"><Input name="openingDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></Field></div>
    <label className="flex items-start gap-3 text-sm"><input className="mt-1 accent-[var(--primary)]" type="checkbox" required /><span className="muted">Concordo com o tratamento dos dados necessário para operar o FinControl.</span></label>
    <Button type="submit" disabled={pending}>{pending ? "Preparando..." : "Ir para o dashboard"}</Button>
  </form>;
}
