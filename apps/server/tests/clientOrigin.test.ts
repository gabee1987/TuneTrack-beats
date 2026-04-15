import { describe, expect, it } from "vitest";
import { createCorsOriginValidator, isAllowedClientOrigin } from "../src/app/clientOrigin.js";

describe("clientOrigin", () => {
  it("allows the configured origin in every environment", () => {
    expect(
      isAllowedClientOrigin("http://localhost:5173", "http://localhost:5173", "production"),
    ).toBe(true);
  });

  it("allows private-network Vite origins during development", () => {
    expect(
      isAllowedClientOrigin("http://192.168.1.108:5173", "http://localhost:5173", "development"),
    ).toBe(true);
  });

  it("rejects private-network origins outside development", () => {
    expect(
      isAllowedClientOrigin("http://192.168.1.108:5173", "http://localhost:5173", "production"),
    ).toBe(false);
  });

  it("allows requests without an origin header", () => {
    expect(isAllowedClientOrigin(undefined, "http://localhost:5173", "development")).toBe(true);
  });

  it("creates a cors validator that rejects disallowed origins", () => {
    const validator = createCorsOriginValidator("http://localhost:5173", "production");

    validator("http://192.168.1.108:5173", (error) => {
      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toContain("not allowed");
    });
  });
});
