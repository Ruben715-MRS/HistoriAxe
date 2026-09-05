"""Apply the generated essential selections to the French data pack."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "fr.json"
MAP_PATH = ROOT / "scripts" / "essentiel_map.json"


def iter_themes(node):
    if isinstance(node, dict):
        if isinstance(node.get("events"), list):
            yield node
        for value in node.values():
            yield from iter_themes(value)
    elif isinstance(node, list):
        for value in node:
            yield from iter_themes(value)


def main():
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    essential_map = json.loads(MAP_PATH.read_text(encoding="utf-8"))
    applied = 0
    for theme in iter_themes(data.get("categories", [])):
        if theme.get("id") in essential_map:
            theme["essentiel"] = essential_map[theme["id"]]
            applied += 1

    if applied != len(essential_map):
        raise ValueError(f"Applied {applied} themes, expected {len(essential_map)}")

    DATA_PATH.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Applied {applied} essential selections to {DATA_PATH.name}")


if __name__ == "__main__":
    main()