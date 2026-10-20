/**
 * What changed in each version, newest first. The newest entry is the app's version; a test
 * keeps it equal to `apps/web/package.json`. The words live in the catalogues under
 * `releaseNotes.<key>.*`: a `title`, a `summary`, and per section a `title` and items `1`…`n`.
 */
export interface ReleaseNoteSection {
  id: string;
  itemCount: number;
}

export interface ReleaseNote {
  /** Calendar date of the release, `YYYY-MM-DD`. */
  date: string;
  key: string;
  sections: readonly ReleaseNoteSection[];
  version: string;
}

export const releaseNotes: readonly ReleaseNote[] = [
  {
    date: "2026-10-20",
    key: "v0_2_0",
    sections: [
      { id: "start", itemCount: 4 },
      { id: "lobby", itemCount: 5 },
      { id: "music", itemCount: 6 },
      { id: "songs", itemCount: 3 },
      { id: "rules", itemCount: 4 },
      { id: "play", itemCount: 5 },
      { id: "fixes", itemCount: 5 },
    ],
    version: "0.2.0",
  },
  {
    date: "2026-07-25",
    key: "v0_1_0",
    sections: [],
    version: "0.1.0",
  },
];

export const appVersion = releaseNotes[0]!.version;

export function releaseNoteSectionItemKeys(note: ReleaseNote, section: ReleaseNoteSection) {
  return Array.from(
    { length: section.itemCount },
    (_, index) => `releaseNotes.${note.key}.${section.id}.${index + 1}`,
  );
}
