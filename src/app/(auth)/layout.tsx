import { Logo } from "@/shared/ui/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
      <section className="hidden overflow-hidden bg-[#0d251b] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Logo />
        <div className="max-w-xl">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[.22em] text-emerald-300">Finanças em perspectiva</p>
          <h1 className="text-5xl font-semibold leading-[1.08] tracking-tight">Clareza para decidir. Controle para avançar.</h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-emerald-50/70">Seu patrimônio, contas e investimentos em um só lugar — com privacidade desde o primeiro lançamento.</p>
        </div>
        <p className="text-sm text-emerald-100/60">Dados privados · Valores precisos · Sem atalhos contábeis</p>
      </section>
      <section className="flex min-h-screen items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden"><Logo /></div>
          {children}
        </div>
      </section>
    </main>
  );
}
