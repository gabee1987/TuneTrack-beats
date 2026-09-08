import { describe, expect, it } from "vitest";
import { getRouteOrder } from "./AppRoutes";

describe("getRouteOrder", () => {
  it("orders routes so every step forward has a direction", () => {
    expect(getRouteOrder("/")).toBe(0);
    expect(getRouteOrder("/join/party-room")).toBe(1);
    expect(getRouteOrder("/play")).toBe(1);
    expect(getRouteOrder("/lobby/party-room")).toBe(2);
    expect(getRouteOrder("/game/party-room")).toBe(3);
  });

  it("gives Home and Play distinct steps, so that transition has a direction", () => {
    expect(getRouteOrder("/play")).toBeGreaterThan(getRouteOrder("/"));
  });
});
