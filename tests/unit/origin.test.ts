import { describe, expect, it } from "vitest";
import { validateRequestOrigin } from "@/server/security/origin";

describe("proteção de origem", () => {
  it("aceita mesma origem", () => {
    const request = new Request("https://finance.local/api/test", { headers: { host: "finance.local", origin: "https://finance.local" } });
    expect(() => validateRequestOrigin(request)).not.toThrow();
  });

  it("recusa origem cruzada", () => {
    const request = new Request("https://finance.local/api/test", { headers: { host: "finance.local", origin: "https://evil.example" } });
    expect(() => validateRequestOrigin(request)).toThrowError(/Origem/);
  });
});
