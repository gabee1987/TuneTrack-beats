import { defaultAnimateLayoutChanges } from "@dnd-kit/sortable";
import type { PublicRoomState } from "@tunetrack/shared";
import type { CSSProperties } from "react";
import type {
  HiddenCardMode,
  RevealedCardMode,
  ThemeId,
} from "../../features/preferences/uiPreferences";
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

function buildArtworkSurface(artworkUrl: string, withHiddenOverlay: boolean): string {
  const layers = [
    "var(--gradient-card-artwork-scrim)",
    withHiddenOverlay ? "var(--gradient-hidden-card-preview-artwork)" : null,
    `url("${artworkUrl}")`,
  ].filter(Boolean);

  return layers.join(", ");
}

export function getTimelineCardSurfaceStyle(
  theme: ThemeId,
  seed: string,
  artworkUrl?: string,
  cardSurfaceMode: HiddenCardMode | RevealedCardMode = "artwork",
): CSSProperties {
  const shouldUseArtwork = cardSurfaceMode === "artwork" && Boolean(artworkUrl);

  if (shouldUseArtwork && artworkUrl) {
    return {
      ["--card-gradient" as string]: buildArtworkSurface(artworkUrl, false),
    };
  }

  return {
    ["--card-gradient" as string]: getCardGradient(theme, seed),
  };
}

export function getPreviewCardSurfaceStyle(options: {
  artworkUrl?: string | undefined;
  hiddenCardMode: HiddenCardMode;
  revealedCardMode?: RevealedCardMode | undefined;
  isOverlay?: boolean | undefined;
  seed: string;
  showRevealedContent: boolean;
  theme: ThemeId;
}): CSSProperties {
  const {
    artworkUrl,
    hiddenCardMode,
    revealedCardMode = "artwork",
    isOverlay = false,
    seed,
    showRevealedContent,
    theme,
  } = options;

  // Unrevealed placement cards must never reveal identity (no album art spoiler).
  if (!showRevealedContent) {
    if (hiddenCardMode === "gradient") {
      const hiddenGradient = "var(--gradient-card-hidden)";
      return {
        ["--card-gradient" as string]: hiddenGradient,
        ...(isOverlay ? {} : { backgroundImage: hiddenGradient }),
      };
    }

    const hiddenSurface = getCardGradient(
      theme,
      seed,
      isOverlay ? "overlay" : "preview",
    );
    return {
      ["--card-gradient" as string]: hiddenSurface,
      ...(isOverlay ? {} : { backgroundImage: hiddenSurface }),
    };
  }

  if (revealedCardMode === "artwork" && artworkUrl) {
    const surface = buildArtworkSurface(artworkUrl, false);
    return {
      ["--card-gradient" as string]: surface,
      ...(isOverlay
        ? {}
        : {
            backgroundImage: surface,
            backgroundPosition: "center",
            backgroundSize: "cover",
          }),
    };
  }

  const gradient = getCardGradient(
    theme,
    seed,
    isOverlay ? "overlay" : "preview",
  );
  return {
    ["--card-gradient" as string]: gradient,
    ...(isOverlay ? {} : { backgroundImage: gradient }),
  };
}
