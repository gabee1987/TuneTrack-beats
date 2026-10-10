import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { availableLanguages, loadLanguageResource } from "./src/features/i18n/languages";
import { installElementRects } from "./src/test/stubs/layout";
import { installMatchMedia, resetMatchMedia } from "./src/test/stubs/matchMedia";
import { installObservers } from "./src/test/stubs/observers";
import { installStorage, resetStorage } from "./src/test/stubs/storage";
import { installViewport, resetViewport } from "./src/test/stubs/viewport";
import { resetSequentialUuid } from "./src/test/stubs/crypto";

vi.mock("framer-motion", async (importOriginal) => {
  const { withEagerMotion } = await import("./src/test/stubs/framerMotion");
  return withEagerMotion(await importOriginal<typeof import("framer-motion")>());
});

// `I18nProvider` renders only a loaded catalogue; the app loads one in `main.tsx`, tests load
// both up front so every render stays synchronous.
await Promise.all(availableLanguages.map((language) => loadLanguageResource(language.id)));

installElementRects();
installMatchMedia();
installObservers();
installStorage();
installViewport();

if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

if (typeof Element !== "undefined" && !Element.prototype.scrollTo) {
  Element.prototype.scrollTo = vi.fn();
}

// jsdom implements neither of these on HTMLMediaElement, and the free-tier playback path
// drives real event listeners off them.
if (typeof HTMLMediaElement !== "undefined") {
  HTMLMediaElement.prototype.play = vi.fn(function play(this: HTMLMediaElement) {
    this.dispatchEvent(new Event("play"));
    return Promise.resolve();
  });
  HTMLMediaElement.prototype.pause = vi.fn(function pause(this: HTMLMediaElement) {
    this.dispatchEvent(new Event("pause"));
  });
  HTMLMediaElement.prototype.load = vi.fn();
}

beforeEach(() => {
  resetSequentialUuid();
});

afterEach(() => {
  cleanup();
  resetMatchMedia();
  resetStorage();
  resetViewport();
  vi.clearAllMocks();
});
