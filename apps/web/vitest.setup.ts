import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { installElementRects } from "./src/test/stubs/layout";
import { installMatchMedia, resetMatchMedia } from "./src/test/stubs/matchMedia";
import { installObservers } from "./src/test/stubs/observers";
import { installStorage, resetStorage } from "./src/test/stubs/storage";
import { installViewport, resetViewport } from "./src/test/stubs/viewport";
import { resetSequentialUuid } from "./src/test/stubs/crypto";

installElementRects();
installMatchMedia();
installObservers();
installStorage();
installViewport();

if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
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
