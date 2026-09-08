"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const final = new Set(["REVIEW_READY", "COMPLETED", "FAILED", "DUPLICATE_FILE", "CANCELLED"]);

export function ProcessingState({ id, status, message }: { id: string; status: string; message?: string | null }) {
  const router = useRouter();
  useEffect(() => {
    if (final.has(status)) return;
    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/imports/${id}/status`, { cache: "no-store" });
      if (!response.ok) return;
      const body = await response.json(); if (final.has(body.status)) router.refresh();
    }, 2000);
    return () => window.clearInterval(timer);
  }, [id, router, status]);
  return <div className="grid min-h-80 place-items-center text-center"><div>{final.has(status) ? null : <LoaderCircle className="mx-auto size-10 animate-spin text-[var(--primary)]" />}<h2 className="mt-5 text-xl font-semibold">{status === "FAILED" ? "Não foi possível interpretar esta fatura" : status === "DUPLICATE_FILE" ? "Este PDF já foi importado" : "Analisando seu documento"}</h2><p className="muted mt-2 max-w-md">{message ?? (final.has(status) ? "Consulte o histórico ou envie outro documento." : "Extraindo texto, identificando lançamentos e procurando duplicidades.")}</p></div></div>;
}
