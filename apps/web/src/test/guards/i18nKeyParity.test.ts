import { describe, expect, it } from "vitest";
import {
  availableLanguages,
  defaultLanguageId,
  languageResources,
} from "../../features/i18n/languages";

type LanguageId = keyof typeof languageResources;

const languageIds = Object.keys(languageResources) as LanguageId[];

function keySet(languageId: LanguageId): Set<string> {
  return new Set(Object.keys(languageResources[languageId]));
}

describe("i18n key parity", () => {
  it("ships more than one language", () => {
    expect(languageIds.length).toBeGreaterThan(1);
  });

  it.each(languageIds.filter((id) => id !== defaultLanguageId))(
    "%s defines exactly the same keys as the default language",
    (languageId) => {
      const defaultKeys = keySet(defaultLanguageId);
      const translationKeys = keySet(languageId);

      const missing = [...defaultKeys].filter((key) => !translationKeys.has(key)).sort();
      const extra = [...translationKeys].filter((key) => !defaultKeys.has(key)).sort();

      expect(missing, `${languageId} is missing keys present in ${defaultLanguageId}`).toEqual(
        [],
      );
      expect(extra, `${languageId} has keys absent from ${defaultLanguageId}`).toEqual([]);
    },
  );

  it.each(languageIds)("%s has no empty translation values", (languageId) => {
    const empty = Object.entries(languageResources[languageId])
      .filter(([, value]) => value.trim().length === 0)
      .map(([key]) => key)
      .sort();

    expect(empty, `${languageId} has keys with an empty value`).toEqual([]);
  });

  it("exposes metadata for every language", () => {
    expect(availableLanguages.map((language) => language.id).sort()).toEqual(
      [...languageIds].sort(),
    );

    for (const language of availableLanguages) {
      expect(language.name.length, `${language.id} has no name`).toBeGreaterThan(0);
      expect(
        language.nativeName.length,
        `${language.id} has no nativeName`,
      ).toBeGreaterThan(0);
    }
  });
});
