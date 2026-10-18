import type { HintId, HintState } from "./hintState";

export interface HintDefinition {
  bodyKey: string;
  id: HintId;
  priority: number;
  titleKey: string;
}

export const hintRegistry: Record<HintId, HintDefinition> = {
  "lobby-share-code": {
    bodyKey: "hints.lobbyShareCode.body",
    id: "lobby-share-code",
    priority: 5,
    titleKey: "hints.lobbyShareCode.title",
  },
  "lobby-music": {
    bodyKey: "hints.lobbyMusic.body",
    id: "lobby-music",
    priority: 10,
    titleKey: "hints.lobbyMusic.title",
  },
  "music-needs-check": {
    bodyKey: "hints.musicNeedsCheck.body",
    id: "music-needs-check",
    priority: 15,
    titleKey: "hints.musicNeedsCheck.title",
  },
  "lobby-start": {
    bodyKey: "hints.lobbyStart.body",
    id: "lobby-start",
    priority: 20,
    titleKey: "hints.lobbyStart.title",
  },
  "game-drag-preview": {
    bodyKey: "hints.gameDragPreview.body",
    id: "game-drag-preview",
    priority: 10,
    titleKey: "hints.gameDragPreview.title",
  },
  "game-confirm": {
    bodyKey: "hints.gameConfirm.body",
    id: "game-confirm",
    priority: 20,
    titleKey: "hints.gameConfirm.title",
  },
  "game-challenge": {
    bodyKey: "hints.gameChallenge.body",
    id: "game-challenge",
    priority: 25,
    titleKey: "hints.gameChallenge.title",
  },
  "game-next-song": {
    bodyKey: "hints.gameNextSong.body",
    id: "game-next-song",
    priority: 35,
    titleKey: "hints.gameNextSong.title",
  },
  "game-timeline-tap": {
    bodyKey: "hints.gameTimelineTap.body",
    id: "game-timeline-tap",
    priority: 30,
    titleKey: "hints.gameTimelineTap.title",
  },
  "game-timeline-switch": {
    bodyKey: "hints.gameTimelineSwitch.body",
    id: "game-timeline-switch",
    priority: 45,
    titleKey: "hints.gameTimelineSwitch.title",
  },
  "game-tokens": {
    bodyKey: "hints.gameTokens.body",
    id: "game-tokens",
    priority: 40,
    titleKey: "hints.gameTokens.title",
  },
  "game-menu": {
    bodyKey: "hints.gameMenu.body",
    id: "game-menu",
    priority: 50,
    titleKey: "hints.gameMenu.title",
  },
};

const hintIds = Object.keys(hintRegistry) as HintId[];

export const hintCount = hintIds.length;

/** How many hints of the catalogue this device has acknowledged, for the app menu. */
export function countSeenHints(state: HintState): number {
  return hintIds.filter((id) => (state.seenCounts[id] ?? 0) > 0).length;
}
