import {
  createContext,
  type MutableRefObject,
  type ReactNode,
  useCallback,
  useContext,
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

export function AppLoadingProvider({ children }: { children: ReactNode }) {
  const idRef = useRef(0);
  const [loadingRequests, setLoadingRequests] = useState<AppLoadingState[]>([]);
  const activeLoading = loadingRequests.at(-1) ?? null;

  const hideLoading = useCallback((id: string) => {
    setLoadingRequests((current) => current.filter((request) => request.id !== id));
  }, []);

  const showLoading = useCallback((request: AppLoadingRequest) => {
    const id = request.id ?? createLoadingId(idRef);
    setLoadingRequests((current) => {
      const nextRequest: AppLoadingState = {
        id,
        title: request.title,
        ...(request.message ? { message: request.message } : {}),
      };

      if (!current.some((item) => item.id === id)) return [...current, nextRequest];
      return current.map((item) => (item.id === id ? nextRequest : item));
    });
    return id;
  }, []);

  const contextValue = useMemo(
    () => ({
      hideLoading,
      showLoading,
    }),
    [hideLoading, showLoading],
  );

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
