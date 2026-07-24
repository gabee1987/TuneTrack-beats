from pathlib import Path
import re

root = Path(r"apps/web/src")
dark = (root / "features/theme/darkThemeTokens.ts").read_text(encoding="utf-8")

# Extract keys from darkThemeCssVariables object
keys = re.findall(r'"([a-z0-9-]+)"\s*:', dark)
# Only those inside the const - crude: take unique in order until cssVariables export pattern
# Filter to color-/gradient-/shadow- style tokens
token_keys = []
seen = set()
for key in keys:
    if key in seen:
        continue
    if key.startswith(("color-", "gradient-", "shadow-")):
        seen.add(key)
        token_keys.append(key)

# Search usages outside theme definition files
exclude = {
    "features/theme/darkThemeTokens.ts",
    "features/theme/lightThemeTokens.ts",
    "features/theme/themeTokens.test.ts",
    "features/theme/tokenContract.ts",
    "features/theme/themeTypes.ts",
    "features/theme/themeRegistry.ts",
    "features/theme/tokens/components.ts",
    "features/theme/tokens/primitives.ts",
    "features/theme/tokens/index.ts",
    "features/theme/brandAccent.ts",
}

unused = []
used = []
for key in token_keys:
    # CSS var form and bare key
    patterns = [f"--{key}", f'"{key}"', f"'{key}'"]
    found = False
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix not in {".css", ".ts", ".tsx"}:
            continue
        rel = path.as_posix().split("apps/web/src/")[-1] if "apps/web/src" in path.as_posix() else path.name
        # normalize rel
        try:
            rel = str(path.relative_to(root)).replace("\\", "/")
        except Exception:
            continue
        if rel in exclude or rel.startswith("features/theme/"):
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        if any(p in text for p in patterns):
            found = True
            break
    # also check components.ts which maps to semantic
    components = (root / "features/theme/tokens/components.ts").read_text(encoding="utf-8")
    if f"--{key}" in components or f'"{key}"' in components:
        found = True
    if found:
        used.append(key)
    else:
        unused.append(key)

print(f"total semantic-ish keys: {len(token_keys)}")
print(f"used: {len(used)}")
print(f"unused ({len(unused)}):")
for key in unused:
    print(f"  {key}")
