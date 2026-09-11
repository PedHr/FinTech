"use client";

import { LoaderCircle, RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Field, Input } from "@/shared/ui/form-controls";

const final = new Set(["REVIEW_READY", "COMPLETED", "FAILED", "DUPLICATE_FILE", "CANCELLED"]);

export function ProcessingState({ id, status, errorCode, message }: { id: string; status: string; errorCode?: string | null; message?: string | null }) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  const [password, setPassword] = useState("");
  const passwordFailure = errorCode === "PDF_PASSWORD_REQUIRED" || errorCode === "PDF_PASSWORD_INVALID";
  useEffect(() => {
    if (final.has(status)) return;
    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/imports/${id}/status`, { cache: "no-store" });
      if (!response.ok) return;
      const body = await response.json(); if (final.has(body.status)) router.refresh();
    }, 2000);
    return () => window.clearInterval(timer);
  }, [id, router, status]);
  async function retry() {
    setRetrying(true);
    try {
      const response = await fetch(`/api/imports/${id}/retry`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(password === "" ? {} : { password }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Não foi possível reprocessar a fatura.");
      toast.success("Fatura enviada novamente para análise.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível reprocessar a fatura.");
    } finally {
      setRetrying(false);
    }
  }
  return <div className="grid min-h-80 place-items-center text-center"><div>{final.has(status) ? null : <LoaderCircle className="mx-auto size-10 animate-spin text-[var(--primary)]" />}<h2 className="mt-5 text-xl font-semibold">{status === "FAILED" ? "Não foi possível interpretar esta fatura" : status === "DUPLICATE_FILE" ? "Este PDF já foi importado" : "Analisando seu documento"}</h2><p className="muted mt-2 max-w-md">{message ?? (final.has(status) ? "Consulte o histórico ou envie outro documento." : "Extraindo texto, identificando lançamentos e procurando duplicidades.")}</p>{status === "FAILED" ? <div className="mx-auto mt-5 grid max-w-sm gap-3">{passwordFailure ? <Field label="Senha do PDF"><Input type="password" maxLength={256} autoComplete="off" value={password} onChange={(event) => setPassword(event.target.value)} /></Field> : null}<Button className="mx-auto" onClick={retry} disabled={retrying || (passwordFailure && password === "")}>{retrying ? <LoaderCircle className="size-4 animate-spin" /> : <RotateCw className="size-4" />}Reprocessar fatura</Button></div> : null}</div></div>;
}
