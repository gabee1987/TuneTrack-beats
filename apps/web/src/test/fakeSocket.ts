import { vi } from "vitest";

type Listener = (...args: unknown[]) => void;

export interface EmittedEvent {
  event: string;
  payload: unknown;
  hadAck: boolean;
}

export interface FakeSocket {
  connected: boolean;
  recovered: boolean;
  id: string;

  on(event: string, listener: Listener): FakeSocket;
  off(event: string, listener?: Listener): FakeSocket;
  once(event: string, listener: Listener): FakeSocket;
  emit(event: string, ...args: unknown[]): FakeSocket;
  connect(): FakeSocket;
  disconnect(): FakeSocket;
  removeAllListeners(): FakeSocket;
  timeout(ms: number): FakeSocket;
  emitWithAck(event: string, ...args: unknown[]): Promise<unknown>;

  /** ---- test controls ---- */

  /** Everything the app has emitted, in order. */
  readonly emitted: EmittedEvent[];
  /** Emitted payloads for one event name. */
  emittedFor(event: string): unknown[];
  /** Forget the emit log without touching listeners. */
  clearEmitted(): void;
  /** Number of listeners currently registered for an event. */
  listenerCount(event: string): number;
  /** Deliver a server event to the app. */
  serverEmit(event: string, payload?: unknown): void;
  /** Complete the connect handshake. */
  simulateConnect(options?: { recovered?: boolean }): void;
  /** Drop the connection. */
  simulateDisconnect(reason?: string): void;
  /** Drop and restore, as a network blip does. */
  simulateReconnect(options?: { recovered?: boolean }): void;
  /** Resolve the next `emitWithAck` for an event with this value. */
  respondToAck(event: string, response: unknown): void;
}

export function createFakeSocket(options: { connected?: boolean } = {}): FakeSocket {
  const listeners = new Map<string, Set<Listener>>();
  const emitted: EmittedEvent[] = [];
  const ackResponses = new Map<string, unknown[]>();

  function listenersFor(event: string): Set<Listener> {
    const existing = listeners.get(event);
    if (existing) {
      return existing;
    }
    const created = new Set<Listener>();
    listeners.set(event, created);
    return created;
  }

  function deliver(event: string, ...args: unknown[]): void {
    for (const listener of [...listenersFor(event)]) {
      listener(...args);
    }
  }

  const socket: FakeSocket = {
    connected: options.connected ?? false,
    recovered: false,
    id: "TEST_SOCKET_1",

    emitted,

    on(event, listener) {
      listenersFor(event).add(listener);
      return socket;
    },

    off(event, listener) {
      if (listener) {
        listenersFor(event).delete(listener);
      } else {
        listeners.delete(event);
      }
      return socket;
    },

    once(event, listener) {
      const wrapped: Listener = (...args) => {
        listenersFor(event).delete(wrapped);
        listener(...args);
      };
      listenersFor(event).add(wrapped);
      return socket;
    },

    emit(event, ...args) {
      const hadAck = typeof args.at(-1) === "function";
      const payload = hadAck ? args.slice(0, -1)[0] : args[0];
      emitted.push({ event, payload, hadAck });

      if (hadAck) {
        const ack = args.at(-1) as Listener;
        const queued = ackResponses.get(event);
        if (queued && queued.length > 0) {
          ack(queued.shift());
        }
      }

      return socket;
    },

    connect() {
      socket.simulateConnect();
      return socket;
    },

    disconnect() {
      socket.simulateDisconnect("io client disconnect");
      return socket;
    },

    removeAllListeners() {
      listeners.clear();
      return socket;
    },

    timeout() {
      return socket;
    },

    emitWithAck(event, ...args) {
      emitted.push({ event, payload: args[0], hadAck: true });
      const queued = ackResponses.get(event);
      if (queued && queued.length > 0) {
        return Promise.resolve(queued.shift());
      }
      return new Promise(() => {
        // Left pending on purpose: an un-stubbed ack models a timeout.
      });
    },

    emittedFor(event) {
      return emitted.filter((entry) => entry.event === event).map((entry) => entry.payload);
    },

    clearEmitted() {
      emitted.length = 0;
    },

    listenerCount(event) {
      return listeners.get(event)?.size ?? 0;
    },

    serverEmit(event, payload) {
      deliver(event, payload);
    },

    simulateConnect(connectOptions = {}) {
      socket.connected = true;
      socket.recovered = connectOptions.recovered ?? false;
      deliver("connect");
    },

    simulateDisconnect(reason = "transport close") {
      socket.connected = false;
      socket.recovered = false;
      deliver("disconnect", reason);
    },

    simulateReconnect(reconnectOptions = {}) {
      socket.simulateDisconnect();
      socket.simulateConnect(reconnectOptions);
    },

    respondToAck(event, response) {
      const queued = ackResponses.get(event) ?? [];
      queued.push(response);
      ackResponses.set(event, queued);
    },
  };

  return socket;
}

export interface SocketClientMock {
  getSocketClient: ReturnType<typeof vi.fn>;
  emitWhenConnected: ReturnType<typeof vi.fn>;
  preloadSocketClient: ReturnType<typeof vi.fn>;
  disconnectSocketClient: ReturnType<typeof vi.fn>;
  resetSocketClient: ReturnType<typeof vi.fn>;
}

export function createSocketClientMock(socket: FakeSocket): SocketClientMock {
  return {
    getSocketClient: vi.fn(() => Promise.resolve(socket)),
    emitWhenConnected: vi.fn((event: string, payload: unknown) => {
      if (!socket.connected) {
        return Promise.resolve(false);
      }

      socket.emit(event, payload);
      return Promise.resolve(true);
    }),
    preloadSocketClient: vi.fn(),
    disconnectSocketClient: vi.fn(() => socket.disconnect()),
    resetSocketClient: vi.fn(() => {
      socket.removeAllListeners();
      socket.disconnect();
    }),
  };
}

let sharedSocket: FakeSocket | null = null;

/**
 * A single fake socket per test file, reachable from both the hoisted `vi.mock` factory
 * and the test body.
 *
 *     vi.mock("../../services/socket/socketClient", async () => {
 *       const { socketClientMockForSharedSocket } = await import("../../test/fakeSocket");
 *       return socketClientMockForSharedSocket();
 *     });
 *
 *     const socket = getSharedFakeSocket();
 *
 * The dynamic import inside the factory sidesteps `vi.mock` hoisting, which is why the
 * socket cannot simply be a module-level `const` in the test file.
 */
export function getSharedFakeSocket(): FakeSocket {
  if (!sharedSocket) {
    sharedSocket = createFakeSocket({ connected: true });
  }
  return sharedSocket;
}

export function socketClientMockForSharedSocket(): SocketClientMock {
  return createSocketClientMock(getSharedFakeSocket());
}

/** Clear listeners and the emit log between tests without replacing the instance. */
export function resetSharedFakeSocket(): void {
  const socket = getSharedFakeSocket();
  socket.removeAllListeners();
  socket.clearEmitted();
  socket.connected = true;
  socket.recovered = false;
}
