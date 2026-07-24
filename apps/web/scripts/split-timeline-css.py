from pathlib import Path
import re

src = (
    Path(__file__).resolve().parents[1]
    / "src/pages/GamePage/components/TimelinePanel.module.css"
)
text = src.read_text(encoding="utf-8")


def parse_blocks(css: str):
    blocks = []
    i = 0
    n = len(css)
    while i < n:
        while i < n and css[i] in " \t\r\n":
            i += 1
        if i >= n:
            break
        start = i
        if css.startswith("/*", i):
            end = css.find("*/", i + 2)
            if end == -1:
                raise ValueError("unclosed comment")
            i = end + 2
            blocks.append(("comment", css[start:i]))
            continue
        brace = css.find("{", i)
        if brace == -1:
            trailing = css[i:].strip()
            if trailing:
                blocks.append(("raw", css[i:]))
            break
        depth = 0
        j = brace
        while j < n:
            if css.startswith("/*", j):
                j = css.find("*/", j + 2)
                if j == -1:
                    raise ValueError("unclosed comment in block")
                j += 2
                continue
            ch = css[j]
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    j += 1
                    break
            j += 1
        body = css[start:j]
        header = css[i:brace].strip()
        kind = "atrule" if header.startswith("@") else "rule"
        blocks.append((kind, body))
        i = j
    return blocks


CLASS_RE = re.compile(r"\.([A-Za-z_][\w-]*)")


def primary_classes(block: str):
    header = block.split("{", 1)[0]
    return CLASS_RE.findall(header)


SHELL_PREFIXES = (
    "timelinePanel",
    "timelineHeader",
    "timelineHeading",
    "timelineCount",
    "timelineHint",
    "timelineView",
    "timelineRow",
    "timelineItem",
    "flyToMine",
)

CELEBRATION_PREFIXES = (
    "timelineCelebration",
    "correctPlacement",
)

SKIP_BLOCKS = {
    ".timelinePanelDesktop .timelineCard,\n.timelinePanelDesktop .previewCard",
}


def bucket_for_class(name: str) -> str:
    if name.startswith(CELEBRATION_PREFIXES):
        return "celebration"
    if name.startswith(SHELL_PREFIXES):
        return "shell"
    return "cards"


def bucket_for_classes(classes):
    if not classes:
        return "cards"
    buckets = {bucket_for_class(name) for name in classes}
    if len(buckets) == 1:
        return next(iter(buckets))
    scores = {"shell": 0, "cards": 0, "celebration": 0}
    for name in classes:
        scores[bucket_for_class(name)] += 1
    return max(scores, key=scores.get)


def bucket_for_block(body: str) -> str:
    header = body.split("{", 1)[0].strip()
    if header in SKIP_BLOCKS or header.replace("\r\n", "\n") in SKIP_BLOCKS:
        return "skip"
    return bucket_for_classes(primary_classes(body))


def split_media(media_body: str):
    inner_start = media_body.find("{") + 1
    inner_end = media_body.rfind("}")
    inner = media_body[inner_start:inner_end]
    nested = parse_blocks(inner)
    by_bucket = {"shell": [], "cards": [], "celebration": []}
    for kind, body in nested:
        if kind != "rule":
            continue
        bucket = bucket_for_block(body)
        if bucket == "skip":
            continue
        by_bucket[bucket].append(body)
    return by_bucket, media_body.split("{", 1)[0].strip()


blocks = parse_blocks(text)
owned = {"shell": [], "cards": [], "celebration": []}
media_blocks = []
top_level_atrules = {"shell": [], "cards": [], "celebration": []}

for kind, body in blocks:
    if kind == "comment":
        continue
    if kind == "atrule":
        header = body.split("{", 1)[0].strip()
        if header.startswith("@media"):
            media_blocks.append(body)
        elif header.startswith("@keyframes"):
            name = header.split()[1] if len(header.split()) > 1 else ""
            if name.startswith(
                (
                    "timelineCelebration",
                    "correctPlacement",
                    "wrongPlacement",
                )
            ):
                top_level_atrules["celebration"].append(body)
            elif name.startswith("currentPick") or name.startswith("hiddenCard"):
                top_level_atrules["cards"].append(body)
            else:
                top_level_atrules["celebration"].append(body)
        elif header.startswith("@property"):
            prop_name = header.split()[1] if len(header.split()) > 1 else ""
            if "current-pick" in prop_name:
                top_level_atrules["cards"].append(body)
            else:
                top_level_atrules["celebration"].append(body)
        else:
            top_level_atrules["cards"].append(body)
        continue
    bucket = bucket_for_block(body)
    if bucket == "skip":
        continue
    owned[bucket].append(body)

for media in media_blocks:
    header = media.split("{", 1)[0].strip()
    if "prefers-reduced-motion" in header:
        parts, _ = split_media(media)
        for bucket, rules in parts.items():
            if not rules:
                continue
            wrapped = header + " {\n" + "\n\n".join(rules) + "\n}\n"
            owned[bucket].append(wrapped)
        continue
    parts, media_header = split_media(media)
    for bucket, rules in parts.items():
        if not rules:
            continue
        wrapped = media_header + " {\n" + "\n\n".join(rules) + "\n}\n"
        owned[bucket].append(wrapped)

for bucket, atrules in top_level_atrules.items():
    owned[bucket].extend(atrules)

DESKTOP_CARD_VARS = """
.timelinePanelDesktop {
  --timeline-card-min-width: 0;
  --timeline-card-min-height: 0;
  --timeline-card-aspect-ratio: 1;
}
"""

PORTRAIT_PANEL_VARS_PATCH = """
  --timeline-card-min-width: 0;
  --timeline-card-min-height: 0;
  --timeline-card-aspect-ratio: 1;
"""

CARD_ASPECT_PATCH = """
.timelineCard {
  min-width: var(--timeline-card-min-width, var(--timeline-card-width));
  min-height: var(--timeline-card-min-height, var(--timeline-card-height));
  aspect-ratio: var(--timeline-card-aspect-ratio, auto);
}
"""

PREVIEW_ASPECT_PATCH = """
.previewCard {
  min-width: var(--timeline-card-min-width, 100%);
  min-height: var(--timeline-card-min-height, var(--timeline-card-height));
  aspect-ratio: var(--timeline-card-aspect-ratio, auto);
}
"""

owned["shell"].insert(1, DESKTOP_CARD_VARS.strip())
owned["cards"].insert(0, CARD_ASPECT_PATCH.strip())
owned["cards"].insert(1, PREVIEW_ASPECT_PATCH.strip())

out_dir = src.parent
files = {
    "shell": out_dir / "timelinePanelShell.module.css",
    "cards": out_dir / "timelineCards.module.css",
    "celebration": out_dir / "timelineCelebration.module.css",
}

for name, path in files.items():
    content = "\n\n".join(owned[name]).strip() + "\n"
    path.write_text(content, encoding="utf-8")
    print(f"{path.name}: {len(content.splitlines())} lines, {len(owned[name])} blocks")

(out_dir / "timelineStyles.ts").write_text(
    """import shellStyles from "./timelinePanelShell.module.css";
import cardsStyles from "./timelineCards.module.css";
import celebrationStyles from "./timelineCelebration.module.css";

const styles = {
  ...shellStyles,
  ...cardsStyles,
  ...celebrationStyles,
};

export default styles;
""",
    encoding="utf-8",
)
print("wrote timelineStyles.ts")
