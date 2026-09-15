"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart } from "recharts";
import { formatBRL } from "@/shared/lib/money";
import { categoryBreakdown } from "./category-breakdown";

const colors = ["#0f8a5f", "#38bdf8", "#8b5cf6", "#f97316", "#eab308", "#ec4899"];
const tooltipStyle = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--foreground)" };

export function NetWorthChart({ data }: { data: { month: string; value: number }[] }) {
  return <div className="h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ left: -16, right: 8, top: 12 }}><defs><linearGradient id="wealth" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0f8a5f" stopOpacity={0.3} /><stop offset="100%" stopColor="#0f8a5f" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="month" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} /><Tooltip contentStyle={tooltipStyle} formatter={(value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value))} /><Area type="monotone" dataKey="value" stroke="#0f8a5f" strokeWidth={3} fill="url(#wealth)" /></AreaChart></ResponsiveContainer></div>;
}

export function CategoryChart({ data }: { data: { name: string; value: number }[] }) {
  const breakdown = categoryBreakdown(data);
  const largest = breakdown.rows[0];
  const percentage = (value: number) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  if (!largest) return <div className="muted grid h-64 place-items-center text-sm">Sem despesas positivas no período.</div>;
  return <div className="mt-4 space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="muted text-xs">Total distribuído</p><p className="tabular mt-1 text-2xl font-bold">{formatBRL(breakdown.total)}</p></div>
      <span className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs">{breakdown.rows.length} {breakdown.rows.length === 1 ? "categoria" : "categorias"}</span>
    </div>
    <div className="h-48" aria-hidden="true"><ResponsiveContainer><PieChart><Pie data={breakdown.rows} dataKey="value" nameKey="name" innerRadius={52} outerRadius={80} paddingAngle={2} isAnimationActive={false}>{breakdown.rows.map((row, index) => <Cell key={row.name} fill={colors[index % colors.length]} />)}</Pie><Tooltip contentStyle={tooltipStyle} formatter={(value) => formatBRL(Number(value))} /></PieChart></ResponsiveContainer></div>
    <div className="rounded-xl bg-[var(--accent)] p-3 text-sm">
      <p><span className="font-semibold">{largest.name}</span> concentra {percentage(largest.percentage)} dos gastos distribuídos.</p>
      {breakdown.rows.length > 3 && <p className="muted mt-1 text-xs">As três maiores categorias representam {percentage(breakdown.topThreePercentage)} do total.</p>}
    </div>
    <ol aria-label="Ranking de gastos por categoria" className="max-h-80 space-y-4 overflow-y-auto pr-1">
      {breakdown.rows.map((row, index) => <li key={row.name}>
        <div className="flex items-start justify-between gap-3 text-sm">
          <span className="min-w-0 break-words"><span className="muted mr-2 text-xs">{index + 1}.</span>{row.name}</span>
          <span className="shrink-0 text-right"><span className="tabular font-semibold">{formatBRL(row.value)}</span><span className="muted ml-2 text-xs">{percentage(row.percentage)}</span></span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--accent)]" aria-hidden="true"><div className="h-full rounded-full" style={{ width: `${row.percentage}%`, backgroundColor: colors[index % colors.length] }} /></div>
      </li>)}
    </ol>
  </div>;
}

export function InstitutionChart({ data }: { data: { name: string; value: number }[] }) {
  return <div className="h-64"><ResponsiveContainer><BarChart data={data} layout="vertical" margin={{ left: 8 }}><CartesianGrid horizontal={false} stroke="var(--border)" /><XAxis hide type="number" /><YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={90} /><Tooltip contentStyle={tooltipStyle} formatter={(value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value))} /><Bar dataKey="value" fill="#0f8a5f" radius={[0, 8, 8, 0]} /></BarChart></ResponsiveContainer></div>;
}

export function CashFlowChart({ data }: { data: { month: string; income: number; expenses: number }[] }) {
  if (!data.length) return <div className="muted grid h-72 place-items-center text-sm">Sem movimentações no período.</div>;
  return <div className="h-72"><ResponsiveContainer><BarChart data={data}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="month" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(value / 1000)}k`} /><Tooltip contentStyle={tooltipStyle} formatter={(value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value))} /><Bar dataKey="income" name="Receitas" fill="#0f8a5f" radius={[6, 6, 0, 0]} /><Bar dataKey="expenses" name="Despesas" fill="#f97316" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>;
}
