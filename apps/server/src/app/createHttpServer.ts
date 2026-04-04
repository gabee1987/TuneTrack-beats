import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { env } from "./env.js";
import { registerHealthRoutes } from "../http/healthRoutes.js";

export function createHttpServer() {
  const app = express();

  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
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
