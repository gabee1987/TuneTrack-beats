import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { createCorsOriginValidator } from "./clientOrigin.js";
import { env } from "./env.js";
import { registerHealthRoutes } from "../http/healthRoutes.js";

export function createHttpServer() {
  const app = express();

  app.use(
    cors({
      origin: createCorsOriginValidator(env.CLIENT_ORIGIN, env.NODE_ENV),
    }),
  );
  app.use(express.json());

  registerHealthRoutes(app);

  const httpServer = createServer(app);

  return {
    app,
    httpServer,
  };
}
