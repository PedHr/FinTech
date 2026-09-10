"use client";

import { upload } from "@vercel/blob/client";
import { FileUp, LoaderCircle, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Field, Select } from "@/shared/ui/form-controls";

type CardOption = { id: string; name: string };

async function lookupImport(pathname: string) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const response = await fetch(`/api/imports/lookup?pathname=${encodeURIComponent(pathname)}`);
    if (response.ok) return response.json() as Promise<{ id: string }>;
    await new Promise((resolve) => setTimeout(resolve, 500 + attempt * 250));
  }
  throw new Error("A confirmação do upload demorou além do esperado.");
}

async function processImport(id: string) {
  const response = await fetch(`/api/imports/${id}/process`, { method: "POST" });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? "Não foi possível iniciar a análise da fatura.");
  return body as { status: string; errorMessage?: string | null };
}

export function UploadForm({ cards, storageDriver }: { cards: CardOption[]; storageDriver: "local" | "vercel-blob" }) {
  const router = useRouter(); const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false); const [file, setFile] = useState<File>();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget); const creditCardId = String(form.get("creditCardId") ?? "");
    if (!file || file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) return toast.error("Selecione um arquivo PDF válido.");
    if (file.size > 10 * 1024 * 1024) return toast.error("O PDF deve ter no máximo 10 MB.");
    setPending(true);
    try {
      let id: string;
      if (storageDriver === "local") {
        form.set("file", file); const response = await fetch("/api/imports/upload", { method: "POST", body: form }); const body = await response.json();
        if (!response.ok) throw new Error(body.error?.message ?? "Falha no upload."); id = body.id;
      } else {
        const pathname = `imports/${crypto.randomUUID()}.pdf`;
        const blob = await upload(pathname, file, { access: "private", handleUploadUrl: "/api/imports/upload", clientPayload: JSON.stringify({ creditCardId, displayName: file.name }) });
        id = (await lookupImport(blob.pathname)).id;
        const result = await processImport(id);
        if (result.status === "FAILED") {
          toast.error(result.errorMessage ?? "Não foi possível interpretar esta fatura.");
          router.push(`/importacoes/${id}/revisao`); router.refresh();
          return;
        }
      }
      toast.success("Upload concluído. Estamos analisando a fatura."); router.push(`/importacoes/${id}/revisao`); router.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível concluir o upload. Tente novamente."); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit} className="grid gap-6"><Field label="Cartão"><Select name="creditCardId" required><option value="">Selecione o cartão da fatura</option>{cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</Select></Field>
    <button type="button" onClick={() => inputRef.current?.click()} className="grid min-h-56 place-items-center rounded-2xl border-2 border-dashed p-8 text-center transition hover:border-[var(--primary)] hover:bg-[var(--accent)]"><span><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--accent)] text-[var(--primary)]"><FileUp /></span><span className="mt-4 block font-semibold">{file ? file.name : "Selecione sua fatura em PDF"}</span><span className="muted mt-1 block text-sm">Máximo de 10 MB e 100 páginas</span></span></button>
    <input ref={inputRef} className="hidden" type="file" name="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0])} />
    <div className="muted flex items-start gap-2 rounded-xl bg-[var(--accent)] p-3 text-xs"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-[var(--primary)]" /><span>O documento permanece privado e só vira transação após sua revisão. O PDF é apagado depois da confirmação.</span></div>
    <Button disabled={pending || !file}>{pending ? <><LoaderCircle className="size-4 animate-spin" />Enviando...</> : "Analisar fatura"}</Button>
  </form>;
}
