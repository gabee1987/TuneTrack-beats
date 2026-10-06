import { describe, expect, it } from "vitest";
import { resolveServerUrl } from "./resolveServerUrl";

describe("resolveServerUrl", () => {
  it("prefers the explicit env server url", () => {
    expect(
      resolveServerUrl({
        envServerUrl: "http://10.0.0.5:3001",
        locationHostname: "192.168.0.100",
        locationProtocol: "http:",
      }),
    ).toBe("http://10.0.0.5:3001");
  });

  it("uses the current hostname for LAN testing when env is absent", () => {
    expect(
      resolveServerUrl({
        locationHostname: "192.168.0.100",
        locationProtocol: "http:",
      }),
    ).toBe("http://192.168.0.100:3001");
  });

  it("routes through the Vite proxy when served over HTTPS to avoid mixed content", () => {
    expect(
      resolveServerUrl({
        locationHostname: "192.168.0.100",
        locationProtocol: "https:",
      }),
    ).toBe("/");
  });

  it("falls back to localhost when no browser location is available", () => {
    expect(resolveServerUrl({})).toBe("http://localhost:3001");
  });
});
