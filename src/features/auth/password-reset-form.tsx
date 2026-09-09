"use client";

import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/shared/ui/button";
import { Field, Input } from "@/shared/ui/form-controls";

export function PasswordResetRequestForm() {
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim().toLowerCase();
    await authClient.requestPasswordReset({ email, redirectTo: "/redefinir-senha" });
    setPending(false);
    toast.success("Se o e-mail estiver cadastrado, você receberá as instruções.");
  }
  return <form className="mt-8 grid gap-5" method="post" onSubmit={submit}><Field label="E-mail"><Input name="email" type="email" required /></Field><Button disabled={pending}>{pending ? "Enviando..." : "Enviar instruções"}</Button></form>;
}

export function PasswordResetForm({ token }: { token: string }) {
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    const response = await authClient.resetPassword({ newPassword: password, token });
    setPending(false);
    if (response.error) return toast.error("O link expirou ou não é válido.");
    toast.success("Senha alterada. Você já pode entrar.");
    window.location.replace("/entrar");
  }
  return <form className="mt-8 grid gap-5" method="post" onSubmit={submit}><Field label="Nova senha"><Input name="password" type="password" minLength={12} maxLength={128} required /></Field><Button disabled={pending}>{pending ? "Salvando..." : "Redefinir senha"}</Button></form>;
}
