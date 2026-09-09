import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useI18n } from "../features/i18n";
import { usePageLayoutMode } from "../hooks/usePageLayoutMode";
import { createFakeSocket } from "./fakeSocket";
import { createFakeSpotifyPlayer, installFakeSpotifySdk } from "./fakeSpotifyPlayer";
import { renderWithProviders } from "./renderWithProviders";
import { expectedUuid } from "./stubs/crypto";
import { triggerIntersection, triggerResize } from "./stubs/observers";
import { seedLocalStorage, useThrowingStorage } from "./stubs/storage";
import { setMediaQuery } from "./stubs/matchMedia";
import { setVisualViewportHeight } from "./stubs/viewport";

function Probe() {
  const { t, languageId } = useI18n();
  const layoutMode = usePageLayoutMode();

  return (
    <div>
      <p data-testid="language">{languageId}</p>
      <p data-testid="layout">{layoutMode}</p>
      <p data-testid="translated">{t("home.primaryAction")}</p>
    </div>
  );
}

describe("test harness", () => {
  it("renders a component inside the app provider stack", () => {
    renderWithProviders(<Probe />);

    expect(screen.getByTestId("language")).toHaveTextContent("en");
    expect(screen.getByTestId("translated").textContent).not.toBe("home.primaryAction");
  });

  it("resolves the mobile layout mode by default", () => {
    renderWithProviders(<Probe />);
    expect(screen.getByTestId("layout")).toHaveTextContent("mobile");
  });

  it("resolves the desktop layout mode when asked", () => {
    renderWithProviders(<Probe />, { layout: "desktop" });
    expect(screen.getByTestId("layout")).toHaveTextContent("desktop");
  });

  it("provides a controllable matchMedia", () => {
    setMediaQuery("(prefers-reduced-motion: reduce)", true);
    expect(window.matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(true);

    setMediaQuery("(prefers-reduced-motion: reduce)", false);
    expect(window.matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(false);
  });

  it("provides in-memory storage that can be seeded", () => {
    seedLocalStorage({ "tunetrack.playerDisplayName": "Player One" });
    expect(window.localStorage.getItem("tunetrack.playerDisplayName")).toBe("Player One");
  });

  it("can make storage throw so degradation is testable", () => {
    useThrowingStorage();
    expect(() => window.localStorage.getItem("anything")).toThrow();
  });

  it("provides deterministic uuids", () => {
    expect(crypto.randomUUID()).toBe(expectedUuid(1));
    expect(crypto.randomUUID()).toBe(expectedUuid(2));
  });

  it("provides observers that can be triggered on demand", () => {
    let resizeCount = 0;
    let intersectionCount = 0;

    const resizeObserver = new ResizeObserver(() => {
      resizeCount += 1;
    });
    const intersectionObserver = new IntersectionObserver(() => {
      intersectionCount += 1;
    });

    const element = document.createElement("div");
    document.body.appendChild(element);
    resizeObserver.observe(element);
    intersectionObserver.observe(element);

    triggerResize();
    triggerIntersection(true);

    expect(resizeCount).toBe(1);
    expect(intersectionCount).toBe(1);

    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    element.remove();
  });

  it("provides a visualViewport that can shrink independently", () => {
    let resizes = 0;
    window.visualViewport?.addEventListener("resize", () => {
      resizes += 1;
    });

    setVisualViewportHeight(400);

    expect(resizes).toBe(1);
    expect(window.visualViewport?.height).toBe(400);
  });

  describe("fake socket", () => {
    it("records emits and delivers server events", () => {
      const socket = createFakeSocket();
      const received: unknown[] = [];

      socket.on("state_update", (payload) => received.push(payload));
      socket.emit("join_room", { roomId: "TEST_ROOM_1" });
      socket.serverEmit("state_update", { revision: 1 });

      expect(socket.emittedFor("join_room")).toEqual([{ roomId: "TEST_ROOM_1" }]);
      expect(received).toEqual([{ revision: 1 }]);
    });

    it("simulates a reconnect and reports whether the session was recovered", () => {
      const socket = createFakeSocket();
      const connects: boolean[] = [];

      socket.on("connect", () => connects.push(socket.recovered));
      socket.simulateConnect();
      socket.simulateReconnect({ recovered: true });

      expect(connects).toEqual([false, true]);
      expect(socket.connected).toBe(true);
    });

    it("resolves acks that a test has queued", async () => {
      const socket = createFakeSocket();
      socket.respondToAck("place_card", { ok: true });

      await expect(socket.emitWithAck("place_card", { slotIndex: 1 })).resolves.toEqual({
        ok: true,
      });
    });

    it("tracks listener counts so teardown is assertable", () => {
      const socket = createFakeSocket();
      const listener = () => undefined;

      socket.on("state_update", listener);
      expect(socket.listenerCount("state_update")).toBe(1);

      socket.off("state_update", listener);
      expect(socket.listenerCount("state_update")).toBe(0);
    });
  });

  describe("fake Spotify player", () => {
    it("delivers ready and state events to registered listeners", () => {
      const player = createFakeSpotifyPlayer();
      installFakeSpotifySdk(player);

      const readyDevices: string[] = [];
      const states: unknown[] = [];

      player.on("ready", (payload) => {
        readyDevices.push((payload as { device_id: string }).device_id);
      });
      player.on("player_state_changed", (state) => states.push(state));

      player.emitReady();
      player.emitPlaying("spotify:track:TEST0000000000000001");

      expect(readyDevices).toEqual(["TEST_DEVICE_1"]);
      expect(states).toHaveLength(1);
    });

    it("can produce both end-of-context shapes", () => {
      const player = createFakeSpotifyPlayer();
      const states: Array<{ paused: boolean; position: number; duration: number }> = [];

      player.on("player_state_changed", (state) => {
        states.push(state as { paused: boolean; position: number; duration: number });
      });

      player.emitEndedAtZero("spotify:track:TEST0000000000000001");
      player.emitEndedAtDuration("spotify:track:TEST0000000000000001");

      expect(states[0]).toMatchObject({ paused: true, position: 0 });
      expect(states[1]?.paused).toBe(true);
      expect(states[1]?.position).toBe(states[1]?.duration);
    });

    it("can block activateElement to model a missing user gesture", async () => {
      const player = createFakeSpotifyPlayer();
      player.blockActivateElement();

      await expect(player.activateElement()).rejects.toThrow();
    });
  });
});
