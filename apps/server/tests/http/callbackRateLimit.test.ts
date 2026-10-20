import express, { type NextFunction, type Request, type Response } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "../../src/app/logger.js";
import { CALLBACK_RATE_LIMIT, createCallbackRateLimit } from "../../src/http/callbackRateLimit.js";

function createHarness() {
  let currentTime = 0;
  const limit = createCallbackRateLimit(() => currentTime);

  function request(address: string) {
    const next = vi.fn();
    const res = {
      setHeader: vi.fn(),
      status: vi.fn(),
      type: vi.fn(),
      send: vi.fn(),
    };
    res.status.mockReturnValue(res);
    res.type.mockReturnValue(res);
    limit({ ip: address, socket: {} } as Request, res as unknown as Response, next as NextFunction);
    return { isAllowed: next.mock.calls.length === 1, res };
  }

  function requestMany(address: string, count: number) {
    return Array.from({ length: count }, () => request(address).isAllowed);
  }

  return {
    request,
    requestMany,
    advance: (ms: number) => {
      currentTime += ms;
    },
  };
}

describe("OAuth callback rate limit", () => {
  beforeEach(() => {
    vi.spyOn(logger, "warn").mockImplementation(() => undefined);
  });

  it("answers 429 after the limit within one window", () => {
    const { request, requestMany } = createHarness();
    expect(requestMany("192.0.2.1", CALLBACK_RATE_LIMIT.maxRequests)).not.toContain(false);

    const { isAllowed, res } = request("192.0.2.1");

    expect(isAllowed).toBe(false);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.setHeader).toHaveBeenCalledWith("Retry-After", "60");
  });

  it("counts each address separately", () => {
    const { request, requestMany } = createHarness();
    requestMany("192.0.2.1", CALLBACK_RATE_LIMIT.maxRequests + 1);

    expect(request("192.0.2.2").isAllowed).toBe(true);
  });

  it("starts a fresh window once the previous one ends", () => {
    const { advance, request, requestMany } = createHarness();
    requestMany("192.0.2.1", CALLBACK_RATE_LIMIT.maxRequests + 1);

    advance(CALLBACK_RATE_LIMIT.windowMs);

    expect(request("192.0.2.1").isAllowed).toBe(true);
  });

  it("never logs the client address", () => {
    const { requestMany } = createHarness();
    requestMany("192.0.2.1", CALLBACK_RATE_LIMIT.maxRequests + 3);

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(vi.mocked(logger.warn).mock.calls)).not.toContain("192.0.2.1");
  });
});

describe("OAuth callback rate limit behind one trusted proxy", () => {
  beforeEach(() => {
    vi.spyOn(logger, "warn").mockImplementation(() => undefined);
  });

  it("counts each forwarded client separately, not the proxy", async () => {
    const app = express();
    app.set("trust proxy", 1);
    app.get("/callback", createCallbackRateLimit(), (_req, res) => {
      res.send("ok");
    });
    const requestFrom = (address: string) =>
      request(app).get("/callback").set("X-Forwarded-For", address);

    for (let index = 0; index < CALLBACK_RATE_LIMIT.maxRequests; index += 1) {
      await requestFrom("198.51.100.1");
    }

    expect((await requestFrom("198.51.100.1")).status).toBe(429);
    expect((await requestFrom("198.51.100.2")).status).toBe(200);
  });
});
