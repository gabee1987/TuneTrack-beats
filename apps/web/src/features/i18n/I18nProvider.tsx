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
  getLoadedLanguageResource,
  loadLanguageResource,
  persistLanguageId,
  resolveInitialLanguageId,
  type LanguageId,
} from "./languages";
import type { TranslationResource } from "./languages/parseLanguageResource";
import type { Translate, TranslationKey, TranslationParams } from "./i18n.types";

interface I18nContextValue {
  availableLanguages: typeof availableLanguages;
  languageId: LanguageId;
  setLanguage: (languageId: LanguageId) => void;
  t: Translate;
}

interface ShownLanguage {
  languageId: LanguageId;
  resource: TranslationResource;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function getShownLanguage(languageId: LanguageId): ShownLanguage | null {
  const resource = getLoadedLanguageResource(languageId);
  return resource ? { languageId, resource } : null;
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

/**
 * Renders once the requested catalogue has loaded; `main.tsx` loads the first one before the
 * app mounts. On a language switch the previous catalogue stays on screen until the next one
 * arrives, so a translation key is never shown in place of text.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [requestedLanguageId, setRequestedLanguageId] =
    useState<LanguageId>(resolveInitialLanguageId);
  const [shownLanguage, setShownLanguage] = useState(() => getShownLanguage(requestedLanguageId));

  useEffect(() => {
    let isCurrent = true;

    void loadLanguageResource(requestedLanguageId).then((resource) => {
      if (isCurrent) {
        setShownLanguage((current) =>
          current?.resource === resource ? current : { languageId: requestedLanguageId, resource },
        );
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [requestedLanguageId]);

  useEffect(() => {
    if (shownLanguage) {
      document.documentElement.lang =
        shownLanguage.resource["language.code"] ?? shownLanguage.languageId;
      persistLanguageId(shownLanguage.languageId);
    }
  }, [shownLanguage]);

  const t = useCallback<Translate>(
    (key: TranslationKey, params) => interpolate(shownLanguage?.resource[key] ?? key, params),
    [shownLanguage],
  );

  const value = useMemo<I18nContextValue | null>(
    () =>
      shownLanguage && {
        availableLanguages,
        languageId: shownLanguage.languageId,
        setLanguage: setRequestedLanguageId,
        t,
      },
    [shownLanguage, t],
  );

  return value ? <I18nContext.Provider value={value}>{children}</I18nContext.Provider> : null;
}

export function useI18n() {
  const value = useContext(I18nContext);

  if (!value) {
    throw new Error("useI18n must be used inside I18nProvider.");
  }

  return value;
}
