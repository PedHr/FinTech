import { redirect } from "next/navigation";
import { requirePageSession } from "@/server/auth/session";
import { OnboardingForm } from "@/features/accounts/onboarding-form";
import { Logo } from "@/shared/ui/logo";

export default async function OnboardingPage() {
  const session = await requirePageSession();
  if (session.user.onboardingCompletedAt) redirect("/dashboard");
  return <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12"><Logo /><div className="surface mt-10 rounded-3xl p-6 sm:p-9"><p className="text-sm font-semibold text-[var(--primary)]">PRIMEIRO PASSO</p><h1 className="mt-2 text-3xl font-bold">Conte onde seu dinheiro começa</h1><p className="muted mt-3">Você poderá adicionar outras instituições, contas e cartões depois.</p><OnboardingForm /></div></main>;
}
