export type AppToastType = "info" | "error" | "success";

export interface AppToast {
  id: string;
  message: string;
  type: AppToastType;
}

export interface ShowAppToastOptions {
  durationMs?: number;
  id?: string;
  message: string;
  type: AppToastType;
}
