"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/shared/ui/button";
import { Field, Input } from "@/shared/ui/form-controls";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    const response = mode === "sign-up"
      ? await authClient.signUp.email({ name: String(form.get("name") ?? "").trim(), email, password })
      : await authClient.signIn.email({ email, password, rememberMe: true });
    setPending(false);

    if (response.error) {
      toast.error(mode === "sign-in" ? "E-mail ou senha inválidos." : response.error.message ?? "Não foi possível criar a conta.");
      return;
    }
    if (mode === "sign-up") {
      router.push(`/verificar-email?email=${encodeURIComponent(email)}`);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">{mode === "sign-in" ? "Que bom ver você" : "Crie sua conta"}</h1>
      <p className="muted mt-2">{mode === "sign-in" ? "Entre para acessar sua vida financeira." : "Comece com segurança em poucos minutos."}</p>
      <form className="mt-8 grid gap-5" method="post" onSubmit={submit}>
        {mode === "sign-up" ? <Field label="Nome"><Input name="name" autoComplete="name" minLength={2} maxLength={80} required /></Field> : null}
        <Field label="E-mail"><Input name="email" type="email" autoComplete="email" required /></Field>
        <Field label="Senha"><Input name="password" type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} minLength={12} maxLength={128} required /></Field>
        {mode === "sign-in" ? <Link className="-mt-2 text-right text-sm font-medium text-[var(--primary)]" href="/recuperar-senha">Esqueci minha senha</Link> : null}
        <Button className="w-full" type="submit" disabled={pending}>{pending ? "Aguarde..." : mode === "sign-in" ? "Entrar" : "Criar conta"}</Button>
      </form>
      <p className="muted mt-6 text-center text-sm">
        {mode === "sign-in" ? "Ainda não tem conta? " : "Já tem uma conta? "}
        <Link className="font-semibold text-[var(--primary)]" href={mode === "sign-in" ? "/cadastro" : "/entrar"}>{mode === "sign-in" ? "Cadastre-se" : "Entrar"}</Link>
      </p>
    </div>
  );
}
