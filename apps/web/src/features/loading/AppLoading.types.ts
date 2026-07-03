export interface AppLoadingRequest {
  id?: string;
  message?: string;
  title: string;
}

export interface AppLoadingState {
  id: string;
  message?: string;
  title: string;
}
