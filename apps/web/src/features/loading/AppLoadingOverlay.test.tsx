import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { AppLoadingOverlay } from "./AppLoadingOverlay";

describe("AppLoadingOverlay", () => {
  it("renders nothing while nothing is loading", () => {
    renderWithProviders(<AppLoadingOverlay loading={null} />, { withRouter: false });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("is a dialog named by the loading title that announces its message", () => {
    renderWithProviders(
      <AppLoadingOverlay
        loading={{ id: "TEST_LOADING_1", title: "Joining room", message: "TEST_ROOM_1" }}
      />,
      { withRouter: false },
    );

    const dialog = screen.getByRole("dialog", { name: "Joining room" });
    expect(dialog).toHaveTextContent("TEST_ROOM_1");
    expect(screen.getByText("TEST_ROOM_1").closest("[aria-live]")).toHaveAttribute(
      "aria-live",
      "polite",
    );
  });

  it("cannot be dismissed with Escape", () => {
    renderWithProviders(
      <AppLoadingOverlay loading={{ id: "TEST_LOADING_1", title: "Loading" }} />,
      {
        withRouter: false,
      },
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.getByRole("dialog", { name: "Loading" })).toBeInTheDocument();
  });
});
