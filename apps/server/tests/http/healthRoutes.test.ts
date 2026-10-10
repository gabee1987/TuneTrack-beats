import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { registerHealthRoutes } from "../../src/http/healthRoutes.js";

describe("health route", () => {
  it("answers 200 with the service name and nothing else", async () => {
    const app = express();
    registerHealthRoutes(app);

    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok", service: "tunetrack-server" });
  });
});
