import { useI18n } from "../../../features/i18n";
import type { LobbyRulesSummary } from "../hooks/lobbySetupModel";
import { LobbyCardButton } from "./LobbyCardButton";

type Translate = (key: string, params?: Record<string, string | number>) => string;

interface LobbyRulesCardProps {
  /** Host only: opens the Rules sheet. Guests read the summary. */
  onEdit?: (() => void) | undefined;
  rules: LobbyRulesSummary;
}

/** The rules in one line; the host's card opens the Rules sheet. */
export function LobbyRulesCard({ onEdit, rules }: LobbyRulesCardProps) {
  const { t } = useI18n();

  return (
    <LobbyCardButton
      icon={<RulesGlyph />}
      isStatic={!onEdit}
      onClick={onEdit}
      status={getRulesSummaryText(rules, t)}
      title={t("lobby.rules.title")}
    />
  );
}

export function getRulesSummaryText(rules: LobbyRulesSummary, t: Translate): string {
  const counts = { starting: rules.starting, target: rules.target };
  if (!rules.tokens) return t("lobby.rules.summary", counts);
  if (rules.tokens.seconds === null) return t("lobby.rules.summaryTokensNoLimit", counts);
  return t("lobby.rules.summaryTokens", { ...counts, seconds: rules.tokens.seconds });
}

function RulesGlyph() {
  return (
    <svg fill="none" height="22" viewBox="0 0 24 24" width="22">
      <path
        d="M4 7H14M18 7H20M4 17H8M12 17H20M16 4V10M10 14V20"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}
