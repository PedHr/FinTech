"use client";

import { AlertTriangle, CheckCircle2, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Input, Select } from "@/shared/ui/form-controls";

type Draft = {
  id: string;
  included: boolean;
  description: string;
  transactionDate: string;
  amount: string;
  categoryId: string | null;
  duplicateStatus: "NEW" | "EXACT" | "POSSIBLE";
  kind: string;
};
type Category = { id: string; name: string };

export function ReviewTable({ importId, drafts, categories }: { importId: string; drafts: Draft[]; categories: Category[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(drafts);
  const [pending, setPending] = useState(false);
  const selected = useMemo(() => rows.filter((row) => row.included && row.kind !== "PAYMENT" && row.kind !== "UNKNOWN").length, [rows]);

  function update(id: string, patch: Partial<Draft>) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  async function confirm() {
    setPending(true);
    try {
      const response = await fetch(`/api/imports/${importId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: rows.map((row) => ({
          id: row.id,
          included: row.included,
          forceDuplicate: row.included && row.duplicateStatus !== "NEW",
          description: row.description,
          date: row.transactionDate,
          amount: row.amount,
          categoryId: row.categoryId || null,
        })) }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Falha ao importar.");
      toast.success(`${body.count} transações importadas.`);
      router.push("/transacoes");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível confirmar a importação.");
    } finally {
      setPending(false);
    }
  }

  return <div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="muted border-b text-xs uppercase"><tr><th className="px-2 py-3">Incluir</th><th>Data</th><th>Descrição</th><th>Categoria</th><th>Valor</th><th>Status</th></tr></thead>
        <tbody className="divide-y">{rows.map((row) => <tr key={row.id} className={!row.included ? "opacity-50" : ""}>
          <td className="px-2 py-3"><input aria-label={`Incluir ${row.description}`} type="checkbox" checked={row.included} disabled={row.kind === "PAYMENT" || row.kind === "UNKNOWN"} onChange={(event) => update(row.id, { included: event.target.checked })} className="size-4 accent-[var(--primary)]" /></td>
          <td><Input className="w-36" type="date" value={row.transactionDate} onChange={(event) => update(row.id, { transactionDate: event.target.value })} /></td>
          <td><Input className="w-full min-w-52" value={row.description} onChange={(event) => update(row.id, { description: event.target.value })} /></td>
          <td><Select className="min-w-44" value={row.categoryId ?? ""} onChange={(event) => update(row.id, { categoryId: event.target.value || null })}><option value="">Sem categoria</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select></td>
          <td><Input className="w-28" inputMode="decimal" value={row.amount} onChange={(event) => update(row.id, { amount: event.target.value })} /></td>
          <td>{row.kind === "PAYMENT"
            ? <span className="muted">Pagamento ignorado</span>
            : row.duplicateStatus === "NEW"
              ? <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="size-4" />Novo</span>
              : <span className="inline-flex items-center gap-1 text-amber-600"><AlertTriangle className="size-4" />{row.duplicateStatus === "EXACT" ? "Duplicado exato" : "Possível duplicado"}</span>}
          </td>
        </tr>)}</tbody>
      </table>
    </div>
    <div className="mt-6 flex flex-col items-center justify-between gap-4 border-t pt-5 sm:flex-row">
      <p className="muted text-sm">Duplicados começam desmarcados. Marque um deles somente se quiser importá-lo conscientemente.</p>
      <Button onClick={confirm} disabled={pending || selected === 0}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : null}Importar {selected} transações</Button>
    </div>
  </div>;
}
