from pathlib import Path
import re

root = Path(r"apps/web/src")
for styles_ts in root.rglob("*Styles.ts"):
    text = styles_ts.read_text(encoding="utf-8")
    imports = re.findall(r'from "(\./[^"]+\.module\.css)"', text)
    if len(imports) < 2:
        continue
    class_map = {}
    for rel in imports:
        css_path = (styles_ts.parent / rel).resolve()
        css = css_path.read_text(encoding="utf-8")
        class_map[css_path.name] = set(re.findall(r"\.([A-Za-z_][\w-]*)", css))
    print("===", styles_ts.as_posix())
    for rel in imports:
        css_path = (styles_ts.parent / rel).resolve()
        css = css_path.read_text(encoding="utf-8")
        this = css_path.name
        for match in re.finditer(r"(^|\n)([^{}@/\n][^{]*)\{", css):
            sel = match.group(2).strip()
            names = re.findall(r"\.([A-Za-z_][\w-]*)", sel)
            if len(names) < 2:
                continue
            truly_foreign = [name for name in names if name not in class_map[this]]
            if truly_foreign:
                print(f"  CROSS in {this}: {sel[:120]}")
                print(f"    missing locally: {truly_foreign}")
