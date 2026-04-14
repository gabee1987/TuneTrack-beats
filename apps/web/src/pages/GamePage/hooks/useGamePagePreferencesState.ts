import { useUiPreferencesStore } from "../../../features/preferences/uiPreferences";

interface UseGamePagePreferencesStateResult {
  hiddenCardMode: ReturnType<
    typeof useUiPreferencesStore.getState
  >["hiddenCardMode"];
  showDevAlbumInfo: boolean;
  showDevCardInfo: boolean;
  showDevGenreInfo: boolean;
  showDevYearInfo: boolean;
  showHelperLabels: boolean;
  showMiniStandings: boolean;
  showPhaseChip: boolean;
  showRoomCodeChip: boolean;
  showTimelineHints: boolean;
  showTurnNumberChip: boolean;
  theme: ReturnType<typeof useUiPreferencesStore.getState>["theme"];
  updateViewPreferences: ReturnType<
    typeof useUiPreferencesStore.getState
  >["updateViewPreferences"];
}

export function useGamePagePreferencesState(): UseGamePagePreferencesStateResult {
  const showMiniStandings = useUiPreferencesStore(
    (state) => state.view.showMiniStandings,
  );
  const updateViewPreferences = useUiPreferencesStore(
    (state) => state.updateViewPreferences,
  );
  const showRoomCodeChip = useUiPreferencesStore(
    (state) => state.view.showRoomCodeChip,
  );
  const showPhaseChip = useUiPreferencesStore(
    (state) => state.view.showPhaseChip,
  );
  const showTurnNumberChip = useUiPreferencesStore(
    (state) => state.view.showTurnNumberChip,
  );
  const showHelperLabels = useUiPreferencesStore(
    (state) => state.view.showHelperLabels,
  );
  const showTimelineHints = useUiPreferencesStore(
    (state) => state.view.showTimelineHints,
  );
  const showDevCardInfo = useUiPreferencesStore(
    (state) => state.showDevCardInfo,
  );
  const showDevYearInfo = useUiPreferencesStore(
    (state) => state.showDevYearInfo,
  );
  const showDevAlbumInfo = useUiPreferencesStore(
    (state) => state.showDevAlbumInfo,
  );
  const showDevGenreInfo = useUiPreferencesStore(
    (state) => state.showDevGenreInfo,
  );
  const hiddenCardMode = useUiPreferencesStore(
    (state) => state.hiddenCardMode,
  );
  const theme = useUiPreferencesStore((state) => state.theme);

  return {
    hiddenCardMode,
    showDevAlbumInfo,
    showDevCardInfo,
    showDevGenreInfo,
    showDevYearInfo,
    showHelperLabels,
    showMiniStandings,
    showPhaseChip,
    showRoomCodeChip,
    showTimelineHints,
    showTurnNumberChip,
    theme,
    updateViewPreferences,
  };
}
