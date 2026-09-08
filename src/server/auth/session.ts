import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppError } from "@/shared/lib/result";
import { auth } from "./config";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireSession() {
  const session = await getSession();
  if (!session) throw new AppError("UNAUTHORIZED", "Faça login para continuar.", 401);
  if (!session.user.emailVerified) throw new AppError("FORBIDDEN", "Confirme seu e-mail para continuar.", 403);
  return session;
}

export async function requirePageSession() {
  const session = await getSession();
  if (!session) redirect("/entrar");
  if (!session.user.emailVerified) redirect("/verificar-email");
  return session;
}
