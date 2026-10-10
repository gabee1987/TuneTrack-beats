import { expect, type Page } from "@playwright/test";

/** Mouse-driven drag; the touch-drag pair (`19` §5.4) lands after `05` C3. */
export async function moveCurrentCardAfterTimelineCard(page: Page): Promise<void> {
  const currentCard = page.getByRole("button", { name: "Hidden Until Reveal" });
  const timelineCard = page.locator("article[data-timeline-card='true']");
  const isCurrentCardAfterTimelineCard = () =>
    timelineCard.evaluate(
      (card) =>
        card.parentElement?.nextElementSibling?.querySelector(
          "[aria-label='Hidden Until Reveal']",
        ) !== null,
    );

  await expect(currentCard).toHaveCount(1);
  await expect(timelineCard).toHaveCount(1);

  const currentCardBox = await currentCard.boundingBox();
  const timelineCardBox = await timelineCard.boundingBox();
  if (!currentCardBox || !timelineCardBox) {
    throw new Error("The timeline cards must be visible before dragging.");
  }

  await page.mouse.move(
    currentCardBox.x + currentCardBox.width / 2,
    currentCardBox.y + currentCardBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    timelineCardBox.x + timelineCardBox.width - 4,
    timelineCardBox.y + timelineCardBox.height / 2,
    { steps: 10 },
  );
  await expect.poll(isCurrentCardAfterTimelineCard).toBe(true);
  await page.mouse.up();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
  await expect.poll(isCurrentCardAfterTimelineCard).toBe(true);
}
