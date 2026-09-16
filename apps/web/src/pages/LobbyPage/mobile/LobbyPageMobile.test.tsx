import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../../features/i18n";
import type { LobbyAssemblyModel } from "../hooks/buildLobbyAssemblyModel";
import { LobbyPageMobile } from "./LobbyPageMobile";

vi.mock("../components/LobbyHostCoreSettings", () => ({ LobbyHostCoreSettings: () => null }));
vi.mock("../components/LobbyHostTtSettings", () => ({ LobbyHostTtSettings: () => null }));
vi.mock("../components/spotify/LobbySpotifySection", () => ({ LobbySpotifySection: () => null }));
vi.mock("../components/LobbyPlayerList", () => ({ LobbyPlayerList: () => null }));
vi.mock("../components/LobbyRoomActions", () => ({ LobbyRoomActions: () => null }));
vi.mock("../components/LobbyRoomSettingsStatus", () => ({
  LobbyRoomSettingsStatus: () => null,
}));

function createModel(onPlayerProfileChange: (displayName: string) => Promise<boolean>) {
  return {
    shell: { errorMessage: null },
    room: {
      connectionStatus: "connected",
      currentPlayerId: "player-1",
      displayName: "Player One",
      hasStartedJoinError: false,
      isHost: false,
      players: [
        {
          id: "player-1",
          displayName: "Player One",
          isHost: false,
        },
      ],
      resolvedRoomId: "party-room",
    },
    hostSettings: {},
    players: {},
    roomActions: { isHost: false },
    identity: {
      displayName: "Player One",
      hasStartedJoinError: false,
      identityActionState: null,
      isHost: false,
      isIdentityActionPending: false,
      isStartGamePending: false,
      onPlayerProfileChange,
      onRoomRename: vi.fn(async () => true),
      onStartGame: vi.fn(),
      preloadGame: vi.fn(),
      resolvedRoomId: "party-room",
      startGameActionStatus: "idle",
    },
  } as unknown as LobbyAssemblyModel;
}

describe("LobbyPageMobile identity settings", () => {
  it("saves the player name from its own inline field", () => {
    const onPlayerProfileChange = vi.fn(async () => true);
    render(
      <MemoryRouter>
        <I18nProvider>
          <LobbyPageMobile model={createModel(onPlayerProfileChange)} />
        </I18nProvider>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByRole("textbox", { name: /player name/i }), {
      target: { value: "DJ Nova" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save player name/i }));

    expect(onPlayerProfileChange).toHaveBeenCalledWith("DJ Nova");
  });

  it("keeps room identity read-only for guests", () => {
    render(
      <MemoryRouter>
        <I18nProvider>
          <LobbyPageMobile model={createModel(vi.fn(async () => true))} />
        </I18nProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole("textbox", { name: /room name/i })).toBeDisabled();
  });

  it("renames a host room without saving the player-name field", () => {
    const onPlayerProfileChange = vi.fn(async () => true);
    const model = createModel(onPlayerProfileChange);
    model.room.isHost = true;
    model.roomActions.isHost = true;
    model.identity.isHost = true;

    render(
      <MemoryRouter>
        <I18nProvider>
          <LobbyPageMobile model={model} />
        </I18nProvider>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByRole("textbox", { name: /room name/i }), {
      target: { value: "renamed-room" },
    });
    fireEvent.click(screen.getByRole("button", { name: /apply setup/i }));

    expect(model.identity.onRoomRename).toHaveBeenCalledWith("renamed-room");
    expect(onPlayerProfileChange).not.toHaveBeenCalled();
  });
});
