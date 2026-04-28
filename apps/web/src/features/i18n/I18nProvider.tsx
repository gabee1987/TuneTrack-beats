import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  availableLanguages,
  defaultLanguageId,
  languageResources,
  type LanguageId,
} from "./languages";
import type { Translate, TranslationKey, TranslationParams } from "./i18n.types";

const LANGUAGE_STORAGE_KEY = "tunetrack.language";

interface I18nContextValue {
  availableLanguages: typeof availableLanguages;
  languageId: LanguageId;
  setLanguage: (languageId: LanguageId) => void;
  t: Translate;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function isLanguageId(value: string | null): value is LanguageId {
  return value !== null && value in languageResources;
}

function getInitialLanguage(): LanguageId {
  if (typeof window === "undefined") {
    return defaultLanguageId;
  }

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

function getTranslationValue(key: TranslationKey, languageId: LanguageId): string {
  return languageResources[languageId][key] ?? key;
}

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) {
    return template;
  }

  return template.replace(/\{\{(\w+)\}\}/g, (match, paramName) => {
    const value = params[paramName];
    return value === undefined ? match : String(value);
  });
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [languageId, setLanguageId] = useState<LanguageId>(getInitialLanguage);

  useEffect(() => {
    document.documentElement.lang = languageResources[languageId]["language.code"] ?? languageId;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, languageId);
  }, [languageId]);

  const t = useCallback<Translate>(
    (key, params) => interpolate(getTranslationValue(key, languageId), params),
    [languageId],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      availableLanguages,
      languageId,
      setLanguage: setLanguageId,
      t,
    }),
    [languageId, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);

  if (!value) {
    throw new Error("useI18n must be used inside I18nProvider.");
  }

  return value;
}
