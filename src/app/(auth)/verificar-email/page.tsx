import Link from "next/link";
import { MailCheck } from "lucide-react";

export default function VerifyEmailPage() {
  return (
    <div className="text-center">
      <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-[var(--accent)] text-[var(--primary)]"><MailCheck className="size-8" /></span>
      <h1 className="mt-6 text-3xl font-bold">Confirme seu e-mail</h1>
      <p className="muted mt-3 leading-7">Enviamos um link de verificação. Depois de confirmar, volte para entrar no FinControl.</p>
      <Link className="mt-8 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--primary)] px-4 font-semibold text-white" href="/entrar">Voltar para o login</Link>
    </div>
  );
}
