import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../test/renderWithProviders";
import {
  Avatar,
  Button,
  Card,
  Chip,
  ChipButton,
  Dialog,
  EmptyState,
  IconButton,
  ListRow,
  ListRowButton,
  SegmentedControl,
  Skeleton,
} from "./index";

const { triggerPressHapticMock } = vi.hoisted(() => ({ triggerPressHapticMock: vi.fn() }));

vi.mock("../../../services/haptics/triggerPressHaptic", () => ({
  triggerPressHaptic: triggerPressHapticMock,
}));

afterEach(() => {
  triggerPressHapticMock.mockReset();
});

describe("Avatar", () => {
  it("shows the image under its alt text", () => {
    renderWithProviders(<Avatar alt="Player One" src="https://images.example.test/avatar.png" />);

    expect(screen.getByRole("img", { name: "Player One" })).toBeInTheDocument();
  });

  it.each([
    ["po", "PO"],
    ["  player one ", "PL"],
    [undefined, "?"],
  ])("shows initials %j as %s and hides them from assistive technology", (initials, shown) => {
    const { container } = renderWithProviders(<Avatar initials={initials} />);

    expect(screen.getByText(shown)).toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});

describe("Button", () => {
  it("is a non-submitting button that reports clicks", async () => {
    const onClick = vi.fn();
    renderWithProviders(<Button onClick={onClick}>Start Game</Button>);

    const button = screen.getByRole("button", { name: "Start Game" });
    await userEvent.click(button);

    expect(button).toHaveAttribute("type", "button");
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(triggerPressHapticMock).not.toHaveBeenCalled();
  });

  it("buzzes on press only when asked to", async () => {
    renderWithProviders(<Button haptic>Start Game</Button>);

    await userEvent.click(screen.getByRole("button", { name: "Start Game" }));

    expect(triggerPressHapticMock).toHaveBeenCalledTimes(1);
  });

  it("neither buzzes nor reports a click while disabled", async () => {
    const onClick = vi.fn();
    renderWithProviders(
      <Button disabled haptic onClick={onClick}>
        Start Game
      </Button>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Start Game" }));

    expect(onClick).not.toHaveBeenCalled();
    expect(triggerPressHapticMock).not.toHaveBeenCalled();
  });
});

describe("Card", () => {
  it("renders as the element it is given and keeps its accessible name", () => {
    renderWithProviders(
      <Card aria-label="Room settings" as="article">
        Content
      </Card>,
    );

    expect(screen.getByRole("article", { name: "Room settings" })).toHaveTextContent("Content");
  });
});

describe("Chip", () => {
  it("is plain text, while ChipButton is a toggle that reports its state", async () => {
    const onClick = vi.fn();
    renderWithProviders(
      <>
        <Chip>Host</Chip>
        <ChipButton onClick={onClick} selected>
          80s
        </ChipButton>
      </>,
    );

    expect(screen.queryByRole("button", { name: "Host" })).not.toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: "80s", pressed: true });
    await userEvent.click(toggle);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("Dialog", () => {
  function DialogHarness({ onClose = () => undefined }: { onClose?: () => void }) {
    return (
      <Dialog
        actions={<button type="button">Confirm</button>}
        closeLabel="Close dialog"
        isOpen
        onClose={onClose}
        title="Leave the room?"
      >
        <p>Your timeline is kept.</p>
      </Dialog>
    );
  }

  it("is a dialog named by its title with its body and actions", () => {
    renderWithProviders(<DialogHarness />, { withRouter: false });

    const dialog = screen.getByRole("dialog", { name: "Leave the room?" });
    expect(dialog).toHaveTextContent("Your timeline is kept.");
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
  });

  it("asks to close from its close button", async () => {
    const onClose = vi.fn();
    renderWithProviders(<DialogHarness onClose={onClose} />, { withRouter: false });

    await userEvent.click(screen.getByRole("button", { name: "Close dialog" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("asks to close on Escape", () => {
    const onClose = vi.fn();
    renderWithProviders(<DialogHarness onClose={onClose} />, { withRouter: false });

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("EmptyState", () => {
  it("always shows its title as a heading and only the optional parts it is given", () => {
    const { rerender } = renderWithProviders(<EmptyState title="No playlists yet" />);

    expect(screen.getByRole("heading", { name: "No playlists yet" })).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    rerender(
      <EmptyState
        action={<button type="button">Import</button>}
        description="Import one from Spotify."
        title="No playlists yet"
      />,
    );

    expect(screen.getByText("Import one from Spotify.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import" })).toBeInTheDocument();
  });
});

describe("IconButton", () => {
  it("is named by its label, not by its icon", async () => {
    const onClick = vi.fn();
    renderWithProviders(
      <IconButton aria-label="Open menu" onClick={onClick}>
        <svg aria-hidden="true" />
      </IconButton>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("ListRow", () => {
  it("shows title, subtitle, leading and trailing content; the button variant is pressable", async () => {
    const onClick = vi.fn();
    renderWithProviders(
      <>
        <ListRow leading="1" subtitle="Test Artist" title="Test Song" trailing="1985" />
        <ListRowButton onClick={onClick} title="Test Playlist" />
      </>,
    );

    expect(screen.getByText("Test Song")).toBeInTheDocument();
    expect(screen.getByText("Test Artist")).toBeInTheDocument();
    expect(screen.getByText("1985")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Test Playlist" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("SegmentedControl", () => {
  const options = [
    { label: "Host only", value: "host_only" },
    { label: "Host or player", value: "host_or_active_player" },
    { disabled: true, label: "Anyone", value: "anyone" },
  ] as const;

  it("is a named radio group that marks the selected option", () => {
    renderWithProviders(
      <SegmentedControl
        aria-label="Reveal confirmation"
        onChange={() => undefined}
        options={options}
        value="host_only"
      />,
    );

    expect(screen.getByRole("radiogroup", { name: "Reveal confirmation" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Host only" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Host or player" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("reports the chosen value and ignores a disabled option", async () => {
    const onChange = vi.fn();
    renderWithProviders(
      <SegmentedControl
        aria-label="Reveal confirmation"
        onChange={onChange}
        options={options}
        value="host_only"
      />,
    );

    await userEvent.click(screen.getByRole("radio", { name: "Host or player" }));
    await userEvent.click(screen.getByRole("radio", { name: "Anyone" }));

    expect(onChange.mock.calls).toEqual([["host_or_active_player"]]);
  });
});

describe("Skeleton", () => {
  it("is hidden from assistive technology", () => {
    const { container } = renderWithProviders(<Skeleton />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("makes a circle as tall as it is wide and a text line full width", () => {
    const { container, rerender } = renderWithProviders(<Skeleton variant="circle" width={40} />);
    expect(container.firstElementChild).toHaveStyle({ width: "40px", height: "40px" });

    rerender(<Skeleton variant="text" />);
    expect(container.firstElementChild).toHaveStyle({ width: "100%" });
  });
});
