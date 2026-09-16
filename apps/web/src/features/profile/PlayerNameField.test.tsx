import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { PlayerNameField } from "./PlayerNameField";

describe("PlayerNameField", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves a changed player name from the checkmark control", () => {
    const onSave = vi.fn();
    render(
      <I18nProvider>
        <PlayerNameField displayName="" onSave={onSave} />
      </I18nProvider>,
    );

    fireEvent.change(screen.getByRole("textbox", { name: /player name/i }), {
      target: { value: "DJ Nova" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save player name/i }));

    expect(onSave).toHaveBeenCalledWith("DJ Nova");
  });

  it("disables saving until the player name changes", () => {
    render(
      <I18nProvider>
        <PlayerNameField displayName="DJ Nova" onSave={() => undefined} />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: /save player name/i })).toBeDisabled();
  });
});
