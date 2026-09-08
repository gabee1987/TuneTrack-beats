import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "../features/i18n";
import { AppLoadingProvider } from "../features/loading";
import { AppToastProvider } from "../features/toast";
import { useMobileViewport, useDesktopViewport } from "./stubs/viewport";

export interface RenderWithProvidersOptions extends Omit<RenderOptions, "wrapper"> {
  /** Initial route for the MemoryRouter. Defaults to `/`. */
  route?: string;
  /** Sets the viewport and pointer type so `usePageLayoutMode` resolves predictably. */
  layout?: "mobile" | "desktop";
  /** Skip the router wrapper for components that must not see one. */
  withRouter?: boolean;
}

function AppProviders({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <AppLoadingProvider>
        <AppToastProvider>{children}</AppToastProvider>
      </AppLoadingProvider>
    </I18nProvider>
  );
}

/**
 * Renders a component inside the same provider stack `App.tsx` uses, so provider changes
 * are a one-file update rather than a change across every test.
 */
export function renderWithProviders(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {},
): RenderResult {
  const { route = "/", layout = "mobile", withRouter = true, ...renderOptions } = options;

  if (layout === "mobile") {
    useMobileViewport();
  } else {
    useDesktopViewport();
  }

  function Wrapper({ children }: { children: ReactNode }) {
    if (!withRouter) {
      return <AppProviders>{children}</AppProviders>;
    }

    return (
      <MemoryRouter initialEntries={[route]}>
        <AppProviders>{children}</AppProviders>
      </MemoryRouter>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}
