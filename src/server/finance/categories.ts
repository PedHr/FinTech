import type { CategoryKind } from "@/generated/prisma/client";

export type DefaultCategory = {
  name: string;
  kind: CategoryKind;
  color: string;
  icon: string;
  patterns?: string[];
};

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: "Alimentação", kind: "EXPENSE", color: "#f97316", icon: "utensils", patterns: ["IFOOD", "RESTAURANTE"] },
  { name: "Mercado", kind: "EXPENSE", color: "#84cc16", icon: "shopping-basket", patterns: ["MERCADO", "SUPERMERCADO"] },
  { name: "Transporte", kind: "EXPENSE", color: "#3b82f6", icon: "car", patterns: ["UBER", "99APP", "TAXI"] },
  { name: "Combustível", kind: "EXPENSE", color: "#eab308", icon: "fuel", patterns: ["POSTO", "SHELL", "IPIRANGA"] },
  { name: "Moradia", kind: "EXPENSE", color: "#8b5cf6", icon: "house" },
  { name: "Água", kind: "EXPENSE", color: "#06b6d4", icon: "droplets" },
  { name: "Energia", kind: "EXPENSE", color: "#f59e0b", icon: "zap" },
  { name: "Internet", kind: "EXPENSE", color: "#0ea5e9", icon: "wifi" },
  { name: "Telefone", kind: "EXPENSE", color: "#6366f1", icon: "smartphone" },
  { name: "Saúde", kind: "EXPENSE", color: "#ef4444", icon: "heart-pulse" },
  { name: "Educação", kind: "EXPENSE", color: "#14b8a6", icon: "graduation-cap" },
  { name: "Lazer", kind: "EXPENSE", color: "#ec4899", icon: "party-popper" },
  { name: "Viagem", kind: "EXPENSE", color: "#0d9488", icon: "plane" },
  { name: "Compras", kind: "EXPENSE", color: "#a855f7", icon: "shopping-bag", patterns: ["AMAZON"] },
  { name: "Assinaturas", kind: "EXPENSE", color: "#7c3aed", icon: "repeat", patterns: ["NETFLIX", "SPOTIFY"] },
  { name: "Serviços", kind: "EXPENSE", color: "#64748b", icon: "wrench" },
  { name: "Investimentos", kind: "BOTH", color: "#10b981", icon: "chart-no-axes-combined" },
  { name: "Impostos", kind: "EXPENSE", color: "#78716c", icon: "landmark" },
  { name: "Transferências", kind: "BOTH", color: "#94a3b8", icon: "arrow-left-right" },
  { name: "Salário", kind: "INCOME", color: "#22c55e", icon: "wallet-cards" },
  { name: "Rendimentos", kind: "INCOME", color: "#059669", icon: "trending-up" },
  { name: "Outros", kind: "BOTH", color: "#64748b", icon: "circle-ellipsis" },
];
