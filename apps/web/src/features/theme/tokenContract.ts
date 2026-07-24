/**
 * Public location for the design-system token contracts.
 *
 * Semantic color tokens: the dark theme is canonical — every other theme must
 * define exactly the same keys (`SemanticColorTokens` enforces this at compile time).
 *
 * Component tokens: theme-agnostic; resolve to semantic vars.
 */

export type { SemanticColorTokenName, SemanticColorTokens } from "./darkThemeTokens";
export type { ComponentTokenName } from "./tokens/components";
export { componentTokenCssVariables } from "./tokens/components";
