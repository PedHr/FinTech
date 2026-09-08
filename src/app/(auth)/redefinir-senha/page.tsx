import { PasswordResetForm } from "@/features/auth/password-reset-form";

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <div><h1 className="text-3xl font-bold">Nova senha</h1><p className="muted mt-2">Use pelo menos 12 caracteres.</p>{token ? <PasswordResetForm token={token} /> : <p className="mt-6 text-[var(--danger)]">Link inválido.</p>}</div>;
}
