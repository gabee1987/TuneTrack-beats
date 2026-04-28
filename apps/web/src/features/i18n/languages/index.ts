import enRaw from "./en.properties?raw";
import huRaw from "./hu.properties?raw";
import { parseLanguageResource } from "./parseLanguageResource";

export const languageResources = {
  en: parseLanguageResource(enRaw),
  hu: parseLanguageResource(huRaw),
} as const;

export type LanguageId = keyof typeof languageResources;

export const defaultLanguageId: LanguageId = "en";

export const availableLanguages = Object.entries(languageResources).map(([id, resource]) => ({
  id: id as LanguageId,
  name: resource["language.name"] ?? id,
  nativeName: resource["language.nativeName"] ?? resource["language.name"] ?? id,
}));
