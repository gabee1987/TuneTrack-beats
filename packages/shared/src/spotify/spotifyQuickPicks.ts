export const SPOTIFY_QUICK_PICK_CURRENT_YEAR = new Date().getFullYear();

export const SPOTIFY_QUICK_PICK_PRESETS = [
  {
    id: "80s_hits",
    name: "80s Hits",
    searchQueries: ["80s hits", "best 80s songs", "80s classics"],
    yearRanges: [{ startYear: 1980, endYear: 1989 }],
  },
  {
    id: "90s_rock",
    name: "90s Rock",
    searchQueries: ["90s rock classics", "best 90s rock", "90s alternative rock"],
    yearRanges: [{ startYear: 1990, endYear: 1999 }],
  },
  {
    id: "2000s_pop",
    name: "2000s Pop",
    searchQueries: ["2000s pop hits", "best 2000s pop", "00s pop classics"],
    yearRanges: [{ startYear: 2000, endYear: 2009 }],
  },
  {
    id: "metal_classics",
    name: "Metal Classics",
    searchQueries: [
      "classic metal essentials",
      "best classic metal songs",
      "heavy metal classics",
      "old school metal classics",
    ],
    yearRanges: [{ startYear: 1970, endYear: 2009 }],
  },
  {
    id: "iconic_songs",
    name: "Most Iconic Songs",
    searchQueries: [
      "most iconic songs of all time",
      "greatest songs of all time",
      "timeless classic songs",
      "songs everyone knows",
    ],
    yearRanges: [{ startYear: 1950, endYear: SPOTIFY_QUICK_PICK_CURRENT_YEAR }],
  },
  {
    id: "disco_best",
    name: "Best Disco Music",
    searchQueries: ["best disco songs", "disco classics", "70s disco hits", "80s disco classics"],
    yearRanges: [{ startYear: 1970, endYear: 1989 }],
  },
  {
    id: "party_mix",
    name: "Party Mix",
    searchQueries: ["party hits", "party mix", "party classics"],
    yearRanges: [{ startYear: 1970, endYear: SPOTIFY_QUICK_PICK_CURRENT_YEAR }],
  },
  {
    id: "movie_night",
    name: "Movie Night",
    searchQueries: ["movie soundtrack hits", "iconic movie songs", "best movie songs"],
    yearRanges: [{ startYear: 1960, endYear: SPOTIFY_QUICK_PICK_CURRENT_YEAR }],
  },
] as const;

export const SPOTIFY_QUICK_PICK_PRESET_IDS = [
  "80s_hits",
  "90s_rock",
  "2000s_pop",
  "metal_classics",
  "iconic_songs",
  "disco_best",
  "party_mix",
  "movie_night",
] as const;

export type SpotifyQuickPickPresetId = (typeof SPOTIFY_QUICK_PICK_PRESET_IDS)[number];

export function getSpotifyQuickPickPreset(presetId: string) {
  return SPOTIFY_QUICK_PICK_PRESETS.find((preset) => preset.id === presetId) ?? null;
}
