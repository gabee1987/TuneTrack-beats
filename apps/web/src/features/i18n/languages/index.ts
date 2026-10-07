import { parseLanguageResource, type TranslationResource } from "./parseLanguageResource";

export type LanguageId = "en" | "hu";

export const defaultLanguageId: LanguageId = "en";

const LANGUAGE_STORAGE_KEY = "tunetrack.language";

/**
 * Static so the language picker renders without fetching every catalogue; the key-parity
 * guard checks it against each catalogue's `language.*` entries.
 */
export const availableLanguages: readonly { id: LanguageId; name: string; nativeName: string }[] = [
  { id: "en", name: "English", nativeName: "English" },
  { id: "hu", name: "Hungarian", nativeName: "Magyar" },
];

// One chunk per catalogue, so a session downloads and parses only its own language (05 D3).
const languageLoaders: Record<LanguageId, () => Promise<string>> = {
  en: () => import("./en.properties?raw").then((module) => module.default),
  hu: () => import("./hu.properties?raw").then((module) => module.default),
};

const loadedResources = new Map<LanguageId, TranslationResource>();

export function isLanguageId(value: string | null): value is LanguageId {
  return availableLanguages.some((language) => language.id === value);
}

export function resolveInitialLanguageId(): LanguageId {
  const persistedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (isLanguageId(persistedLanguage)) {
    return persistedLanguage;
  }

  const preferredLanguage = window.navigator.language.split("-")[0] ?? "";
  if (isLanguageId(preferredLanguage)) {
    return preferredLanguage;
  }

  return defaultLanguageId;
}

export function persistLanguageId(languageId: LanguageId): void {
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, languageId);
}

export function getLoadedLanguageResource(languageId: LanguageId): TranslationResource | null {
  return loadedResources.get(languageId) ?? null;
}

export async function loadLanguageResource(languageId: LanguageId): Promise<TranslationResource> {
  const loadedResource = loadedResources.get(languageId);

  if (loadedResource) {
    return loadedResource;
  }

  const resource = parseLanguageResource(await languageLoaders[languageId]());
  loadedResources.set(languageId, resource);
  return resource;
}
