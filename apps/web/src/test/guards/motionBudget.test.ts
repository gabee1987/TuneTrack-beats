import { describe, expect, it } from "vitest";
import { expectRatchet, listCssModules } from "./cssSourceFiles";

/**
 * A plain state transition takes at most 500 ms (`CLAUDE.md` → Look & Feel). Longer motion is
 * a deliberate choice listed here: loaders, the home ambient background, and the gameplay
 * feedback, celebration and status animations the owner kept (decision 19, 2026-10-07). The
 * global reduced-motion rule in `globals.css` stops all of them.
 */
const LONG_RUNNING_ALLOWLIST = [
  "app/components/AppRouteFallback.module.css .logoBlock, .iconBlock, .heroBlock, .lineWide, .lineMedium, .actionBlock",
  "features/loading/AppLoadingOverlay.module.css .note",
  "features/loading/AppLoadingOverlay.module.css .record",
  "features/loading/AppLoadingOverlay.module.css .equalizer span",
  "features/ui/primitives/Skeleton.module.css .skeleton",
  "pages/HomePage/mobile/AnimatedMenuBackground.module.css .orbOrange",
  "pages/HomePage/mobile/AnimatedMenuBackground.module.css .orbRose",
  "pages/GamePage/components/gamePageActionPanelsChallenge.module.css .challengePulseBorder",
  "pages/GamePage/components/timelineCards.module.css .previewCardCorrection, .previewCardCorrectionSurface",
  "pages/HomePage/mobile/AnimatedMenuBackground.module.css .orbViolet",
  "pages/LobbyPage/components/playlistEditList.module.css .loadingSpinner",
  "pages/LobbyPage/components/spotify/spotifySetupShell.module.css .spotifyConnectedDot",
  "pages/LobbyPage/components/spotify/spotifySetupShell.module.css .spotifyPremiumBadge::before",
  "pages/LobbyPage/components/spotify/spotifySetupShell.module.css .spotifySongsReadyDot",
] as const;

const MAX_TRANSITION_MS = 500;
const RULE_BLOCK = /([^{}]+)\{([^{}]*)\}/g;
const TIMING_DECLARATION =
  /(?:^|;)\s*(animation|animation-duration|transition|transition-duration)\s*:\s*([^;]+)/g;
const TIME_VALUE = /(?:^|[\s,(])(\d*\.?\d+)(ms|s)\b/g;

function toMilliseconds(amount: string, unit: string): number {
  return unit === "s" ? Number(amount) * 1000 : Number(amount);
}

/** The duration is the first time value of each comma-separated item; the second is a delay. */
function listDurations(property: string, value: string): number[] {
  const items = value.split(/,(?![^(]*\))/);

  return items.flatMap((item) => {
    const times = [...item.matchAll(TIME_VALUE)].map(([, amount, unit]) =>
      toMilliseconds(amount ?? "0", unit ?? "ms"),
    );
    return property.endsWith("-duration") ? times : times.slice(0, 1);
  });
}

function listLongRunningRules(): string[] {
  return listCssModules().flatMap((file) =>
    [...file.contents.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(RULE_BLOCK)].flatMap(
      ([, selector, body]) => {
        const isLongRunning = [...(body ?? "").matchAll(TIMING_DECLARATION)].some(
          ([, property, value]) =>
            listDurations(property ?? "", value ?? "").some(
              (duration) => duration > MAX_TRANSITION_MS,
            ),
        );
        const normalizedSelector = (selector ?? "").trim().replace(/\s+/g, " ");
        return isLongRunning ? [`${file.path} ${normalizedSelector}`] : [];
      },
    ),
  );
}

describe("motion budget", () => {
  const longRunningRules = [...new Set(listLongRunningRules())];

  it("keeps CSS transitions and animations at or under 500 ms outside loaders", () => {
    const { newOffenders } = expectRatchet(longRunningRules, LONG_RUNNING_ALLOWLIST);

    expect(
      newOffenders,
      "A state transition takes at most 500 ms. Longer motion is an owner decision; add it to " +
        "the allowlist with that reason.",
    ).toEqual([]);
  });

  it("keeps the allowlist honest", () => {
    const { fixedButStillListed } = expectRatchet(longRunningRules, LONG_RUNNING_ALLOWLIST);

    expect(fixedButStillListed, "These rules no longer run long; remove them.").toEqual([]);
  });
});
