from pathlib import Path
import re

src = Path(__file__).resolve().parents[1] / "src/pages/LobbyPage/components/spotify/LobbySpotifySection.module.css"
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


def bucket_for_classes(classes):
    if not classes:
        return "setup"
    scores = {"setup": 0, "discovery": 0, "panels": 0, "shared": 0}
    for name in classes:
        if name.startswith(
            (
                "spotifySetup",
                "spotifySource",
                "spotifyConnect",
                "spotifyConnected",
                "spotifyBadge",
                "spotifyPremium",
                "spotifyFree",
                "spotifyAuth",
                "spotifyImport",
                "spotifyPlaylistEditor",
                "spotifyPlaylistClear",
                "spotifyEdit",
                "spotifySongs",
                "savedPlaylist",
                "spotifyPanel",
            )
        ):
            scores["setup"] += 2
        elif name.startswith(
            (
                "spotifyDiscovery",
                "spotifySearch",
                "spotifyPlaylist",
                "spotifySmart",
                "spotifyBuilder",
            )
        ):
            scores["discovery"] += 2
        elif name.startswith(
            (
                "spotifyOpened",
                "spotifyQuick",
                "spotifyCandidate",
                "spotifyReview",
                "spotifyBatch",
                "spotifyFloating",
                "spotifyApply",
                "spotifyLoading",
                "spotifyEmpty",
            )
        ):
            scores["panels"] += 2
        elif name.startswith("spotifyStatus"):
            scores["shared"] += 2
        else:
            scores["setup"] += 1
    return max(scores, key=scores.get)


blocks = parse_blocks(text)
owned = {"setup": [], "discovery": [], "panels": [], "shared": []}
media_blocks = []
keyframes = {"setup": [], "discovery": [], "panels": [], "shared": []}

for kind, body in blocks:
    if kind == "comment":
        continue
    if kind == "atrule":
        header = body.split("{", 1)[0].strip()
        if header.startswith("@keyframes"):
            name = header.split()[1] if len(header.split()) > 1 else ""
            if "Premium" in name or "DotPulse" in name:
                keyframes["setup"].append(body)
            else:
                keyframes["shared"].append(body)
        elif header.startswith("@media"):
            media_blocks.append(body)
        else:
            owned["shared"].append(body)
        continue
    classes = primary_classes(body)
    if "spotifyDiscoverySearch > .spotifyStatusLine" in body:
        continue
    if classes and all(c.startswith("spotifyStatus") for c in classes):
        owned["shared"].append(body)
        continue
    owned[bucket_for_classes(classes)].append(body)


def split_media(media_body: str):
    inner_start = media_body.find("{") + 1
    inner_end = media_body.rfind("}")
    inner = media_body[inner_start:inner_end]
    nested = parse_blocks(inner)
    by_bucket = {"setup": [], "discovery": [], "panels": [], "shared": []}
    for kind, body in nested:
        if kind != "rule":
            continue
        by_bucket[bucket_for_classes(primary_classes(body))].append(body)
    return by_bucket


for media in media_blocks:
    header = media.split("{", 1)[0].strip()
    if "prefers-reduced-motion" in header:
        owned["setup"].append(media)
        continue
    parts = split_media(media)
    for bucket, rules in parts.items():
        if not rules:
            continue
        wrapped = header + " {\n" + "\n\n".join(rules) + "\n}\n"
        owned[bucket].append(wrapped)

for bucket, kfs in keyframes.items():
    owned[bucket] = kfs + owned[bucket]

owned["discovery"].insert(
    0,
    """.spotifyDiscoveryStatusOffset {
  margin-top: 120px;
}
""",
)

out_dir = src.parent
files = {
    "setup": out_dir / "spotifySetup.module.css",
    "discovery": out_dir / "spotifyDiscovery.module.css",
    "panels": out_dir / "spotifyPanels.module.css",
    "shared": out_dir / "spotifyShared.module.css",
}

for name, path in files.items():
    content = "\n\n".join(owned[name]).strip() + "\n"
    path.write_text(content, encoding="utf-8")
    print(f"{path.name}: {len(content.splitlines())} lines, {len(owned[name])} blocks")

(out_dir / "spotifyStyles.ts").write_text(
    """import setupStyles from "./spotifySetup.module.css";
import discoveryStyles from "./spotifyDiscovery.module.css";
import panelsStyles from "./spotifyPanels.module.css";
import sharedStyles from "./spotifyShared.module.css";

const styles = {
  ...setupStyles,
  ...discoveryStyles,
  ...panelsStyles,
  ...sharedStyles,
};

export default styles;
""",
    encoding="utf-8",
)
print("wrote spotifyStyles.ts")
