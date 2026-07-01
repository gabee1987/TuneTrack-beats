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
import { AppToastStack } from "./AppToastStack";
import type { AppToast, ShowAppToastOptions } from "./AppToast.types";

interface AppToastContextValue {
  showToast: (options: ShowAppToastOptions) => void;
}

const DEFAULT_TOAST_DURATION_MS = 3000;
const AppToastContext = createContext<AppToastContextValue | null>(null);

export function AppToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<AppToast[]>([]);
  const idRef = useRef(0);
  const timersRef = useRef<Map<string, number>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    ({ durationMs = DEFAULT_TOAST_DURATION_MS, id, message, type }: ShowAppToastOptions) => {
      const toastId = id ?? createToastId(idRef);
      const currentTimer = timersRef.current.get(toastId);
      if (currentTimer) window.clearTimeout(currentTimer);

      setToasts((current) => {
        const nextToast: AppToast = { id: toastId, message, type };
        if (!current.some((toast) => toast.id === toastId)) return [...current, nextToast];
        return current.map((toast) => (toast.id === toastId ? nextToast : toast));
      });

      const timer = window.setTimeout(() => removeToast(toastId), durationMs);
      timersRef.current.set(toastId, timer);
    },
    [removeToast],
  );

  const contextValue = useMemo(() => ({ showToast }), [showToast]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  return (
    <AppToastContext.Provider value={contextValue}>
      {children}
      <AppToastStack toasts={toasts} />
    </AppToastContext.Provider>
  );
}

export function useAppToast() {
  const context = useContext(AppToastContext);
  if (!context) {
    throw new Error("useAppToast must be used inside AppToastProvider");
  }
  return context;
}

function createToastId(idRef: MutableRefObject<number>): string {
  idRef.current += 1;
  return `app-toast-${idRef.current}`;
}
