"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeftRight, BarChart3, CreditCard, FileSearch, FileText,
  LayoutDashboard, LogOut, Menu, Moon, PiggyBank, Settings, Tags, WalletCards, X, Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { authClient } from "@/lib/auth-client";
import { Logo } from "./logo";
import { Button } from "./button";

const navigation = [
  ["Dashboard", "/dashboard", LayoutDashboard],
  ["Transações", "/transacoes", ArrowLeftRight],
  ["Contas", "/contas", WalletCards],
  ["Cartões", "/cartoes", CreditCard],
  ["Investimentos", "/investimentos", PiggyBank],
  ["Faturas", "/faturas", FileText],
  ["Importações", "/importacoes", FileSearch],
  ["Relatórios", "/relatorios", BarChart3],
  ["Categorias", "/categorias", Tags],
  ["Configurações", "/configuracoes", Settings],
] as const;

function Navigation({ close }: { close?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="mt-8 grid gap-1">
      {navigation.map(([label, href, Icon]) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link key={href} href={href} onClick={close} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-[var(--accent)] text-[var(--primary-strong)]" : "muted hover:bg-[var(--accent)] hover:text-[var(--foreground)]"}`}>
            <Icon className="size-[18px]" />{label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ userName, userEmail }: { userName: string; userEmail: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  async function signOut() {
    await authClient.signOut();
    router.push("/entrar");
    router.refresh();
  }

  const content = (
    <>
      <Logo />
      <Navigation close={() => setOpen(false)} />
      <div className="mt-auto border-t pt-4">
        <div className="mb-3 flex items-center gap-3 px-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-sm font-bold text-[var(--primary)]">{userName.slice(0, 1).toUpperCase()}</span>
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{userName}</p><p className="muted truncate text-xs">{userEmail}</p></div>
        </div>
        <button onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} className="muted flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-[var(--accent)]">
          {resolvedTheme === "dark" ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}Alternar tema
        </button>
        <button onClick={signOut} className="muted flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-[var(--accent)]"><LogOut className="size-[18px]" />Sair</button>
      </div>
    </>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r bg-[var(--card)] p-5 lg:flex">{content}</aside>
      <div className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b bg-[var(--card)] px-4 lg:hidden"><Logo /><Button variant="ghost" className="size-10 px-0" onClick={() => setOpen(true)} aria-label="Abrir menu"><Menu /></Button></div>
      {open ? <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" onClick={() => setOpen(false)}><aside className="flex h-full w-[82%] max-w-72 flex-col bg-[var(--card)] p-5" onClick={(event) => event.stopPropagation()}><div className="flex justify-between"><Logo /><Button variant="ghost" className="size-9 px-0" onClick={() => setOpen(false)} aria-label="Fechar menu"><X /></Button></div>{content}</aside></div> : null}
    </>
  );
}
