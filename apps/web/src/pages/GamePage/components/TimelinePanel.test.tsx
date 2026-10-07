import type { DragMoveEvent, DragStartEvent } from "@dnd-kit/core";
import { act, render } from "@testing-library/react";
import { memo, type ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TimelineCardPublic } from "@tunetrack/shared";
import { I18nProvider } from "../../../features/i18n";
import { setElementBox } from "../../../test/stubs/layout";
import type { TimelineCelebrationTransitionEvent } from "../gamePageTransitionEvents";
import { TIMELINE_AUTO_SCROLL } from "../gamePage.constants";
import type { TimelinePanelModel } from "../GamePage.types";
import { TimelinePanel } from "./TimelinePanel";

const sortableItemRenders = vi.hoisted(() => new Map<string, number>());
const dndContextProps = vi.hoisted(() => ({
  current: null as {
    autoScroll?: unknown;
    onDragMove?: (event: DragMoveEvent) => void;
    onDragStart?: (event: DragStartEvent) => void;
  } | null,
}));

// Records the drag handlers so a test can drive a drag without simulating pointer physics.
vi.mock("@dnd-kit/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dnd-kit/core")>();
  return {
    ...actual,
    DndContext: (props: ComponentProps<typeof actual.DndContext>) => {
      dndContextProps.current = props;
      return <actual.DndContext {...props} />;
    },
  };
});

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

describe("TimelinePanel drag move layout reads (05 §2.2, C3)", () => {
  const timelineCards = [
    buildCard({ id: "slot-a", releaseYear: 1970, revealedYear: 1970 }),
    buildCard({ id: "slot-b", releaseYear: 1990, revealedYear: 1990 }),
    buildCard({ id: "slot-c", releaseYear: 2010, revealedYear: 2010 }),
  ];
  const SLOT_WIDTH = 100;
  const SLOT_STRIDE = 114;

  function buildDragModel(onSelectSlot: (slotIndex: number) => void): TimelinePanelModel {
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
        previewCard: {
          id: "track-current",
          title: "Current Track",
          artist: "Test Artist",
        } as TimelinePanelModel["interaction"]["previewCard"],
        previewSlotIndex: 0,
        selectable: true,
        selectedSlotIndex: 0,
      },
    };
  }

  function buildMoveEvent(centerX: number): DragMoveEvent {
    const left = centerX - SLOT_WIDTH / 2;
    return {
      active: {
        id: "timeline-preview-card",
        rect: {
          current: {
            translated: {
              bottom: 160,
              height: 140,
              left,
              right: left + SLOT_WIDTH,
              top: 20,
              width: SLOT_WIDTH,
            },
          },
        },
      },
    } as unknown as DragMoveEvent;
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reads no layout during 20 moves after the drag starts, across reorders", () => {
    const onSelectSlot = vi.fn();
    const { container } = render(renderModel(buildDragModel(onSelectSlot)));
    const slots = Array.from(container.querySelectorAll("[data-timeline-slot='true']"));
    expect(slots).toHaveLength(timelineCards.length + 1);
    setElementBox(slots[0]!.parentElement!, { x: 0, y: 0, width: 2000, height: 200 });
    slots.forEach((slot, slotIndex) => {
      setElementBox(slot, {
        x: 10 + slotIndex * SLOT_STRIDE,
        y: 20,
        width: SLOT_WIDTH,
        height: 140,
      });
    });

    act(() => {
      dndContextProps.current?.onDragStart?.({
        active: { id: "timeline-preview-card" },
      } as unknown as DragStartEvent);
    });

    const layoutReads = [
      vi.spyOn(Element.prototype, "getBoundingClientRect"),
      vi.spyOn(Element.prototype, "querySelectorAll"),
      vi.spyOn(Document.prototype, "querySelectorAll"),
      vi.spyOn(window, "getComputedStyle"),
    ];
    let now = 1_000;
    vi.spyOn(performance, "now").mockImplementation(() => now);

    for (let step = 0; step < 20; step += 1) {
      now += 200;
      act(() => {
        dndContextProps.current?.onDragMove?.(buildMoveEvent(200 + step * 16));
      });
    }

    for (const read of layoutReads) {
      expect(read).not.toHaveBeenCalled();
    }
    // The cached geometry still tracks the pointer: centre 504 is past all three cards.
    expect(onSelectSlot.mock.calls.map(([slotIndex]) => slotIndex)).toEqual([1, 2, 3]);
  });

  it("leaves edge scrolling to a slow dnd-kit auto-scroll", () => {
    const { container } = render(renderModel(buildDragModel(vi.fn())));
    const row = container.querySelector("[data-timeline-slot='true']")!.parentElement!;
    setElementBox(row, { x: 0, y: 0, width: 400, height: 300 });
    const scrollBy = vi.fn();
    row.scrollBy = scrollBy;

    act(() => {
      dndContextProps.current?.onDragStart?.({
        active: { id: "timeline-preview-card" },
      } as unknown as DragStartEvent);
    });
    // Deep inside the right and bottom edge zones.
    act(() => {
      dndContextProps.current?.onDragMove?.(buildMoveEvent(390));
    });

    expect(scrollBy).not.toHaveBeenCalled();
    expect(dndContextProps.current?.autoScroll).toBe(TIMELINE_AUTO_SCROLL);
    const maxPxPerSecond =
      (TIMELINE_AUTO_SCROLL.acceleration / TIMELINE_AUTO_SCROLL.interval) * 1000;
    expect(maxPxPerSecond).toBeLessThanOrEqual(200);
  });
});
