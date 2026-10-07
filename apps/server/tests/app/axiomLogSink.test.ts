import { afterEach, describe, expect, it, vi } from "vitest";

process.env["AXIOM_TOKEN"] = "TEST_AXIOM_TOKEN";
process.env["AXIOM_DATASET"] = "TEST_DATASET";

const { drainAxiomLogEvents, enqueueAxiomLogEvent } = await import("../../src/app/axiomLogSink.js");

function enqueueEvents(count: number): void {
  for (let index = 0; index < count; index += 1) {
    enqueueAxiomLogEvent({ action: "TEST_EVENT", index });
  }
}

describe("axiom log sink drain", () => {
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends every queued event in batches", async () => {
    const fetchMock = vi.fn((_url: string, _init: RequestInit) =>
      Promise.resolve(new Response(null, { status: 200 })),
    );
    vi.stubGlobal("fetch", fetchMock);

    enqueueEvents(60);
    await drainAxiomLogEvents();
    const sentLines = fetchMock.mock.calls
      .map(([, init]) => String(init.body).split("\n").length)
      .reduce((total, lines) => total + lines, 0);

    expect(sentLines).toBe(60);
    await drainAxiomLogEvents();
    expect(fetchMock.mock.calls.length).toBe(3);
  });

  it("stops when ingest keeps failing instead of looping", async () => {
    // A failed batch schedules a retry; fake timers keep it from reaching the network later.
    vi.useFakeTimers();
    vi.spyOn(process.stderr, "write").mockReturnValue(true);
    const fetchMock = vi.fn(() => Promise.resolve(new Response("down", { status: 503 })));
    vi.stubGlobal("fetch", fetchMock);

    enqueueEvents(3);
    await drainAxiomLogEvents();

    // One batch tries the edge, edge fallback and global URLs once each.
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
