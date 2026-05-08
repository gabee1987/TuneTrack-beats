import pino from "pino";
import { env } from "./env.js";

export const logger = pino({
  level: env.LOG_LEVEL ?? (env.NODE_ENV === "development" ? "debug" : "info"),
  base: {
    service: "tunetrack-server",
    ...(env.TEST_RUN_ID ? { testRunId: env.TEST_RUN_ID } : {}),
  },
  ...(env.NODE_ENV === "development"
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            singleLine: true,
          },
        },
      }
    : {}),
});
