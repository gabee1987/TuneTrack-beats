import { render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import {
  createMemoryRouter,
  RouterProvider,
  useNavigate,
  useParams,
} from "react-router-dom";
import { beforeAll, describe, expect, it } from "vitest";
import { AppRoutes } from "./AppRoutes";

const roomIdSeenByEffect: Array<string | undefined> = [];

function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    roomIdSeenByEffect.push(roomId);
  }, [navigate, roomId]);

  return <div>room {roomId}</div>;
}

function HomePage() {
  return <div>home</div>;
}

describe("AppRoutes page transitions", () => {
  // jsdom's AbortSignal is not Node's, and @remix-run/router builds a Request for every
  // navigation. Only the routing behaviour is under test here.
  beforeAll(() => {
    class PassthroughRequest {
      constructor(readonly url: string) {}
    }
    Reflect.set(globalThis, "Request", PassthroughRequest);
  });

  /**
   * `AnimatePresence` keeps the outgoing page mounted for its exit animation. Router hooks
   * read live context, so if the exiting page re-renders it sees the *new* location. A
   * connection effect keyed on `roomId` would then re-run with the wrong room — or with no
   * room at all, which is the "redirected me home" path.
   */
  it("does not re-run an exiting page's effects against the new route", async () => {
    roomIdSeenByEffect.length = 0;

    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: <AppRoutes />,
          children: [
            { path: "game/:roomId", element: <RoomPage /> },
            { index: true, element: <HomePage /> },
          ],
        },
      ],
      { initialEntries: ["/game/TEST_ROOM_1"] },
    );

    render(<RouterProvider router={router} />);
    await screen.findByText("room TEST_ROOM_1");
    expect(roomIdSeenByEffect).toEqual(["TEST_ROOM_1"]);

    await router.navigate("/");
    await waitFor(() => expect(screen.getByText("home")).toBeTruthy());

    // The assertion is only meaningful while both pages are mounted together.
    expect(screen.queryByText("room TEST_ROOM_1")).not.toBeNull();
    expect(roomIdSeenByEffect).toEqual(["TEST_ROOM_1"]);
  });
});
