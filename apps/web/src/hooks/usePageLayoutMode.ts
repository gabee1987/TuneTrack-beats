import { useEffect, useState } from "react";
import { useMediaQuery } from "./useMediaQuery";
import {
  resolvePageLayoutMode,
  type PageLayoutMode,
} from "../app/layout/pageLayoutMode";

function getViewportSize() {
  if (typeof window === "undefined") {
    return {
      viewportWidth: 0,
      viewportHeight: 0,
    };
  }

  return {
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  };
}

export function usePageLayoutMode(): PageLayoutMode {
  const isCoarsePointer = useMediaQuery("(pointer: coarse)");
  const [viewportSize, setViewportSize] = useState(getViewportSize);

  useEffect(() => {
    function handleResize() {
      setViewportSize(getViewportSize());
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return resolvePageLayoutMode({
    isCoarsePointer,
    viewportHeight: viewportSize.viewportHeight,
    viewportWidth: viewportSize.viewportWidth,
  });
}
