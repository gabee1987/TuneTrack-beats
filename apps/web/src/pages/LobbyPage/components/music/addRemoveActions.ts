import type { SelectionAction } from "../../../../features/ui/primitives";

type Translate = (key: string, params?: Record<string, string | number>) => string;

interface AddRemoveCounts {
  addCount: number;
  disabled?: boolean | undefined;
  onAdd: () => void;
  onRemove: () => void;
  removeCount: number;
}

/** "Add N" for the selected songs not in the deck yet, "Remove N" for those already in it. */
export function getAddRemoveActions(
  { addCount, disabled, onAdd, onRemove, removeCount }: AddRemoveCounts,
  t: Translate,
): SelectionAction[] {
  const actions: SelectionAction[] = [];
  if (addCount > 0) {
    actions.push({
      disabled,
      label: t("lobby.spotify.builder.addSelected", { count: addCount }),
      onClick: onAdd,
    });
  }
  if (removeCount > 0) {
    actions.push({
      disabled,
      label: t("lobby.spotify.builder.removeSelected", { count: removeCount }),
      onClick: onRemove,
      variant: "danger",
    });
  }
  return actions;
}
