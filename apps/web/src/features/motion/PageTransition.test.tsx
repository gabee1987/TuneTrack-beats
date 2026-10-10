import { render, screen, waitFor } from "@testing-library/react";
import { m, MotionGlobalConfig, useIsPresent } from "framer-motion";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MotionPresence } from "./MotionPresence";
import { PageTransition } from "./PageTransition";

/** Re-renders when its page starts to exit and only then mounts a motion element (B18). */
function PageThatChangesWhileExiting() {
  const isPresent = useIsPresent();

  return (
    <>
      <p>old page</p>
      {isPresent ? null : <m.span exit={{ opacity: 0 }}>late status</m.span>}
    </>
  );
}

function Pages({ page }: { page: "old" | "new" }) {
  return (
    <MotionPresence mode="sync">
      <PageTransition direction={1} key={page}>
        {page === "old" ? <PageThatChangesWhileExiting /> : <p>new page</p>}
      </PageTransition>
    </MotionPresence>
  );
}

describe("PageTransition", () => {
  beforeAll(() => {
    MotionGlobalConfig.skipAnimations = true;
  });

  afterAll(() => {
    MotionGlobalConfig.skipAnimations = false;
  });

  it("removes the old page once its own exit ends, even if it mounted motion while exiting", async () => {
    const { rerender } = render(<Pages page="old" />);

    rerender(<Pages page="new" />);

    expect(screen.getByText("new page")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("old page")).not.toBeInTheDocument());
  });

  it("still tells the exiting page that it is leaving", () => {
    const { rerender } = render(<Pages page="old" />);

    rerender(<Pages page="new" />);

    expect(screen.queryByText("late status")).not.toBeNull();
  });
});
