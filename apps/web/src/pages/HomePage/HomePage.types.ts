export interface HomePageController {
  toastMessage: string | null;
  preloadLobby: () => void;
  handleStart: () => void;
}

export interface HomePageAssemblyProps {
  controller: HomePageController;
}
