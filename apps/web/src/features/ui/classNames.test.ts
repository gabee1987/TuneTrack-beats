import { describe, expect, it } from "vitest";
import { classNames } from "./classNames";

describe("classNames", () => {
  it("joins truthy class parts and drops falsy ones", () => {
    expect(classNames("a", false, undefined, null, "b", "")).toBe("a b");
  });
});
