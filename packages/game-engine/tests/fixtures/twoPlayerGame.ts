import type {
  GameFlowService,
  GameState,
  GameTrackCard,
  StartGamePlayerInput,
} from "../../src/index.js";

type StartGameInput = Parameters<GameFlowService["startGame"]>[0];

export const players: StartGamePlayerInput[] = [
  {
    id: "player-1",
    displayName: "Player 1",
    startingTimelineCardCount: 1,
    startingTtTokenCount: 0,
  },
  {
    id: "player-2",
    displayName: "Player 2",
    startingTimelineCardCount: 2,
    startingTtTokenCount: 0,
  },
];

export const deck: GameTrackCard[] = [
  {
    id: "track-1",
    title: "Song 1",
    artist: "Artist 1",
    albumTitle: "Album 1",
    releaseYear: 1990,
  },
  {
    id: "track-2",
    title: "Song 2",
    artist: "Artist 2",
    albumTitle: "Album 2",
    releaseYear: 2005,
  },
  {
    id: "track-3",
    title: "Song 3",
    artist: "Artist 3",
    albumTitle: "Album 3",
    releaseYear: 1985,
  },
  {
    id: "track-4",
    title: "Song 4",
    artist: "Artist 4",
    albumTitle: "Album 4",
    releaseYear: 2000,
  },
  {
    id: "track-5",
    title: "Song 5",
    artist: "Artist 5",
    albumTitle: "Album 5",
    releaseYear: 1975,
  },
  {
    id: "track-6",
    title: "Song 6",
    artist: "Artist 6",
    albumTitle: "Album 6",
    releaseYear: 2010,
  },
];

export function seedPlayerTokens(tokenOverrides: Record<string, number>): GameState["players"] {
  return players.map((player) => ({
    ...player,
    ttTokenCount: tokenOverrides[player.id] ?? 0,
  }));
}

export function ttTokenCountOf(gameState: GameState, playerId: string): number | undefined {
  return gameState.players.find((player) => player.id === playerId)?.ttTokenCount;
}

function buildTrack(id: string, releaseYear: number): GameTrackCard {
  return { id, title: `Song ${id}`, artist: "Test Artist", albumTitle: "Test Album", releaseYear };
}

/**
 * player-1 holds 1990, 2000 and 2000; player-2 holds 1980. The turn card is from 2000 too,
 * so slots 1, 2 and 3 of player-1's timeline are all valid and slot 0 is the only miss.
 */
export function sameYearGameInput(
  startingTtTokenCount: Record<string, number> = {},
): StartGameInput {
  return {
    players: [
      {
        id: "player-1",
        displayName: "Player 1",
        startingTimelineCardCount: 3,
        startingTtTokenCount: startingTtTokenCount["player-1"] ?? 0,
      },
      {
        id: "player-2",
        displayName: "Player 2",
        startingTimelineCardCount: 1,
        startingTtTokenCount: startingTtTokenCount["player-2"] ?? 0,
      },
    ],
    deck: [
      buildTrack("same-1", 1990),
      buildTrack("same-2", 2000),
      buildTrack("same-3", 2000),
      buildTrack("same-4", 1980),
      buildTrack("same-5", 2000),
      buildTrack("same-6", 2010),
    ],
    targetTimelineCardCount: 10,
  };
}
