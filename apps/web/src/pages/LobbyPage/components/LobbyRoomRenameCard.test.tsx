import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { LobbyRoomRenameCard } from "./LobbyRoomRenameCard";

function renderCard(onRename = vi.fn(async () => true)) {
  renderWithProviders(
    <LobbyRoomRenameCard
      actionState={null}
      isPending={false}
      onRename={onRename}
      roomId="TEST_ROOM_1"
    />,
    { layout: "desktop" },
  );
  return { onRename, input: screen.getByLabelText("Room name") };
}

describe("LobbyRoomRenameCard", () => {
  it("keeps Rename disabled until the code changes", () => {
    renderCard();

    expect(screen.getByRole("button", { name: "Rename room" })).toBeDisabled();
  });

  it("renames to the trimmed new code", async () => {
    const { onRename, input } = renderCard();

    await userEvent.clear(input);
    await userEvent.type(input, " TEST_ROOM_2 ");
    await userEvent.click(screen.getByRole("button", { name: "Rename room" }));

    expect(onRename).toHaveBeenCalledWith("TEST_ROOM_2");
  });

  it("flags a code the server would refuse and does not send it", async () => {
    const { onRename, input } = renderCard();

    await userEvent.clear(input);
    await userEvent.type(input, "test room");

    expect(screen.getByText("Use letters, numbers, dashes, or underscores.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rename room" })).toBeDisabled();
    expect(onRename).not.toHaveBeenCalled();
  });
});
