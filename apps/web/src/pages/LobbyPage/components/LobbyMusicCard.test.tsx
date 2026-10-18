import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../test/renderWithProviders";
import type { LobbyMusicStatus } from "../hooks/lobbySetupModel";
import { LobbyMusicCard } from "./LobbyMusicCard";

const COVERS = [1, 2, 3, 4].map((index) => `https://images.example.test/TEST_COVER_${index}.jpg`);

function renderCard(music: LobbyMusicStatus) {
  renderWithProviders(
    <LobbyMusicCard
      coverUrls={COVERS}
      deckMeter={null}
      music={music}
      onCheckSongs={vi.fn()}
      onOpen={vi.fn()}
      onUsePracticeDeck={vi.fn()}
      practiceDeckStatus="idle"
      tracksToCheckCount={0}
    />,
  );
  return screen.getByRole("button", { name: /^Music/ });
}

describe("LobbyMusicCard", () => {
  it("shows a Spotify deck's covers as a mosaic (`22` §4.6)", () => {
    const card = renderCard({ kind: "spotifyPremium", songCount: 60 });

    expect([...card.querySelectorAll("img")].map((image) => image.getAttribute("src"))).toEqual(
      COVERS,
    );
  });

  it("keeps the note for the practice deck", () => {
    const card = renderCard({ kind: "practice", songCount: 12 });

    expect(card.querySelector("img")).toBeNull();
  });
});
