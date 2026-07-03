export const SPOTIFY_QUICK_PICK_CURRENT_YEAR = new Date().getFullYear();

export const SPOTIFY_QUICK_PICK_PRESETS = [
  {
    id: "80s_hits",
    name: "80s Hits",
    searchQueries: [
      "80s pop hits",
      "80s rock hits",
      "80s new wave classics",
      "80s dance classics",
      "80s power ballads",
    ],
    yearRanges: [{ startYear: 1980, endYear: 1989 }],
  },
  {
    id: "90s_rock",
    name: "90s Rock",
    searchQueries: [
      "90s rock classics",
      "best 90s rock",
      "90s alternative rock",
      "90s grunge classics",
      "90s pop rock hits",
    ],
    yearRanges: [{ startYear: 1990, endYear: 1999 }],
  },
  {
    id: "2000s_pop",
    name: "2000s Pop",
    searchQueries: [
      "2000s pop hits",
      "best 2000s pop",
      "00s pop classics",
      "2000s dance pop",
      "2000s r&b hits",
    ],
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
    searchQueries: [
      "party classics",
      "party rock hits",
      "dance party hits",
      "throwback party songs",
      "sing along party songs",
    ],
    yearRanges: [{ startYear: 1970, endYear: SPOTIFY_QUICK_PICK_CURRENT_YEAR }],
  },
  {
    id: "movie_night",
    name: "Movie Night",
    searchQueries: ["movie soundtrack hits", "iconic movie songs", "best movie songs"],
    yearRanges: [{ startYear: 1960, endYear: SPOTIFY_QUICK_PICK_CURRENT_YEAR }],
  },
  {
    id: "decades_challenge",
    name: "Decades Challenge",
    searchQueries: [
      "60s hits",
      "70s hits",
      "80s hits",
      "90s hits",
      "2000s hits",
      "2010s hits",
      "2020s hits",
    ],
    yearRanges: [{ startYear: 1960, endYear: SPOTIFY_QUICK_PICK_CURRENT_YEAR }],
  },
  {
    id: "rock_pop_timeline",
    name: "Rock + Pop Timeline",
    searchQueries: [
      "classic rock hits",
      "80s pop hits",
      "90s alternative hits",
      "2000s pop rock",
      "2010s pop hits",
      "modern rock hits",
    ],
    yearRanges: [{ startYear: 1960, endYear: SPOTIFY_QUICK_PICK_CURRENT_YEAR }],
  },
  {
    id: "dance_timeline",
    name: "Dance Timeline",
    searchQueries: [
      "70s disco classics",
      "80s dance classics",
      "90s dance hits",
      "2000s club hits",
      "2010s edm hits",
      "2020s dance hits",
    ],
    yearRanges: [{ startYear: 1970, endYear: SPOTIFY_QUICK_PICK_CURRENT_YEAR }],
  },
  {
    id: "female_icons",
    name: "Female Icons",
    searchQueries: [
      "female pop icons",
      "women rock icons",
      "female r&b classics",
      "female vocal hits",
      "women music legends",
    ],
    yearRanges: [{ startYear: 1960, endYear: SPOTIFY_QUICK_PICK_CURRENT_YEAR }],
  },
  {
    id: "alternative_indie",
    name: "Alternative + Indie",
    searchQueries: [
      "80s alternative classics",
      "90s alternative rock",
      "2000s indie rock",
      "2010s indie hits",
      "modern alternative hits",
    ],
    yearRanges: [{ startYear: 1980, endYear: SPOTIFY_QUICK_PICK_CURRENT_YEAR }],
  },
  {
    id: "global_party",
    name: "Global Party",
    searchQueries: [
      "latin party hits",
      "k pop hits",
      "eurodance classics",
      "reggaeton hits",
      "international party hits",
    ],
    yearRanges: [{ startYear: 1980, endYear: SPOTIFY_QUICK_PICK_CURRENT_YEAR }],
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
  "decades_challenge",
  "rock_pop_timeline",
  "dance_timeline",
  "female_icons",
  "alternative_indie",
  "global_party",
] as const;

export type SpotifyQuickPickPresetId = (typeof SPOTIFY_QUICK_PICK_PRESET_IDS)[number];

export function getSpotifyQuickPickPreset(presetId: string) {
  return SPOTIFY_QUICK_PICK_PRESETS.find((preset) => preset.id === presetId) ?? null;
}
