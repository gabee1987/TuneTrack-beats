import { z } from "zod";
import { applyLocalEnvFile } from "./applyLocalEnvFile.js";

const localEnvLoadResult = applyLocalEnvFile();

if (
  process.env.NODE_ENV !== "production" &&
  process.env.NODE_ENV !== "test" &&
  process.env.VITEST !== "true" &&
  localEnvLoadResult.skippedEmptyKeys.includes("SPOTIFY_CLIENT_ID") &&
  Boolean(process.env.SPOTIFY_CLIENT_ID?.trim())
) {
  console.warn(
    "[env] SPOTIFY_CLIENT_ID is empty in apps/server/.env; using an inherited Windows/shell value. If Spotify shows \"client_id Invalid\", paste the current Client ID and Secret from https://developer.spotify.com/dashboard into apps/server/.env and restart the server.",
  );
}

const trimmedNonEmptyString = z
  .string()
  .transform((value) => value.trim())
  .pipe(z.string().min(1));

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3001),
    CLIENT_ORIGIN: z.string().url().default("http://localhost:5173"),
    SPOTIFY_CLIENT_ID: trimmedNonEmptyString,
    SPOTIFY_CLIENT_SECRET: trimmedNonEmptyString,
    SPOTIFY_REDIRECT_URI: z
      .string()
      .transform((value) => value.trim())
      .pipe(
        z
          .string()
          .min(1)
          .superRefine((value, ctx) => {
            const uris = value
              .split(",")
              .map((entry) => entry.trim())
              .filter((entry) => entry.length > 0);

            if (uris.length === 0) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Must include at least one redirect URI",
              });
              return;
            }

            for (const uri of uris) {
              if (!URL.canParse(uri)) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: `Invalid redirect URI: ${uri}`,
                });
              }
            }
          }),
      ),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).optional(),
    ENABLE_EVENT_AUDIT: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    EVENT_AUDIT_INCLUDE_PAYLOADS: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    TEST_RUN_ID: z.string().trim().min(1).optional(),
    AXIOM_TOKEN: z.string().trim().min(1).optional(),
    AXIOM_DATASET: z.string().trim().min(1).optional(),
    AXIOM_DOMAIN: z.string().url().default("https://us-east-1.aws.edge.axiom.co"),
  })
  .superRefine((value, ctx) => {
    if (Boolean(value.AXIOM_TOKEN) === Boolean(value.AXIOM_DATASET)) return;

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "AXIOM_TOKEN and AXIOM_DATASET must be configured together.",
      path: value.AXIOM_TOKEN ? ["AXIOM_DATASET"] : ["AXIOM_TOKEN"],
    });
  });

function formatEnvValidationError(error: z.ZodError): string {
  const issuePaths = error.issues.map((issue) => issue.path.join(".") || "(root)");
  const spotifyIssue = error.issues.some((issue) =>
    String(issue.path[0] ?? "").startsWith("SPOTIFY_"),
  );

  const lines = [
    "Invalid server environment configuration.",
    ...error.issues.map((issue) => `- ${issue.path.join(".") || "(root)"}: ${issue.message}`),
  ];

  if (spotifyIssue) {
    lines.push(
      "",
      "Spotify setup:",
      "1. Open https://developer.spotify.com/dashboard and select (or create) your app.",
      "2. Copy Client ID and Client Secret into apps/server/.env (non-empty values override Windows env vars).",
      "3. Add Redirect URIs in the Spotify app settings (exact match), comma-separated in .env:",
      "   http://127.0.0.1:3001/api/spotify/callback,https://127.0.0.1:5173/api/spotify/callback,https://YOUR-LAN-IP:5173/api/spotify/callback",
      "   Spotify no longer allows `localhost` (use 127.0.0.1). Phone/LAN login uses the Vite HTTPS callback.",
      "4. Restart the server after saving .env.",
      "",
      `Checked keys: ${issuePaths.join(", ")}`,
    );
  }

  return lines.join("\n");
}

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  throw new Error(formatEnvValidationError(parsedEnv.error));
}

export const env = parsedEnv.data;
