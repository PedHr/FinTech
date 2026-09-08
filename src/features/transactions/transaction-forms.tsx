"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Field, Input, Select, Textarea } from "@/shared/ui/form-controls";
import { createTransactionAction, createTransferAction } from "./actions";

type Option = { id: string; name: string; type?: string };

export function TransactionForms({ accounts, categories }: { accounts: Option[]; categories: Option[] }) {
  const [mode, setMode] = useState<"EXPENSE" | "INCOME" | "TRANSFER">("EXPENSE");
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true);
    const form = new FormData(event.currentTarget);
    if (mode !== "TRANSFER") { form.set("kind", mode); form.set("direction", mode === "INCOME" ? "CREDIT" : "DEBIT"); }
    const result = mode === "TRANSFER" ? await createTransferAction(form) : await createTransactionAction(form);
    setPending(false);
    if (!result.ok) return toast.error(result.error.message);
    event.currentTarget.reset(); toast.success(mode === "TRANSFER" ? "Transferência registrada." : "Transação registrada.");
  }
  return <div><div className="mb-5 flex flex-wrap gap-2">{(["EXPENSE", "INCOME", "TRANSFER"] as const).map((item) => <Button type="button" key={item} variant={mode === item ? "primary" : "secondary"} onClick={() => setMode(item)}>{item === "EXPENSE" ? "Despesa" : item === "INCOME" ? "Receita" : "Transferência"}</Button>)}</div>
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Field label="Descrição"><Input name="description" required /></Field><Field label="Valor"><Input name="amount" inputMode="decimal" placeholder="0,00" required /></Field><Field label="Data"><Input name={mode === "TRANSFER" ? "transferDate" : "transactionDate"} type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></Field>
      {mode === "TRANSFER" ? <><Field label="Conta de origem"><Select name="sourceAccountId" required><option value="">Selecione</option>{accounts.filter((a) => a.type !== "CREDIT_CARD").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field><Field label="Conta de destino"><Select name="destinationAccountId" required><option value="">Selecione</option>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field></> : <><Field label="Conta"><Select name="accountId" required><option value="">Selecione</option>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field><Field label="Categoria"><Select name="categoryId"><option value="">Sem categoria</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field></>}
      <Field label="Tags (separadas por vírgula)"><Input name="tags" placeholder="trabalho, reembolsável" /></Field><div className="sm:col-span-2"><Field label="Observação"><Textarea name="note" /></Field></div><div className="sm:col-span-2 xl:self-end"><Button className="w-full" type="submit" disabled={pending}>{pending ? "Salvando..." : "Registrar"}</Button></div>
    </form>
  </div>;
}
