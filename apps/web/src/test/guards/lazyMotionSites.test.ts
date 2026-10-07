import { describe, expect, it } from "vitest";
import { listTypeScriptSources } from "./cssSourceFiles";

/**
 * The framer-motion animation runtime is loaded lazily (05 D1): components use `m`, the app
 * root loads `domAnimation`, and only the Game and Lobby routes add `domMax` through
 * `MotionLayoutFeatures`. One `motion` import or one feature import on the eager path puts the
 * whole runtime back into the first download.
 */
const FRAMER_VALUE_IMPORT = /^import \{([^}]*)\} from "framer-motion";$/gm;
const FEATURE_OWNERS = [
  "features/motion/MotionFeatureProvider.tsx",
  "features/motion/MotionLayoutFeatures.tsx",
  "features/motion/domAnimationFeatures.ts",
];
const LAYOUT_OR_DRAG_PROP = /\s(layout|layoutId|drag)=["{]/;
const ROUTES_WITH_LAYOUT_FEATURES = ["pages/GamePage/", "pages/LobbyPage/"];

function importedFramerValues(contents: string): string[] {
  return [...contents.matchAll(FRAMER_VALUE_IMPORT)].flatMap((match) =>
    (match[1] ?? "")
      .split(",")
      .map((name) => name.trim())
      .filter((name) => name && !name.startsWith("type ")),
  );
}

describe("lazy framer-motion sites", () => {
  const sources = listTypeScriptSources();

  it("renders m components, never motion", () => {
    const offenders = sources
      .filter((file) => importedFramerValues(file.contents).includes("motion"))
      .map((file) => file.path);

    expect(offenders, "Import `m` from framer-motion; `motion` loads every feature.").toEqual([]);
  });

  it("imports feature bundles and LazyMotion only in features/motion", () => {
    const offenders = sources
      .filter((file) =>
        importedFramerValues(file.contents).some((name) =>
          ["LazyMotion", "domAnimation", "domMax"].includes(name),
        ),
      )
      .map((file) => file.path)
      .filter((path) => !FEATURE_OWNERS.includes(path));

    expect(offenders).toEqual([]);
  });

  it("keeps MotionLayoutFeatures out of the eager motion barrel", () => {
    const barrel = sources.find((file) => file.path === "features/motion/index.ts");

    expect(barrel?.contents).not.toContain("MotionLayoutFeatures");
  });

  it("uses layout and drag only inside routes that load the layout features", () => {
    const offenders = sources
      .filter((file) => LAYOUT_OR_DRAG_PROP.test(file.contents))
      .map((file) => file.path)
      .filter((path) => !ROUTES_WITH_LAYOUT_FEATURES.some((route) => path.startsWith(route)));

    expect(offenders, "Wrap the subtree in MotionLayoutFeatures and list it here.").toEqual([]);
  });

  it("loads the layout features in each of those routes", () => {
    for (const routeFile of ["pages/GamePage/GamePage.tsx", "pages/LobbyPage/LobbyPage.tsx"]) {
      const route = sources.find((file) => file.path === routeFile);

      expect(route?.contents, routeFile).toContain("<MotionLayoutFeatures>");
    }
  });
});
