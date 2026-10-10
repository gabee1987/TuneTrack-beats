import { readdirSync } from "node:fs";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

// Architecture boundaries: 03 §4 with the 06 §8 correction. ESLint applies only the last
// matching options of a rule, so every web layer below repeats the rules shared by the whole
// app instead of adding to them.
const WEB = "apps/web/src";
const WEB_TESTS = [`${WEB}/test/**`, `${WEB}/**/*.test.{ts,tsx}`];
const WEB_PAGES = readdirSync(new URL(`./${WEB}/pages`, import.meta.url), {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const WEB_RESTRICTED_PATHS = [
  // Zod is server-side payload validation; in the browser it is 12.6 kB of dead weight (05 D2).
  { name: "zod", message: "Payload schemas run on the server only." },
  {
    name: "@tunetrack/shared",
    message: "Import from @tunetrack/shared/client; the barrel includes the Zod schemas.",
  },
];
const WEB_RESTRICTED_PATTERNS = [
  {
    regex: "^@tunetrack/shared/dist",
    message: "Import the package entry, never its build output.",
  },
];

function webImportBoundary({ paths = [], patterns = [] } = {}) {
  return [
    "error",
    {
      paths: [...WEB_RESTRICTED_PATHS, ...paths],
      patterns: [...WEB_RESTRICTED_PATTERNS, ...patterns],
    },
  ];
}

const NO_PAGE_IMPORTS = {
  regex: "(^|/)pages/",
  message: "Pages assemble features; a feature never imports a page.",
};

// Existing exceptions; these lists may only shrink.
const SERVICES_LAYER_ALLOWLIST = [
  `${WEB}/services/haptics/triggerPressHaptic.ts`,
  `${WEB}/services/socket/connectionState.ts`,
];
const FRAMER_MOTION_ALLOWLIST = [
  "features/app-shell/components/AppShellMenuSheet.tsx",
  "features/hints/HintBubble.tsx",
  "features/overlay/Overlay.tsx",
  "features/overlay/PanelView.tsx",
  "features/rooms/ConnectionBanner.tsx",
  "features/toast/AppToastStack.tsx",
  "pages/GamePage/components/ActionDock.tsx",
  "pages/GamePage/components/ChallengeActionPanel.tsx",
  "pages/GamePage/components/GamePageActionPanels.tsx",
  "pages/GamePage/components/GamePageToastStack.tsx",
  "pages/GamePage/components/HeaderLeadersStrip.tsx",
  "pages/GamePage/components/PreviewCard.tsx",
  "pages/GamePage/components/TimelinePanelFlyAnimation.tsx",
  "pages/GamePage/components/TimelinePanelHeader.tsx",
  "pages/GamePage/components/TurnActionDock.tsx",
  "pages/GamePage/desktop/GamePageDesktop.tsx",
  "pages/GamePage/gameMenu/GameMenuPlayerItem.tsx",
  "pages/GamePage/gameMenu/TokenAdjustButtons.tsx",
  "pages/GamePage/hooks/transitions/usePreviewCardTransition.ts",
  "pages/GamePage/hooks/useLeaveGameGuard.ts",
  "pages/GamePage/mobile/GamePageMobile.tsx",
  "pages/LobbyPage/components/LobbyHostTtSettings.tsx",
  "pages/LobbyPage/components/PlaylistTrackList.tsx",
  "pages/LobbyPage/components/PlaylistTrackRow.tsx",
  "pages/LobbyPage/components/spotify/SpotifyCandidateReviewPanel.tsx",
  "pages/LobbyPage/components/spotify/SpotifyOpenedPlaylistPanel.tsx",
  "pages/LobbyPage/components/spotify/SpotifyOpenedTrackRow.tsx",
  "pages/LobbyPage/components/spotify/SpotifyPlaylistSearchPanel.tsx",
  "pages/LobbyPage/components/spotify/SpotifySmartSearchResultRow.tsx",
].map((path) => `${WEB}/${path}`);
const FRAMER_MOTION_OWNERS = [
  `${WEB}/features/motion/**`,
  `${WEB}/**/*{Transition,Celebration,Portal,Presence}.tsx`,
  ...FRAMER_MOTION_ALLOWLIST,
];
const STORAGE_OWNERS = [
  `${WEB}/app/lazyRoute.ts`,
  `${WEB}/features/hints/hintState.ts`,
  `${WEB}/features/i18n/languages/index.ts`,
  `${WEB}/services/savedPlaylists/**`,
  `${WEB}/services/session/**`,
  `${WEB}/services/storage/**`,
];
const HAPTICS_OWNER = `${WEB}/services/haptics/**`;

const NO_FRAMER_MOTION = {
  name: "framer-motion",
  message: "Animate through features/motion (plan 10 Phase 1).",
};
const NO_DIRECT_SOCKET_CLIENT = {
  regex: "(^|/)socket/socketClient$",
  message: "Components emit through emitAction or a page hook.",
};
const NO_VIBRATE = {
  selector: "MemberExpression[object.name='navigator'][property.name='vibrate']",
  message: "Vibrate through services/haptics.",
};
const NO_BROWSER_STORAGE = {
  selector: "Identifier[name=/^(localStorage|sessionStorage)$/]",
  message: "Persist through services/storage or the owning store.",
};

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/build/**", "**/coverage/**", "**/node_modules/**"],
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },

  {
    files: ["packages/game-engine/src/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "^(socket\\.io|express|pino|zod)([/-]|$)|^node:",
              message:
                "The engine holds pure rules: no transport, logging, validation or Node APIs.",
            },
            {
              regex: "^@tunetrack/shared(?!/constants$)",
              message: "Only the dependency-free @tunetrack/shared/constants.",
            },
          ],
        },
      ],
      "no-restricted-properties": [
        "error",
        { object: "process", property: "env", message: "The caller passes settings in." },
      ],
    },
  },
  {
    files: ["packages/shared/src/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "(^|/)apps/|^@tunetrack/(game-engine|server|web)",
              message: "Shared contracts depend on nothing but Zod.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/server/src/realtime/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "^(\\.\\./)+(spotify|decks|http)/",
              message: "Handlers reach Spotify and decks through RoomServices.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/server/src/rooms/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "express", message: "HTTP belongs to http/." },
            {
              name: "socket.io",
              allowTypeImports: true,
              message: "Rooms announce through RoomEvents; realtime/ owns the sockets.",
            },
          ],
          patterns: [
            {
              regex: "^(\\.\\./)+(realtime|http|spotify)/",
              message:
                "Rooms announce through RoomEvents; they import no transport or Spotify code.",
            },
          ],
        },
      ],
    },
  },

  {
    files: [`${WEB}/**/*.{ts,tsx}`, "apps/web/*.ts"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      "no-restricted-imports": webImportBoundary(),
      "react-hooks/rules-of-hooks": "error",
      // Counted by --max-warnings in the web lint script; the number may only fall.
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    files: [`${WEB}/features/**/*.{ts,tsx}`],
    rules: { "no-restricted-imports": webImportBoundary({ patterns: [NO_PAGE_IMPORTS] }) },
  },
  {
    files: [`${WEB}/services/**/*.{ts,tsx}`],
    ignores: SERVICES_LAYER_ALLOWLIST,
    rules: {
      "no-restricted-imports": webImportBoundary({
        paths: [
          { name: "react", message: "Services are framework-free browser integrations." },
          { name: "react-dom", message: "Services are framework-free browser integrations." },
        ],
        patterns: [
          { regex: "\\.module\\.css$", message: "Services render nothing." },
          {
            regex: "(^|/)(pages|features)/",
            message: "Services sit below features and pages; they never import them.",
          },
        ],
      }),
    },
  },
  ...WEB_PAGES.flatMap((page) => {
    const otherPage = {
      regex: `(^|/)(?!${page}/)[A-Z]\\w*Page/`,
      message: `${page} imports only its own files; share through features/ or hooks/.`,
    };
    const otherAssembly = (assembly) => ({
      regex: `(^|/)${assembly}/`,
      message: "Mobile and desktop are separate assemblies; share through hooks/ or components/.",
    });

    return [
      {
        files: [`${WEB}/pages/${page}/**/*.{ts,tsx}`],
        rules: { "no-restricted-imports": webImportBoundary({ patterns: [otherPage] }) },
      },
      {
        files: [`${WEB}/pages/${page}/mobile/**/*.{ts,tsx}`],
        rules: {
          "no-restricted-imports": webImportBoundary({
            patterns: [otherPage, otherAssembly("desktop")],
          }),
        },
      },
      {
        files: [`${WEB}/pages/${page}/desktop/**/*.{ts,tsx}`],
        rules: {
          "no-restricted-imports": webImportBoundary({
            patterns: [otherPage, otherAssembly("mobile")],
          }),
        },
      },
    ];
  }),
  // A second import rule, so these cross-cutting restrictions overlap the layer rules above.
  {
    files: [`${WEB}/**/*.ts`],
    ignores: FRAMER_MOTION_OWNERS,
    rules: {
      "@typescript-eslint/no-restricted-imports": ["error", { paths: [NO_FRAMER_MOTION] }],
    },
  },
  {
    files: [`${WEB}/**/*.tsx`],
    ignores: FRAMER_MOTION_OWNERS,
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        { paths: [NO_FRAMER_MOTION], patterns: [NO_DIRECT_SOCKET_CLIENT] },
      ],
    },
  },
  {
    files: FRAMER_MOTION_OWNERS.filter((glob) => glob.endsWith(".tsx")),
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        { patterns: [NO_DIRECT_SOCKET_CLIENT] },
      ],
    },
  },
  {
    files: [`${WEB}/**/*.{ts,tsx}`],
    rules: { "no-restricted-syntax": ["error", NO_VIBRATE, NO_BROWSER_STORAGE] },
  },
  {
    files: STORAGE_OWNERS,
    rules: { "no-restricted-syntax": ["error", NO_VIBRATE] },
  },
  {
    files: [HAPTICS_OWNER],
    rules: { "no-restricted-syntax": ["error", NO_BROWSER_STORAGE] },
  },
  {
    files: WEB_TESTS,
    rules: {
      "no-restricted-imports": webImportBoundary(),
      "@typescript-eslint/no-restricted-imports": "off",
      "no-restricted-syntax": "off",
    },
  },
);
