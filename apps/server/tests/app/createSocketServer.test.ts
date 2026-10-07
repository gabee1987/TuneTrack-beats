import { createServer } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import type { Server } from "socket.io";
import { createSocketServer } from "../../src/app/createSocketServer.js";
import { env } from "../../src/app/env.js";

type OriginValidator = (
  origin: string | undefined,
  callback: (error: Error | null, allow?: boolean) => void,
) => void;

let io: Server | undefined;

function createTestSocketServer(): Server {
  io = createSocketServer(createServer());
  return io;
}

function checkOrigin(validator: OriginValidator, origin: string): boolean {
  let isAllowed = false;
  validator(origin, (error, allow) => {
    isAllowed = error === null && allow === true;
  });
  return isAllowed;
}

describe("createSocketServer", () => {
  afterEach(async () => {
    await io?.close();
    io = undefined;
  });

  it("uses the mobile heartbeat and the 5 MB buffer", () => {
    const options = createTestSocketServer()._opts;

    expect(options.pingInterval).toBe(20_000);
    expect(options.pingTimeout).toBe(25_000);
    expect(options.maxHttpBufferSize).toBe(5 * 1024 * 1024);
  });

  it("compresses messages above 4 kB, such as full state updates (05 A10)", () => {
    expect(createTestSocketServer()._opts.perMessageDeflate).toEqual({ threshold: 4 * 1024 });
  });

  it("leaves connection state recovery off", () => {
    expect(createTestSocketServer()._opts.connectionStateRecovery).toBeUndefined();
  });

  it("allows the configured client origin and refuses any other", () => {
    const cors = createTestSocketServer()._opts.cors as { origin: OriginValidator };
    const [configuredOrigin = ""] = env.CLIENT_ORIGIN.split(",");

    expect(checkOrigin(cors.origin, configuredOrigin.trim())).toBe(true);
    expect(checkOrigin(cors.origin, "https://example.invalid")).toBe(false);
  });
});
