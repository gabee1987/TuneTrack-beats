import { act, render } from "@testing-library/react";
import { memo, type ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TimelineCardPublic } from "@tunetrack/shared";
import { I18nProvider } from "../../../features/i18n";
import type { TimelineCelebrationTransitionEvent } from "../gamePageTransitionEvents";
import type { TimelinePanelModel } from "../GamePage.types";
import { TimelinePanel } from "./TimelinePanel";

const sortableItemRenders = vi.hoisted(() => new Map<string, number>());

// Same shallow comparison as the real `memo(TimelineSortableItemComponent)`, so this counts
// renders caused by changed props. dnd-kit's sortable context re-renders every item on a
// reorder regardless; that cost is outside what the props can control.
vi.mock("./TimelineSortableItem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./TimelineSortableItem")>();
  return {
    TimelineSortableItem: memo((props: ComponentProps<typeof actual.TimelineSortableItem>) => {
      sortableItemRenders.set(props.id, (sortableItemRenders.get(props.id) ?? 0) + 1);
      return <actual.TimelineSortableItem {...props} />;
    }),
  };
});

function buildModel(overrides: {
  timelineCards: TimelineCardPublic[];
  originalChosenSlotIndex: number | null;
  showCorrectPlacementPreview: boolean;
  celebrationEvent: TimelineCelebrationTransitionEvent | null;
}): TimelinePanelModel {
  return {
    header: {
      cardCount: overrides.timelineCards.length,
      title: "Host",
    },
    interaction: {
      challengerChosenSlotIndex: null,
      onSelectSlot: () => undefined,
      originalChosenSlotIndex: overrides.originalChosenSlotIndex,
      previewCard: null,
      previewSlotIndex: null,
      selectable: false,
      selectedSlotIndex: 0,
    },
    render: {
      hiddenCardMode: "artwork",
      revealedCardMode: "artwork",
      hint: "",
      previewCardTransitionEvent: null,
      timelinePreviewTransitionEvent: null,
      timelineCelebrationTransitionEvent: overrides.celebrationEvent,
      showCorrectPlacementPreview: overrides.showCorrectPlacementPreview,
      showCorrectionPreview: false,
      showDevAlbumInfo: false,
      showDevCardInfo: false,
      showDevGenreInfo: false,
      showDevYearInfo: false,
      showHint: false,
      isOwnTimeline: true,
      theme: "dark",
      timelineCards: overrides.timelineCards,
      timelineView: "active",
    },
  };
}

function renderModel(model: TimelinePanelModel) {
  return (
    <I18nProvider>
      <TimelinePanel model={model} />
    </I18nProvider>
  );
}

// CorrectPlacementCelebration renders its children twice (shell content + the
// wipe-fill content), while the plain card branch renders them once. Counting
// the year text is a structural signal that survives CSS module class names
// not resolving to anything in this test environment.
function countYearOccurrences(container: HTMLElement, year: number): number {
  return Array.from(container.querySelectorAll("strong")).filter(
    (node) => node.textContent === String(year),
  ).length;
}

function buildCard(overrides: Partial<TimelineCardPublic> & { id: string }): TimelineCardPublic {
  return {
    title: "Test Track",
    artist: "Test Artist",
    albumTitle: "Test Album",
    releaseYear: 2000,
    revealedYear: 2000,
    ...overrides,
  };
}

const FIRST_CARD = buildCard({ id: "slot-0", releaseYear: 1980, revealedYear: 1980 });
const BOUGHT_CARD = buildCard({ id: "bought-card", releaseYear: 2001, revealedYear: 2001 });
const SECOND_PLACED_CARD = buildCard({ id: "track-b", releaseYear: 2010, revealedYear: 2010 });

const FIRST_PLACEMENT_CELEBRATION: TimelineCelebrationTransitionEvent = {
  celebrationCard: null,
  celebrationKey: "ROOM1:1:host:track-a:0:placement:correct",
  eventKey: 1,
  message: "Correct!",
  reason: "challenge_success_celebration",
  shouldAnimateCardToMine: false,
  tone: "success",
};

const SECOND_PLACEMENT_CELEBRATION: TimelineCelebrationTransitionEvent = {
  celebrationCard: null,
  celebrationKey: "ROOM1:3:host:track-b:2:placement:correct",
  eventKey: 2,
  message: "Correct!",
  reason: "challenge_success_celebration",
  shouldAnimateCardToMine: false,
  tone: "success",
};

describe("TimelinePanel correct-placement glow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps celebrating later genuine placements after a tt_buy reveal in between", () => {
    const { container, rerender } = render(
      renderModel(
        buildModel({
          timelineCards: [FIRST_CARD],
          originalChosenSlotIndex: 0,
          showCorrectPlacementPreview: true,
          celebrationEvent: FIRST_PLACEMENT_CELEBRATION,
        }),
      ),
    );
    expect(countYearOccurrences(container, 1980)).toBe(2);

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    rerender(
      renderModel(
        buildModel({
          timelineCards: [FIRST_CARD],
          originalChosenSlotIndex: null,
          showCorrectPlacementPreview: false,
          celebrationEvent: FIRST_PLACEMENT_CELEBRATION,
        }),
      ),
    );

    // A tt_buy reveal: wasCorrect is true, so showCorrectPlacementPreview is true,
    // but revealType isn't "placement", so no new celebration toast event exists —
    // the panel is only ever handed the STALE `FIRST_PLACEMENT_CELEBRATION` here,
    // an unchanged reference to the exact object that already fired once.
    rerender(
      renderModel(
        buildModel({
          timelineCards: [FIRST_CARD, BOUGHT_CARD],
          originalChosenSlotIndex: 1,
          showCorrectPlacementPreview: true,
          celebrationEvent: FIRST_PLACEMENT_CELEBRATION,
        }),
      ),
    );
    // The bought card gets its own glow, derived from its own identity — not
    // skipped because the stale event object's key still equals what the panel
    // already consumed for the *previous* card.
    expect(countYearOccurrences(container, 2001)).toBe(2);

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    rerender(
      renderModel(
        buildModel({
          timelineCards: [FIRST_CARD, BOUGHT_CARD],
          originalChosenSlotIndex: null,
          showCorrectPlacementPreview: false,
          celebrationEvent: FIRST_PLACEMENT_CELEBRATION,
        }),
      ),
    );

    // A second genuine correct placement, with a fresh celebration event.
    rerender(
      renderModel(
        buildModel({
          timelineCards: [FIRST_CARD, BOUGHT_CARD, SECOND_PLACED_CARD],
          originalChosenSlotIndex: 2,
          showCorrectPlacementPreview: true,
          celebrationEvent: SECOND_PLACEMENT_CELEBRATION,
        }),
      ),
    );

    expect(countYearOccurrences(container, 2010)).toBe(2);
  });
});

describe("TimelinePanel render cost (05 C2)", () => {
  const timelineCards = [
    buildCard({ id: "slot-a", releaseYear: 1970, revealedYear: 1970 }),
    buildCard({ id: "slot-b", releaseYear: 1990, revealedYear: 1990 }),
    buildCard({ id: "slot-c", releaseYear: 2010, revealedYear: 2010 }),
  ];
  const previewCard = { id: "track-current", title: "Current Track", artist: "Test Artist" };
  const onSelectSlot = vi.fn();

  function buildSelectableModel(selectedSlotIndex: number): TimelinePanelModel {
    const model = buildModel({
      timelineCards,
      originalChosenSlotIndex: null,
      showCorrectPlacementPreview: false,
      celebrationEvent: null,
    });
    return {
      ...model,
      interaction: {
        ...model.interaction,
        onSelectSlot,
        previewCard: previewCard as TimelinePanelModel["interaction"]["previewCard"],
        previewSlotIndex: selectedSlotIndex,
        selectable: true,
        selectedSlotIndex,
      },
    };
  }

  it("gives unmoved cards equal props when the preview moves to another slot", () => {
    sortableItemRenders.clear();
    const { rerender } = render(renderModel(buildSelectableModel(0)));
    const renderedItemIds = [...sortableItemRenders.keys()];
    sortableItemRenders.clear();

    rerender(renderModel(buildSelectableModel(2)));

    const timelineItemIds = renderedItemIds.filter((itemId) => itemId !== "timeline-preview-card");
    expect(timelineItemIds).toHaveLength(timelineCards.length);
    for (const itemId of timelineItemIds) {
      expect(sortableItemRenders.get(itemId) ?? 0, itemId).toBe(0);
    }
    expect(sortableItemRenders.get("timeline-preview-card") ?? 0).toBeLessThanOrEqual(1);
  });
});
