import { PasswordResetRequestForm } from "@/features/auth/password-reset-form";

export default function ForgotPage() {
  return <div><h1 className="text-3xl font-bold">Recuperar acesso</h1><p className="muted mt-2">Informe seu e-mail. A resposta é sempre neutra para proteger sua conta.</p><PasswordResetRequestForm /></div>;
}
