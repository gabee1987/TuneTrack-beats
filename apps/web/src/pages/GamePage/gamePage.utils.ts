import { defaultAnimateLayoutChanges } from "@dnd-kit/sortable";
import type { PublicRoomState } from "@tunetrack/shared";
import type { ThemeId } from "../../features/preferences/uiPreferences";
import { themeRegistry } from "../../features/theme/themeRegistry";

export function animateTimelineLayoutChanges(
  args: Parameters<typeof defaultAnimateLayoutChanges>[0],
) {
  return defaultAnimateLayoutChanges(args);
}

export function formatPhaseLabel(status: PublicRoomState["status"]): string {
  switch (status) {
    case "turn":
      return "Play";
    case "challenge":
      return "Challenge";
    case "reveal":
      return "Reveal";
    case "finished":
      return "Finished";
    case "lobby":
      return "Lobby";
    default:
      return "Game";
  }
}

export function getCardGradient(
  theme: ThemeId,
  seed: string,
  variant: "default" | "preview" | "overlay" = "default",
): string {
  const themeDefinition = themeRegistry[theme];
  const gradients = themeDefinition.gameCardGradients;
  const seedValue = Array.from(seed).reduce(
    (accumulator, character) => accumulator + character.charCodeAt(0),
    0,
  );
  const gradient = gradients[seedValue % gradients.length] ?? gradients[0] ?? "";

  if (variant === "overlay") {
    return `${gradient}, ${themeDefinition.gameCardPreviewOverlay}`;
  }

  if (variant === "preview") {
    return `${gradient}, ${themeDefinition.gameCardPreviewHighlight}`;
  }

  return gradient;
}
