import { describe, expect, it } from "vitest";
import { parseLanguageResource } from "./parseLanguageResource";

describe("parseLanguageResource", () => {
  it("skips comments and blank lines and trims keys and values", () => {
    expect(parseLanguageResource("# heading\n\n  home.title  =  Welcome  \n")).toEqual({
      "home.title": "Welcome",
    });
  });

  it("keeps an equals sign inside the value", () => {
    expect(parseLanguageResource("math.hint = 1 + 1 = 2")).toEqual({ "math.hint": "1 + 1 = 2" });
  });

  it("reads CRLF input like LF input", () => {
    expect(parseLanguageResource("a = one\r\nb = two\r\n")).toEqual({ a: "one", b: "two" });
  });

  it("ignores lines without a separator or without a key", () => {
    expect(parseLanguageResource("no separator\n = orphan value\nkey = value")).toEqual({
      key: "value",
    });
  });
});
