import { useI18n } from "../i18n";
import { HintBubble } from "./HintBubble";
import { hintRegistry } from "./hintRegistry";
import type { HintId } from "./hintState";
import { useFirstRunHint } from "./useFirstRunHint";

interface FirstRunHintProps {
  anchor: HTMLElement | null;
  id: HintId;
  isEligible: boolean;
}

export function FirstRunHint({ anchor, id, isEligible }: FirstRunHintProps) {
  const { t } = useI18n();
  const hint = useFirstRunHint(id, isEligible && anchor !== null);
  const definition = hintRegistry[id];

  return hint.isVisible && anchor ? (
    <HintBubble
      anchor={anchor}
      body={t(definition.bodyKey)}
      dismissLabel={t("hints.dismiss")}
      onDismiss={hint.dismiss}
      title={t(definition.titleKey)}
    />
  ) : null;
}
