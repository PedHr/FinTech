"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Field, Input, Select, Textarea } from "@/shared/ui/form-controls";
import { updateTransactionAction, voidTransactionAction } from "./actions";

type Category = { id: string; name: string };
type EditableTransaction = { id: string; description: string; amount: string; date: string; categoryId: string | null; note: string | null; tags: string[] };

export function TransactionRowActions({ item, categories }: { item: EditableTransaction; categories: Category[] }) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);

  async function update(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true);
    const result = await updateTransactionAction(new FormData(event.currentTarget));
    setPending(false);
    if (!result.ok) return toast.error(result.error.message);
    setEditing(false); toast.success("Transação atualizada.");
  }

  async function remove() {
    if (!window.confirm("Excluir esta transação? O registro será anulado para preservar o histórico.")) return;
    setPending(true);
    const form = new FormData(); form.set("transactionId", item.id);
    const result = await voidTransactionAction(form);
    setPending(false);
    if (!result.ok) return toast.error(result.error.message);
    toast.success("Transação excluída.");
  }

  return <div className="flex justify-end gap-2">
    <Button type="button" variant="secondary" onClick={() => setEditing(true)}>Editar</Button>
    <Button type="button" variant="ghost" disabled={pending} onClick={remove}>Excluir</Button>
    {editing ? <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <form onSubmit={update} className="surface w-full max-w-xl space-y-4 rounded-2xl p-6">
        <input type="hidden" name="transactionId" value={item.id} />
        <h2 className="text-xl font-bold">Editar transação</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Descrição"><Input name="description" defaultValue={item.description} required /></Field>
          <Field label="Valor"><Input name="amount" defaultValue={item.amount} inputMode="decimal" required /></Field>
          <Field label="Data"><Input name="transactionDate" type="date" defaultValue={item.date} required /></Field>
          <Field label="Categoria"><Select name="categoryId" defaultValue={item.categoryId ?? ""}><option value="">Sem categoria</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select></Field>
        </div>
        <Field label="Tags (separadas por vírgula)"><Input name="tags" defaultValue={item.tags.join(", ")} /></Field>
        <Field label="Observação"><Textarea name="note" defaultValue={item.note ?? ""} /></Field>
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setEditing(false)}>Cancelar</Button><Button disabled={pending}>{pending ? "Salvando..." : "Salvar"}</Button></div>
      </form>
    </div> : null}
  </div>;
}
