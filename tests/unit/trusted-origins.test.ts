import { afterEach, describe, expect, it, vi } from "vitest";
import { getTrustedAuthOrigins } from "@/server/auth/trusted-origins";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("origens confiáveis da autenticação", () => {
  it("aceita a origem canônica e os hosts exatos informados pela Vercel", () => {
    vi.stubEnv("VERCEL_URL", "fintech123-deploy-pedhrs-projects.vercel.app");
    vi.stubEnv("VERCEL_BRANCH_URL", "fintech123-git-main-pedhrs-projects.vercel.app");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "fintech123-pedhrs-projects.vercel.app");

    expect(getTrustedAuthOrigins("https://fintech123-three.vercel.app/path")).toEqual([
      "https://fintech123-three.vercel.app",
      "https://fintech123-deploy-pedhrs-projects.vercel.app",
      "https://fintech123-git-main-pedhrs-projects.vercel.app",
      "https://fintech123-pedhrs-projects.vercel.app",
    ]);
  });

  it("não confia em valores que não sejam hosts HTTPS da Vercel", () => {
    vi.stubEnv("VERCEL_URL", "evil.example");
    vi.stubEnv("VERCEL_BRANCH_URL", "fintech123.vercel.app.evil.example");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "https://fintech123.vercel.app");

    expect(getTrustedAuthOrigins("https://finance.example")).toEqual(["https://finance.example"]);
  });
});
