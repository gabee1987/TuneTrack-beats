import { render, screen, waitFor } from "@testing-library/react";
import { m, motion } from "framer-motion";
import { describe, expect, it, vi } from "vitest";
import { MotionFeatureProvider } from "./MotionFeatureProvider";

// The real framer-motion, not the test setup's eager stand-in.
vi.unmock("framer-motion");

describe("MotionFeatureProvider", () => {
  it("renders the initial state at once and animates when the features arrive", async () => {
    render(
      <MotionFeatureProvider>
        <m.div
          animate={{ opacity: 1 }}
          data-testid="fade"
          initial={{ opacity: 0 }}
          transition={{ duration: 0 }}
        />
      </MotionFeatureProvider>,
    );

    expect(screen.getByTestId("fade").style.opacity).toBe("0");
    await waitFor(() => expect(screen.getByTestId("fade").style.opacity).toBe("1"));
  });

  it("refuses a motion component, which would load every feature eagerly", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() =>
      render(
        <MotionFeatureProvider>
          <motion.div />
        </MotionFeatureProvider>,
      ),
    ).toThrow(/LazyMotion/);
  });
});
