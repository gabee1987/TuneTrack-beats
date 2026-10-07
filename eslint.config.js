import tseslint from "typescript-eslint";

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
    files: ["apps/web/**/*.{ts,tsx}"],
    rules: {
      // Zod is server-side payload validation; in the browser it is 12.6 kB of dead weight (05 D2).
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "zod", message: "Payload schemas run on the server only." },
            {
              name: "@tunetrack/shared",
              message: "Import from @tunetrack/shared/client; the barrel includes the Zod schemas.",
            },
          ],
        },
      ],
    },
  },
);
