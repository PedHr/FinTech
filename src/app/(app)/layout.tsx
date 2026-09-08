import { redirect } from "next/navigation";
import { requirePageSession } from "@/server/auth/session";
import { Sidebar } from "@/shared/ui/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePageSession();
  if (!session.user.onboardingCompletedAt) redirect("/onboarding");
  return (
    <div>
      <Sidebar userName={session.user.name} userEmail={session.user.email} />
      <main className="mx-auto max-w-[1500px] px-4 pb-12 pt-24 sm:px-6 lg:ml-64 lg:px-8 lg:pt-8">{children}</main>
    </div>
  );
}
