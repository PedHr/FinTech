import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "@/proxy";
import { AUTH_COOKIE_PREFIX } from "@/server/auth/constants";

describe("proxy de rotas autenticadas", () => {
  it("reconhece o cookie com o prefixo configurado pela autenticação", () => {
    const request = new NextRequest("https://finance.example/dashboard", {
      headers: { cookie: `__Secure-${AUTH_COOKIE_PREFIX}.session_token=session-value` },
    });

    const response = proxy(request);

    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("redireciona quando o cookie de sessão não existe", () => {
    const response = proxy(new NextRequest("https://finance.example/dashboard"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://finance.example/entrar?callbackUrl=%2Fdashboard");
  });
});
