import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The test setup preloads every catalogue; a fresh module graph shows the real loading path.
async function importFreshI18n() {
  vi.resetModules();
  return import("./I18nProvider");
}

describe("I18nProvider", () => {
  beforeEach(() => {
    window.localStorage.setItem("tunetrack.language", "en");
  });

  it("renders nothing until the catalogue has loaded, so no key is ever painted", async () => {
    const { I18nProvider, useI18n } = await importFreshI18n();

    function Title() {
      return <h1>{useI18n().t("common.cancel")}</h1>;
    }

    const { container } = render(
      <I18nProvider>
        <Title />
      </I18nProvider>,
    );

    expect(container).toBeEmptyDOMElement();
    expect(await screen.findByRole("heading")).not.toHaveTextContent("common.cancel");
  });

  it("switches language once the next catalogue arrives and remembers the choice", async () => {
    const { I18nProvider, useI18n } = await importFreshI18n();
    let setLanguage: ((languageId: "en" | "hu") => void) | null = null;

    function Probe() {
      const i18n = useI18n();
      setLanguage = i18n.setLanguage;
      return <p data-testid="language">{i18n.t("language.nativeName")}</p>;
    }

    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );

    expect(await screen.findByTestId("language")).toHaveTextContent("English");

    act(() => setLanguage?.("hu"));

    expect(screen.getByTestId("language")).toHaveTextContent("English");
    expect(await screen.findByText("Magyar")).toBeInTheDocument();
    expect(window.localStorage.getItem("tunetrack.language")).toBe("hu");
    expect(document.documentElement.lang).toBe("hu");
  });
});
