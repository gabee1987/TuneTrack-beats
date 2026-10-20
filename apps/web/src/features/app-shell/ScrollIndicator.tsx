import { useEffect, useRef } from "react";
import { getScrollThumb } from "./scrollThumb";
import styles from "./ScrollIndicator.module.css";

const HIDE_AFTER_MS = 900;
const EDGE_INSET_PX = 3;

/**
 * One thin thumb over whatever box is scrolling, shown while it scrolls and faded out after a
 * pause (owner, 2026-10-16). System scrollbars took a column on desktop and could not be styled
 * on phones, so `globals.css` hides them everywhere and this draws the position instead. It
 * moves through a ref once per frame and never renders on scroll.
 */
export function ScrollIndicator() {
  const thumbRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const thumb = thumbRef.current;
    if (!thumb) return;

    let frame = 0;
    let hideTimer = 0;
    let target: Element | null = null;

    function draw() {
      frame = 0;
      if (!target || !thumb) return;
      const isPage = target === document.scrollingElement;
      const rect = isPage ? { right: window.innerWidth, top: 0 } : target.getBoundingClientRect();
      const placement = getScrollThumb({
        clientHeight: isPage ? window.innerHeight : target.clientHeight,
        scrollHeight: target.scrollHeight,
        scrollTop: target.scrollTop,
        top: rect.top,
      });
      if (!placement) return;

      thumb.style.height = `${placement.height}px`;
      thumb.style.transform = `translate3d(${rect.right - EDGE_INSET_PX}px, ${placement.top}px, 0)`;
      thumb.dataset.visible = "true";
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => {
        delete thumb.dataset.visible;
      }, HIDE_AFTER_MS);
    }

    function handleScroll(event: Event) {
      const scrolled = event.target;
      target = scrolled instanceof Element ? scrolled : document.scrollingElement;
      if (!frame) frame = window.requestAnimationFrame(draw);
    }

    document.addEventListener("scroll", handleScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener("scroll", handleScroll, { capture: true });
      window.cancelAnimationFrame(frame);
      window.clearTimeout(hideTimer);
      delete thumb.dataset.visible;
    };
  }, []);

  return <div aria-hidden="true" className={styles.thumb} ref={thumbRef} />;
}
