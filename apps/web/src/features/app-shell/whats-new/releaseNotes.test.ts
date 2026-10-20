import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadLanguageResource } from "../../i18n/languages";
import { appVersion, releaseNoteSectionItemKeys, releaseNotes } from "./releaseNotes";

describe("release notes", () => {
  it("names the app's version first", () => {
    const { version } = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };

    expect(appVersion).toBe(version);
  });

  it("lists every version once, newest first, on real dates", () => {
    const versions = releaseNotes.map((note) => note.version);
    const dates = releaseNotes.map((note) => note.date);

    expect(new Set(versions).size).toBe(versions.length);
    for (const date of dates) {
      expect(new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10)).toBe(date);
    }
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it("has words for every title, summary, section and item", async () => {
    const english = await loadLanguageResource("en");
    const keys = releaseNotes.flatMap((note) => [
      `releaseNotes.${note.key}.title`,
      `releaseNotes.${note.key}.summary`,
      ...note.sections.flatMap((section) => [
        `releaseNotes.${note.key}.${section.id}.title`,
        ...releaseNoteSectionItemKeys(note, section),
      ]),
    ]);

    expect(keys.filter((key) => !(key in english))).toEqual([]);
  });
});
