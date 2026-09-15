import { describe, expect, it } from "vitest";
import { categoryBreakdown } from "@/features/dashboard/category-breakdown";

describe("category spending breakdown", () => {
  it("ranks every category and calculates shares of the complete total", () => {
    const data = Array.from({ length: 12 }, (_, index) => ({ name: `Categoria ${index}`, value: index + 1 }));
    const result = categoryBreakdown(data);
    expect(result.rows).toHaveLength(12);
    expect(result.total).toBe(78);
    expect(result.rows[0]?.name).toBe("Categoria 11");
    expect(result.rows[0]?.percentage).toBeCloseTo(12 / 78 * 100);
    expect(result.topThreePercentage).toBeCloseTo(33 / 78 * 100);
    expect(data[0]?.name).toBe("Categoria 0");
  });
  it("keeps unclassified expenses and sums decimal values accurately", () => {
    const result = categoryBreakdown([{ name: "Sem categoria", value: 0.1 }, { name: "Mercado", value: 0.2 }]);
    expect(result.total).toBe(0.3);
    expect(result.rows[1]?.name).toBe("Sem categoria");
  });
  it("handles empty, refunded and invalid values without invalid chart percentages", () => {
    expect(categoryBreakdown([])).toEqual({ total: 0, rows: [], topThreePercentage: 0 });
    expect(categoryBreakdown([{ name: "Estorno", value: -10 }, { name: "Zero", value: 0 }, { name: "Inválido", value: NaN }]).rows).toEqual([]);
  });
});
