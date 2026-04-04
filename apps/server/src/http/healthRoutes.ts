import type { Express } from "express";

export function registerHealthRoutes(app: Express): void {
  app.get("/health", (_request, response) => {
    response.status(200).json({
      status: "ok",
      service: "tunetrack-server",
    });
  });
}
