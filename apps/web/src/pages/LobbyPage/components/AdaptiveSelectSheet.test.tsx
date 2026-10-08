import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  HISTORY_ROUTE_PATH,
  installRouterRequestStub,
  renderOnHistoryRoute,
} from "../../../test/renderOnHistoryRoute";
import { AdaptiveSelectSheet } from "./AdaptiveSelectSheet";

const OPTIONS = [
  { label: "Host only", value: "host_only" },
  { label: "Host or active player", value: "host_or_active_player" },
];

function SelectScreen({ onChange }: { onChange: (value: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)} type="button">
        Choose reveal mode
      </button>
      <AdaptiveSelectSheet
        isOpen={isOpen}
        label="Reveal mode"
        onChange={onChange}
        onClose={() => setIsOpen(false)}
        options={OPTIONS}
        value="host_only"
      />
    </>
  );
}

describe("AdaptiveSelectSheet", () => {
  beforeAll(installRouterRequestStub);

  it("closes on Back without leaving the lobby (plan 14 §4.3)", async () => {
    const router = renderOnHistoryRoute(<SelectScreen onChange={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Choose reveal mode" }));
    expect(await screen.findByRole("dialog", { name: "Reveal mode" })).toBeInTheDocument();

    await act(async () => {
      await router.navigate(-1);
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Reveal mode" })).not.toBeInTheDocument();
    });
    expect(router.state.location.pathname).toBe(HISTORY_ROUTE_PATH);
  });

  it("applies the picked option and closes", async () => {
    const onChange = vi.fn();
    renderOnHistoryRoute(<SelectScreen onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Choose reveal mode" }));
    await userEvent.click(await screen.findByRole("button", { name: "Host or active player" }));

    expect(onChange).toHaveBeenCalledWith("host_or_active_player");
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Reveal mode" })).not.toBeInTheDocument();
    });
  });
});
