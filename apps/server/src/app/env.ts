import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:5173"),
  SPOTIFY_CLIENT_ID: z.string().min(1),
  SPOTIFY_CLIENT_SECRET: z.string().min(1),
  SPOTIFY_REDIRECT_URI: z.string().url(),
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
}).superRefine((value, ctx) => {
  if (Boolean(value.AXIOM_TOKEN) === Boolean(value.AXIOM_DATASET)) return;

  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: "AXIOM_TOKEN and AXIOM_DATASET must be configured together.",
    path: value.AXIOM_TOKEN ? ["AXIOM_DATASET"] : ["AXIOM_TOKEN"],
  });
});

export const env = envSchema.parse(process.env);
