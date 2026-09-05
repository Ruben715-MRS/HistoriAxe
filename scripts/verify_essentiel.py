"""Validate essential selections against the French data pack."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "fr.json"


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
    checked = 0
    for theme in iter_themes(data.get("categories", [])):
        events = theme["events"]
        if len(events) < 30:
            if "essentiel" in theme:
                raise ValueError(f"Small theme has essentiel: {theme.get('id')}")
            continue
        selection = theme.get("essentiel")
        if not isinstance(selection, list):
            raise ValueError(f"Missing essentiel: {theme.get('id')}")
        event_ids = {event["id"] for event in events}
        if len(selection) != len(set(selection)):
            raise ValueError(f"Duplicate essential ID: {theme.get('id')}")
        unknown = set(selection) - event_ids
        if unknown:
            raise ValueError(f"Unknown IDs in {theme.get('id')}: {sorted(unknown)}")
        checked += 1
    print(f"Verified {checked} themes with essential selections")


if __name__ == "__main__":
    main()