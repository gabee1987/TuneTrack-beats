export type ThemeCssVariables = Record<string, string>;

export interface ThemeDefinition {
  cssVariables: ThemeCssVariables;
  gameCardGradients: string[];
  gameCardPreviewOverlay: string;
  gameCardPreviewHighlight: string;
}
