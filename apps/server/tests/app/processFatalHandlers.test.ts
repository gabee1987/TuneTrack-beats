import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { registerProcessFatalHandlers } from "../../src/app/processFatalHandlers.js";

function createFakeProcess() {
  const fakeProcess = new EventEmitter();
  const log = { fatal: vi.fn() };
  const exit = vi.fn();
  registerProcessFatalHandlers(fakeProcess, log, exit);
  return { exit, fakeProcess, log };
}

describe("process fatal handlers", () => {
  it("logs an uncaught exception and exits with a failure code", () => {
    const { exit, fakeProcess, log } = createFakeProcess();
    const error = new Error("TEST_FAILURE");

    fakeProcess.emit("uncaughtException", error);

    expect(log.fatal).toHaveBeenCalledWith({ err: error }, "uncaught exception, exiting");
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("logs an unhandled promise rejection and exits with a failure code", () => {
    const { exit, fakeProcess, log } = createFakeProcess();
    const reason = new Error("TEST_REJECTION");

    fakeProcess.emit("unhandledRejection", reason);

    expect(log.fatal).toHaveBeenCalledWith({ err: reason }, "unhandled promise rejection, exiting");
    expect(exit).toHaveBeenCalledWith(1);
  });
});
