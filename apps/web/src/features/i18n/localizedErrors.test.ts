import { SERVER_ERROR_CODES } from "@tunetrack/shared";
import { describe, expect, it } from "vitest";
import { languageResources } from "./languages";
import { getServerErrorTranslationKey } from "./localizedErrors";

describe("getServerErrorTranslationKey", () => {
  it.each(SERVER_ERROR_CODES)("%s has an en and a hu catalogue entry", (code) => {
    const key = getServerErrorTranslationKey(code);

    expect(languageResources.en[key]).toBeTruthy();
    expect(languageResources.hu[key]).toBeTruthy();
  });

  it("falls back to the generic message for a code the client does not know", () => {
    expect(getServerErrorTranslationKey("SOME_FUTURE_CODE")).toBe(
      "error.server.GENERIC_ROOM_ACTION_FAILED",
    );
  });
});
