export type TranslationResource = Record<string, string>;

export function parseLanguageResource(rawResource: string): TranslationResource {
  return rawResource
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .reduce<TranslationResource>((resource, line) => {
      const separatorIndex = line.indexOf("=");

      if (separatorIndex === -1) {
        return resource;
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();

      if (key.length === 0) {
        return resource;
      }

      resource[key] = value;
      return resource;
    }, {});
}
