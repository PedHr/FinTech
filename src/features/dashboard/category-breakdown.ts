import Decimal from "decimal.js";

export function categoryBreakdown(data: { name: string; value: number }[]) {
  const rows = data.filter((row) => Number.isFinite(row.value) && row.value > 0)
    .map((row) => ({ ...row })).sort((a, b) => b.value - a.value);
  const total = rows.reduce((sum, row) => sum.plus(row.value), new Decimal(0));
  return {
    total: total.toNumber(),
    rows: rows.map((row) => ({ ...row, percentage: total.isZero() ? 0 : new Decimal(row.value).div(total).mul(100).toNumber() })),
    topThreePercentage: total.isZero() ? 0 : rows.slice(0, 3).reduce((sum, row) => sum.plus(row.value), new Decimal(0)).div(total).mul(100).toNumber(),
  };
}
