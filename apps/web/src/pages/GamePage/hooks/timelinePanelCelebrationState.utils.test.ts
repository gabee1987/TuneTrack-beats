import { describe, expect, it } from "vitest";
import {
  createTimelineCelebrationFlyAnimationState,
  shouldHandleTimelineCelebrationEvent,
} from "./timelinePanelCelebrationState.utils";

describe("timelinePanelCelebrationState.utils", () => {
  it("detects whether a celebration event still needs to be handled", () => {
    const event = {
      celebrationCard: null,
      celebrationKey: "celebration-1",
      eventKey: 2,
      message: "Challenge won.",
      reason: "challenge_success_celebration" as const,
      shouldAnimateCardToMine: false,
      tone: "success" as const,
    };

    expect(shouldHandleTimelineCelebrationEvent(null, event)).toBe(true);
    expect(shouldHandleTimelineCelebrationEvent(2, event)).toBe(false);
    expect(shouldHandleTimelineCelebrationEvent(null, null)).toBe(false);
  });

  it("creates fly animation state only when the event should animate to the mine timeline", () => {
    const celebrationCard = {
      albumTitle: "Album",
      artist: "Artist",
      id: "track-1",
      releaseYear: 2001,
      title: "Track 1",
    };
    const sourceRect = {
      x: 10,
      y: 20,
      width: 80,
      height: 120,
      top: 20,
      right: 90,
      bottom: 140,
      left: 10,
      toJSON: () => ({}),
    } as DOMRect;
    const targetRect = {
      x: 140,
      y: 24,
      width: 40,
      height: 40,
      top: 24,
      right: 180,
      bottom: 64,
      left: 140,
      toJSON: () => ({}),
    } as DOMRect;

    expect(
      createTimelineCelebrationFlyAnimationState({
        mineButtonRect: targetRect,
        previewCardRect: sourceRect,
        timelineView: "active",
        transitionEvent: {
          celebrationCard,
          celebrationKey: "celebration-2",
          eventKey: 3,
          message: "Beat confirmed.",
          reason: "challenge_success_celebration",
          shouldAnimateCardToMine: true,
          tone: "success",
        },
      }),
    ).toEqual({
      card: celebrationCard,
      sourceRect,
      targetRect,
    });

    expect(
      createTimelineCelebrationFlyAnimationState({
        mineButtonRect: targetRect,
        previewCardRect: sourceRect,
        timelineView: "mine",
        transitionEvent: {
          celebrationCard,
          celebrationKey: "celebration-2",
          eventKey: 3,
          message: "Beat confirmed.",
          reason: "challenge_success_celebration",
          shouldAnimateCardToMine: true,
          tone: "success",
        },
      }),
    ).toBeNull();
  });
});
