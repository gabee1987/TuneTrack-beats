import { describe, expect, it } from "vitest";
import { buildPlayer, buildTurnRoomState, TEST_GUEST_ID } from "../../test/roomStateFixtures";
import { reuseUnchangedReferences } from "./reuseUnchangedReferences";

describe("reuseUnchangedReferences", () => {
  it("returns the previous state when the next one is deep-equal", () => {
    const previous = buildTurnRoomState();

    expect(reuseUnchangedReferences(previous, structuredClone(previous))).toBe(previous);
  });

  it("keeps unchanged subtrees and replaces only the changed path", () => {
    const previous = buildTurnRoomState();
    const next = structuredClone(previous);
    next.players = next.players.map((player) =>
      player.id === TEST_GUEST_ID ? buildPlayer({ ...player, ttTokenCount: 4 }) : player,
    );

    const shared = reuseUnchangedReferences(previous, next);

    expect(shared).not.toBe(previous);
    expect(shared).toEqual(next);
    expect(shared.timelines).toBe(previous.timelines);
    expect(shared.currentTrackCard).toBe(previous.currentTrackCard);
    expect(shared.settings).toBe(previous.settings);
    expect(shared.players).not.toBe(previous.players);
    expect(shared.players[0]).toBe(previous.players[0]);
    expect(shared.players[1]?.ttTokenCount).toBe(4);
  });

  it("treats added, removed and undefined-valued keys and length changes as changes", () => {
    expect(reuseUnchangedReferences({ a: 1 }, { a: 1, b: undefined })).toEqual({
      a: 1,
      b: undefined,
    });
    expect(reuseUnchangedReferences({ a: 1, b: 2 }, { a: 1 })).toEqual({ a: 1 });
    const previousList = [1, 2, 3];
    expect(reuseUnchangedReferences(previousList, [1, 2])).toEqual([1, 2]);
    expect(reuseUnchangedReferences({ a: [1] }, { a: null })).toEqual({ a: null });
  });

  it("never mutates either argument", () => {
    const previous = buildTurnRoomState();
    const next = structuredClone(previous);
    next.turn = { ...next.turn!, turnNumber: 2 };
    const previousSnapshot = structuredClone(previous);
    const nextSnapshot = structuredClone(next);

    reuseUnchangedReferences(previous, next);

    expect(previous).toEqual(previousSnapshot);
    expect(next).toEqual(nextSnapshot);
  });
});
