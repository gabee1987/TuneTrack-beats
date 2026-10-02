import type { HintId } from "./hintState";

export interface HintDefinition {
  bodyKey: string;
  id: HintId;
  priority: number;
  titleKey: string;
}

export const hintRegistry: Record<HintId, HintDefinition> = {
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
  "game-timeline-tap": {
    bodyKey: "hints.gameTimelineTap.body",
    id: "game-timeline-tap",
    priority: 30,
    titleKey: "hints.gameTimelineTap.title",
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
