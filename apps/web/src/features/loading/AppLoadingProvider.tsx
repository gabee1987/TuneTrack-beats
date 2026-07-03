import {
  createContext,
  type MutableRefObject,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppLoadingOverlay } from "./AppLoadingOverlay";
import type { AppLoadingRequest, AppLoadingState } from "./AppLoading.types";

interface AppLoadingContextValue {
  hideLoading: (id: string) => void;
  showLoading: (request: AppLoadingRequest) => string;
}

const AppLoadingContext = createContext<AppLoadingContextValue | null>(null);
const LOADING_REQUEST_TIMEOUT_MS = 120_000;

export function AppLoadingProvider({ children }: { children: ReactNode }) {
  const idRef = useRef(0);
  const timersRef = useRef<Map<string, number>>(new Map());
  const [loadingRequests, setLoadingRequests] = useState<AppLoadingState[]>([]);
  const activeLoading = loadingRequests.at(-1) ?? null;

  const hideLoading = useCallback((id: string) => {
    setLoadingRequests((current) => current.filter((request) => request.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const showLoading = useCallback(
    (request: AppLoadingRequest) => {
      const id = request.id ?? createLoadingId(idRef);
      const currentTimer = timersRef.current.get(id);
      if (currentTimer) window.clearTimeout(currentTimer);

      setLoadingRequests((current) => {
        const nextRequest: AppLoadingState = {
          id,
          title: request.title,
          ...(request.message ? { message: request.message } : {}),
        };

        if (!current.some((item) => item.id === id)) return [...current, nextRequest];
        return current.map((item) => (item.id === id ? nextRequest : item));
      });

      const timer = window.setTimeout(() => hideLoading(id), LOADING_REQUEST_TIMEOUT_MS);
      timersRef.current.set(id, timer);
      return id;
    },
    [hideLoading],
  );

  const contextValue = useMemo(
    () => ({
      hideLoading,
      showLoading,
    }),
    [hideLoading, showLoading],
  );

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  return (
    <AppLoadingContext.Provider value={contextValue}>
      {children}
      <AppLoadingOverlay loading={activeLoading} />
    </AppLoadingContext.Provider>
  );
}

export function useAppLoading() {
  const context = useContext(AppLoadingContext);
  if (!context) {
    throw new Error("useAppLoading must be used inside AppLoadingProvider");
  }
  return context;
}

function createLoadingId(idRef: MutableRefObject<number>): string {
  idRef.current += 1;
  return `app-loading-${idRef.current}`;
}
