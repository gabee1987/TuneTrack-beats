import { SPOTIFY_QUICK_PICK_PRESET_IDS } from "@tunetrack/shared/client";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuickPickArt } from "./QuickPickArt";

describe("QuickPickArt", () => {
  it("draws a decorative cover with its own motif for every quick pick", () => {
    const motifs = SPOTIFY_QUICK_PICK_PRESET_IDS.map((presetId) => {
      const { container, unmount } = render(<QuickPickArt presetId={presetId} />);
      const art = container.firstElementChild as HTMLElement;
      expect(art).toHaveAttribute("aria-hidden", "true");
      expect(art.querySelector("svg")?.childElementCount).toBeGreaterThan(0);
      const markup = art.innerHTML;
      unmount();
      return markup;
    });

    expect(new Set(motifs).size).toBe(SPOTIFY_QUICK_PICK_PRESET_IDS.length);
  });
});
