export type AppToastType = "info" | "error" | "success";

/** One button on the toast, such as Undo; the toast closes once it is pressed. */
export interface AppToastAction {
  label: string;
  onAction: () => void;
}

export interface AppToast {
  action?: AppToastAction | undefined;
  id: string;
  message: string;
  type: AppToastType;
}

export interface ShowAppToastOptions {
  action?: AppToastAction;
  durationMs?: number;
  id?: string;
  message: string;
  type: AppToastType;
}
