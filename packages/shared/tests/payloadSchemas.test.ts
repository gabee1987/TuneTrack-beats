import { describe, expect, it } from "vitest";
import * as schemas from "../src/events/schemas.js";
import { gameplaySchemaCases } from "./schemaCases/gameplayCases.js";
import { lobbySchemaCases } from "./schemaCases/lobbyCases.js";
import { playlistSchemaCases } from "./schemaCases/playlistCases.js";
import type { SchemaCases } from "./schemaCases/schemaCase.js";
import { spotifySchemaCases } from "./schemaCases/spotifyCases.js";

const FAMILIES: Record<string, SchemaCases> = {
  lobby: lobbySchemaCases,
  gameplay: gameplaySchemaCases,
  playlist: playlistSchemaCases,
  spotify: spotifySchemaCases,
};

/**
 * Every client payload passes one of these schemas before a service call (`CLAUDE.md` →
 * validation at boundaries), so each documented limit is pinned on both sides of its edge
 * (`06` T8).
 */
for (const [family, cases] of Object.entries(FAMILIES)) {
  describe(`${family} payload schemas`, () => {
    for (const [name, schemaCase] of Object.entries(cases)) {
      describe(name, () => {
        it("accepts a valid payload", () => {
          expect(schemaCase.schema.safeParse(schemaCase.valid).success).toBe(true);
        });

        for (const [edge, override] of Object.entries(schemaCase.edges ?? {})) {
          it(`accepts ${edge}`, () => {
            const result = schemaCase.schema.safeParse({ ...schemaCase.valid, ...override });
            expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
          });
        }

        for (const [limit, override] of Object.entries(schemaCase.pastLimits)) {
          it(`rejects ${limit}`, () => {
            expect(schemaCase.schema.safeParse({ ...schemaCase.valid, ...override }).success).toBe(
              false,
            );
          });
        }

        if (schemaCase.defaults) {
          it("applies its defaults", () => {
            expect(schemaCase.schema.parse(schemaCase.valid)).toMatchObject(
              schemaCase.defaults ?? {},
            );
          });
        }
      });
    }
  });
}

describe("payload schema coverage", () => {
  it("has a case for every exported payload schema", () => {
    const exported = Object.keys(schemas)
      .filter((name) => name.endsWith("PayloadSchema"))
      .sort();
    const covered = Object.values(FAMILIES)
      .flatMap((cases) => Object.keys(cases))
      .sort();

    expect(covered).toEqual(exported);
  });
});
