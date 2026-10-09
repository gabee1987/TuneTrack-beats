import { beforeAll, describe, expect, it } from "vitest";
import { hintRegistry } from "../../features/hints/hintRegistry";
import {
  availableLanguages,
  defaultLanguageId,
  loadLanguageResource,
  type LanguageId,
} from "../../features/i18n/languages";
import type { TranslationResource } from "../../features/i18n/languages/parseLanguageResource";

const languageIds = availableLanguages.map((language) => language.id);
const languageResources = new Map<LanguageId, TranslationResource>();

function resourceOf(languageId: LanguageId): TranslationResource {
  const resource = languageResources.get(languageId);

  if (!resource) {
    throw new Error(`${languageId} was not loaded`);
  }

  return resource;
}

function keySet(languageId: LanguageId): Set<string> {
  return new Set(Object.keys(resourceOf(languageId)));
}

describe("i18n key parity", () => {
  beforeAll(async () => {
    for (const languageId of languageIds) {
      languageResources.set(languageId, await loadLanguageResource(languageId));
    }
  });

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

      expect(missing, `${languageId} is missing keys present in ${defaultLanguageId}`).toEqual([]);
      expect(extra, `${languageId} has keys absent from ${defaultLanguageId}`).toEqual([]);
    },
  );

  it.each(languageIds)("%s has no empty translation values", (languageId) => {
    const empty = Object.entries(resourceOf(languageId))
      .filter(([, value]) => value.trim().length === 0)
      .map(([key]) => key)
      .sort();

    expect(empty, `${languageId} has keys with an empty value`).toEqual([]);
  });

  it.each(languageIds)("%s defines every hint title and body", (languageId) => {
    const keys = keySet(languageId);
    const missing = Object.values(hintRegistry)
      .flatMap((hint) => [hint.titleKey, hint.bodyKey])
      .filter((key) => !keys.has(key))
      .sort();

    expect(missing, `${languageId} is missing hint keys from hintRegistry`).toEqual([]);
  });

  it.each(languageIds)("%s metadata matches its catalogue", (languageId) => {
    const language = availableLanguages.find((candidate) => candidate.id === languageId);
    const resource = resourceOf(languageId);

    expect(language?.name).toBe(resource["language.name"]);
    expect(language?.nativeName).toBe(resource["language.nativeName"]);
    expect(resource["language.code"]).toBe(languageId);
  });
});
