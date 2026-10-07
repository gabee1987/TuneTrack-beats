import { SERVER_ERROR_CODES } from "@tunetrack/shared/client";
import { describe, expect, it } from "vitest";
import { loadLanguageResource } from "./languages";
import { getServerErrorTranslationKey } from "./localizedErrors";

describe("getServerErrorTranslationKey", () => {
  it.each(SERVER_ERROR_CODES)("%s has an en and a hu catalogue entry", async (code) => {
    const key = getServerErrorTranslationKey(code);

    expect((await loadLanguageResource("en"))[key]).toBeTruthy();
    expect((await loadLanguageResource("hu"))[key]).toBeTruthy();
  });

  it("falls back to the generic message for a code the client does not know", () => {
    expect(getServerErrorTranslationKey("SOME_FUTURE_CODE")).toBe(
      "error.server.GENERIC_ROOM_ACTION_FAILED",
    );
  });
});
