import { useState } from "react";
import { HintBubble } from "../../features/hints/HintBubble";
import { useAppLoading } from "../../features/loading";
import { useAppToast } from "../../features/toast";
import { Badge } from "../../features/ui/Badge";
import { CardCountAmount } from "../../features/ui/CardCountAmount";
import { Button } from "../../features/ui/primitives";
import { StatusBanner } from "../../features/ui/StatusBanner";
import { TokenCountAmount } from "../../features/ui/TokenCountAmount";
import { TtTokenIcon } from "../../features/ui/TtToken";
import styles from "./DesignSystemPage.module.css";

const LOADING_PREVIEW_MS = 2000;

/** Toasts, the loading overlay, banners, the hint bubble, badges and the game's counters. */
export function FeedbackGallery() {
  const { showToast } = useAppToast();
  const { hideLoading, showLoading } = useAppLoading();
  const [hintAnchor, setHintAnchor] = useState<HTMLElement | null>(null);
  const [isHintShown, setIsHintShown] = useState(false);

  const previewLoading = () => {
    const id = showLoading({ message: "Finding songs…", title: "Building your music deck" });
    window.setTimeout(() => hideLoading(id), LOADING_PREVIEW_MS);
  };

  return (
    <>
      <section className={styles.section}>
        <h2 className="typeTitleMd">Toasts & loading</h2>
        <div className={styles.row}>
          <Button
            onClick={() => showToast({ message: "Room code copied.", type: "success" })}
            variant="secondary"
          >
            Success toast
          </Button>
          <Button
            onClick={() => showToast({ message: "Player Two joined.", type: "info" })}
            variant="secondary"
          >
            Info toast
          </Button>
          <Button
            onClick={() => showToast({ message: "Add songs before starting.", type: "error" })}
            variant="secondary"
          >
            Error toast
          </Button>
          <Button
            onClick={() =>
              showToast({
                action: {
                  label: "Undo",
                  onAction: () => showToast({ message: "Change undone.", type: "info" }),
                },
                message: "Saved to Test Deck",
                type: "success",
              })
            }
            variant="secondary"
          >
            Undo toast
          </Button>
          <Button onClick={previewLoading} variant="secondary">
            Loading overlay (2 s)
          </Button>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className="typeTitleMd">Banner & hint</h2>
        <StatusBanner>The room was closed by the host.</StatusBanner>
        <div className={styles.row} ref={setHintAnchor}>
          <Button onClick={() => setIsHintShown((isShown) => !isShown)} variant="secondary">
            {isHintShown ? "Hide hint" : "Show hint"}
          </Button>
        </div>
        {isHintShown && hintAnchor ? (
          <HintBubble
            anchor={hintAnchor}
            body="Share the code so friends can join."
            dismissLabel="Got it"
            onDismiss={() => setIsHintShown(false)}
            title="Invite your friends"
          />
        ) : null}
      </section>

      <section className={styles.section}>
        <h2 className="typeTitleMd">Badges & counters</h2>
        <div className={styles.row}>
          <Badge>Neutral</Badge>
          <Badge variant="mutedSurface">Muted</Badge>
          <Badge variant="connected">Connected</Badge>
          <Badge variant="strong">Strong</Badge>
          <Badge size="md" variant="strong">
            Medium
          </Badge>
        </div>
        <div className={styles.row}>
          <CardCountAmount amount={7} />
          <TokenCountAmount amount={3} />
          <TtTokenIcon className={styles.tokenIcon} />
        </div>
      </section>
    </>
  );
}
