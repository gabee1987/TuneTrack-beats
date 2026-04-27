export type GamePageToastType = "info" | "error" | "success";

export interface GamePageToast {
  id: string;
  type: GamePageToastType;
  message: string;
}

export const TOAST_DURATIONS_MS: Record<GamePageToastType, number> = {
  info: 3000,
  error: 6000,
  success: 3000,
};
