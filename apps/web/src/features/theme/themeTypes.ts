import type { SemanticColorTokens } from "./darkThemeTokens";

export type ThemeCssVariables = SemanticColorTokens;

export interface ThemeDefinition {
  cssVariables: SemanticColorTokens;
  gameCardGradients: string[];
  gameCardPreviewOverlay: string;
  gameCardPreviewHighlight: string;
}
