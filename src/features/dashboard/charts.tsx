"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart } from "recharts";

const colors = ["#0f8a5f", "#38bdf8", "#8b5cf6", "#f97316", "#eab308", "#ec4899"];
const tooltipStyle = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--foreground)" };

export function NetWorthChart({ data }: { data: { month: string; value: number }[] }) {
  return <div className="h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ left: -16, right: 8, top: 12 }}><defs><linearGradient id="wealth" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0f8a5f" stopOpacity={0.3} /><stop offset="100%" stopColor="#0f8a5f" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="month" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} /><Tooltip contentStyle={tooltipStyle} formatter={(value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value))} /><Area type="monotone" dataKey="value" stroke="#0f8a5f" strokeWidth={3} fill="url(#wealth)" /></AreaChart></ResponsiveContainer></div>;
}

export function CategoryChart({ data }: { data: { name: string; value: number }[] }) {
  if (!data.length) return <div className="muted grid h-64 place-items-center text-sm">Sem despesas neste mês.</div>;
  return <div className="h-64"><ResponsiveContainer><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={64} outerRadius={94} paddingAngle={3}>{data.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}</Pie><Tooltip contentStyle={tooltipStyle} formatter={(value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value))} /></PieChart></ResponsiveContainer></div>;
}

export function InstitutionChart({ data }: { data: { name: string; value: number }[] }) {
  return <div className="h-64"><ResponsiveContainer><BarChart data={data} layout="vertical" margin={{ left: 8 }}><CartesianGrid horizontal={false} stroke="var(--border)" /><XAxis hide type="number" /><YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={90} /><Tooltip contentStyle={tooltipStyle} formatter={(value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value))} /><Bar dataKey="value" fill="#0f8a5f" radius={[0, 8, 8, 0]} /></BarChart></ResponsiveContainer></div>;
}

export function CashFlowChart({ data }: { data: { month: string; income: number; expenses: number }[] }) {
  if (!data.length) return <div className="muted grid h-72 place-items-center text-sm">Sem movimentações no período.</div>;
  return <div className="h-72"><ResponsiveContainer><BarChart data={data}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="month" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(value / 1000)}k`} /><Tooltip contentStyle={tooltipStyle} formatter={(value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value))} /><Bar dataKey="income" name="Receitas" fill="#0f8a5f" radius={[6, 6, 0, 0]} /><Bar dataKey="expenses" name="Despesas" fill="#f97316" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>;
}
