from __future__ import annotations

from pathlib import Path
import re

WEB_SRC = Path(__file__).resolve().parents[1] / "src"


def parse_blocks(css: str) -> list[tuple[str, str]]:
    blocks: list[tuple[str, str]] = []
    index = 0
    length = len(css)

    while index < length:
        while index < length and css[index] in " \t\r\n":
            index += 1
        if index >= length:
            break

        start = index
        if css.startswith("/*", index):
            end = css.find("*/", index + 2)
            if end == -1:
                raise ValueError("unclosed comment")
            index = end + 2
            blocks.append(("comment", css[start:index]))
            continue

        brace = css.find("{", index)
        if brace == -1:
            trailing = css[index:].strip()
            if trailing:
                blocks.append(("raw", css[index:]))
            break

        depth = 0
        cursor = brace
        while cursor < length:
            if css.startswith("/*", cursor):
                cursor = css.find("*/", cursor + 2)
                if cursor == -1:
                    raise ValueError("unclosed comment in block")
                cursor += 2
                continue
            char = css[cursor]
            if char == "{":
                depth += 1
            elif char == "}":
                depth -= 1
                if depth == 0:
                    cursor += 1
                    break
            cursor += 1

        body = css[start:cursor]
        header = css[index:brace].strip()
        kind = "atrule" if header.startswith("@") else "rule"
        blocks.append((kind, body))
        index = cursor

    return blocks


CLASS_RE = re.compile(r"\.([A-Za-z_][\w-]*)")


def classes_in_selector(selector: str) -> list[str]:
    return CLASS_RE.findall(selector)


def primary_classes(block: str) -> list[str]:
    header = block.split("{", 1)[0]
    selectors = [part.strip() for part in header.split(",") if part.strip()]
    classes: list[str] = []
    for selector in selectors:
        classes.extend(classes_in_selector(selector))
    return classes


def bucket_for_game_page(classes: list[str]) -> str:
    if not classes:
        return "chrome"

    scores = {"chrome": 0, "menu": 0, "playback": 0, "status": 0}
    for name in classes:
        if name.startswith(
            (
                "screen",
                "panel",
                "header",
                "title",
                "meta",
                "cardMeta",
                "genre",
                "statusBadge",
                "statusCaption",
                "headerLeaders",
                "headerChip",
                "headerIcon",
                "headerAction",
                "headerAside",
                "headerMain",
                "menuInfo",
            )
        ):
            scores["chrome"] += 2
        elif name.startswith(("playback",)):
            scores["playback"] += 2
        elif name.startswith(("history",)):
            scores["playback"] += 2
        elif name.startswith(
            (
                "error",
                "summaryText",
                "revealResult",
                "challengeMessage",
                "challengeOutcome",
                "revealHeader",
                "revealBadge",
                "revealInfo",
            )
        ):
            scores["status"] += 2
        elif name.startswith(
            (
                "menu",
                "transferConfirm",
            )
        ):
            scores["menu"] += 2
        else:
            scores["chrome"] += 1

    return max(scores, key=scores.get)


def bucket_for_lobby_page(classes: list[str]) -> str:
    if not classes:
        return "layout"

    scores = {"layout": 0, "settings": 0, "sheets": 0}
    for name in classes:
        if name.startswith(
            (
                "mobileSelect",
            )
        ):
            scores["sheets"] += 3
        elif name.startswith(
            (
                "screenShell",
                "panelShell",
                "header",
                "eyebrow",
                "title",
                "subtitle",
                "layoutGrid",
                "primaryColumn",
                "secondaryColumn",
                "summary",
                "sectionHeading",
                "sectionTitle",
                "sectionDescription",
                "menuPlaceholder",
                "toggleHint",
            )
        ):
            scores["layout"] += 2
        elif name.startswith(
            (
                "settings",
                "player",
                "tt",
                "tokenMode",
                "conditionalGroup",
                "selectInput",
                "startGameButton",
                "primaryAction",
                "inlineTtTokenIcon",
                "copyInviteButton",
                "roomActionsSection",
                "rosterSection",
                "cancelRoomButton",
            )
        ):
            scores["settings"] += 2
        else:
            scores["layout"] += 1

    return max(scores, key=scores.get)


def bucket_for_action_panels(classes: list[str]) -> str:
    if not classes:
        return "challenge"

    scores = {"challenge": 0, "dock": 0}
    for name in classes:
        if name.startswith(
            (
                "floatingAction",
                "floatingPrimary",
                "floatingSecondary",
                "actionButton",
                "ttCost",
                "tokenSpend",
            )
        ):
            scores["dock"] += 2
        elif name.startswith(
            (
                "challenge",
                "revealPanel",
                "sectionLabel",
                "cardTitle",
                "actionRail",
                "offlinePlayer",
            )
        ):
            scores["challenge"] += 2
        else:
            scores["challenge"] += 1

    return max(scores, key=scores.get)


def bucket_for_playlist_edit(classes: list[str]) -> str:
    if not classes:
        return "list"

    scores = {"list": 0, "chrome": 0}
    for name in classes:
        if name.startswith(
            (
                "overlay",
                "sheet",
                "header",
                "title",
                "trackCount",
                "selectBtn",
                "details",
                "fieldLabel",
                "statusField",
                "statusOption",
                "statusSegmentedControl",
                "secondaryButton",
                "primaryButton",
                "detailsTextInput",
            )
        ):
            scores["chrome"] += 2
        elif name.startswith(
            (
                "sort",
                "listScrollArea",
                "trackRow",
                "trackOpenButton",
                "deleteZone",
                "trackInfo",
                "trackTitle",
                "trackMeta",
                "trackBadge",
                "trackArtworkImg",
                "loadingState",
                "emptyState",
                "errorState",
                "loadingSpinner",
                "batch",
            )
        ):
            scores["list"] += 2
        else:
            scores["list"] += 1

    return max(scores, key=scores.get)


def split_rule_by_bucket(rule_body: str, bucket_fn) -> dict[str, str]:
    header, _, declarations_block = rule_body.partition("{")
    declarations = declarations_block.rstrip("}").strip()
    selectors = [selector.strip() for selector in header.split(",") if selector.strip()]
    selectors_by_bucket: dict[str, list[str]] = {}

    for selector in selectors:
        bucket = bucket_fn(classes_in_selector(selector))
        selectors_by_bucket.setdefault(bucket, []).append(selector)

    return {
        bucket: ",\n  ".join(bucket_selectors) + " {\n  " + declarations + "\n}"
        for bucket, bucket_selectors in selectors_by_bucket.items()
    }


def split_media(media_body: str, bucket_fn) -> dict[str, list[str]]:
    inner_start = media_body.find("{") + 1
    inner_end = media_body.rfind("}")
    inner = media_body[inner_start:inner_end]
    nested = parse_blocks(inner)
    by_bucket: dict[str, list[str]] = {}
    for kind, body in nested:
        if kind != "rule":
            continue
        for bucket, split_rule in split_rule_by_bucket(body, bucket_fn).items():
            by_bucket.setdefault(bucket, []).append(split_rule)
    return by_bucket


def split_css(text: str, bucket_fn, bucket_names: list[str]) -> dict[str, list[str]]:
    owned: dict[str, list[str]] = {name: [] for name in bucket_names}
    media_blocks: list[str] = []

    for kind, body in parse_blocks(text):
        if kind == "comment":
            continue
        if kind == "atrule":
            header = body.split("{", 1)[0].strip()
            if header.startswith("@keyframes"):
                classes = primary_classes(body)
                bucket = bucket_fn(classes) if classes else bucket_names[0]
                owned[bucket].append(body)
            elif header.startswith("@media"):
                media_blocks.append(body)
            else:
                owned[bucket_names[0]].append(body)
            continue

        bucket = bucket_fn(primary_classes(body))
        owned[bucket].append(body)

    for media in media_blocks:
        header = media.split("{", 1)[0].strip()
        parts = split_media(media, bucket_fn)
        for bucket, rules in parts.items():
            if not rules:
                continue
            wrapped = header + " {\n" + "\n\n".join(rules) + "\n}\n"
            owned[bucket].append(wrapped)

    return owned


def write_split(
    *,
    src: Path,
    bucket_fn,
    bucket_files: dict[str, Path],
    merger_path: Path,
    import_names: dict[str, str],
) -> None:
    text = src.read_text(encoding="utf-8")
    owned = split_css(text, bucket_fn, list(bucket_files.keys()))

    for bucket, path in bucket_files.items():
        content = "\n\n".join(owned[bucket]).strip() + "\n"
        path.write_text(content, encoding="utf-8")
        print(f"  {path.name}: {len(content.splitlines())} lines")

    imports = "\n".join(
        f'import {import_names[bucket]} from "./{bucket_files[bucket].name}";'
        for bucket in bucket_files
    )
    spreads = "\n".join(f"  ...{import_names[bucket]}," for bucket in bucket_files)
    merger_path.write_text(
        f"""{imports}

const styles = {{
{spreads}
}};

export default styles;
""",
        encoding="utf-8",
    )
    print(f"  wrote {merger_path.name}")


def main() -> None:
    game_page_dir = WEB_SRC / "pages/GamePage"
    print("GamePage.module.css")
    write_split(
        src=game_page_dir / "GamePage.module.css",
        bucket_fn=bucket_for_game_page,
        bucket_files={
            "chrome": game_page_dir / "gamePageChrome.module.css",
            "menu": game_page_dir / "gamePageMenu.module.css",
            "playback": game_page_dir / "gamePagePlayback.module.css",
            "status": game_page_dir / "gamePageStatus.module.css",
        },
        merger_path=game_page_dir / "gamePageStyles.ts",
        import_names={
            "chrome": "chromeStyles",
            "menu": "menuStyles",
            "playback": "playbackStyles",
            "status": "statusStyles",
        },
    )

    lobby_page_dir = WEB_SRC / "pages/LobbyPage"
    print("LobbyPage.module.css")
    write_split(
        src=lobby_page_dir / "LobbyPage.module.css",
        bucket_fn=bucket_for_lobby_page,
        bucket_files={
            "layout": lobby_page_dir / "lobbyLayout.module.css",
            "settings": lobby_page_dir / "lobbySettings.module.css",
            "sheets": lobby_page_dir / "lobbySheets.module.css",
        },
        merger_path=lobby_page_dir / "lobbyPageStyles.ts",
        import_names={
            "layout": "layoutStyles",
            "settings": "settingsStyles",
            "sheets": "sheetsStyles",
        },
    )

    action_panels_dir = WEB_SRC / "pages/GamePage/components"
    print("GamePageActionPanels.module.css")
    write_split(
        src=action_panels_dir / "GamePageActionPanels.module.css",
        bucket_fn=bucket_for_action_panels,
        bucket_files={
            "challenge": action_panels_dir / "gamePageActionPanelsChallenge.module.css",
            "dock": action_panels_dir / "gamePageActionPanelsDock.module.css",
        },
        merger_path=action_panels_dir / "gamePageActionPanelsStyles.ts",
        import_names={
            "challenge": "challengeStyles",
            "dock": "dockStyles",
        },
    )

    playlist_dir = WEB_SRC / "pages/LobbyPage/components"
    print("PlaylistEditModal.module.css")
    write_split(
        src=playlist_dir / "PlaylistEditModal.module.css",
        bucket_fn=bucket_for_playlist_edit,
        bucket_files={
            "list": playlist_dir / "playlistEditList.module.css",
            "chrome": playlist_dir / "playlistEditChrome.module.css",
        },
        merger_path=playlist_dir / "playlistEditModalStyles.ts",
        import_names={
            "list": "listStyles",
            "chrome": "chromeStyles",
        },
    )


if __name__ == "__main__":
    main()
