"""Generate deterministic essential-event selections for large themes."""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "fr.json"
MAP_PATH = ROOT / "scripts" / "essentiel_map.json"


def target_size(event_count):
    return math.ceil(event_count / 2) if event_count <= 50 else 30


def event_score(event):
    title = event.get("titre", "").lower()
    keywords = (
        "premier", "première", "fondation", "naissance", "mort", "début",
        "fin", "révolution", "guerre", "indépendance", "découverte", "invention",
        "traité", "conquête", "chute", "proclamation", "couronnement",
    )
    return 2 * bool(event.get("wikipedia")) + sum(keyword in title for keyword in keywords)


def select_events(events):
    target = target_size(len(events))
    selected = []
    selected_ids = set()

    # Reserve one representative per axis before filling temporal slots.
    by_axis = {}
    for event in events:
        by_axis.setdefault(event.get("axe"), []).append(event)
    for axis_events in by_axis.values():
        representative = max(
            axis_events,
            key=lambda event: (event_score(event), -events.index(event)),
        )
        selected.append(representative)
        selected_ids.add(representative["id"])

    remaining = [event for event in events if event["id"] not in selected_ids]
    slots = max(0, target - len(selected))
    if slots:
        bucket_count = min(slots, len(remaining))
        buckets = [[] for _ in range(bucket_count)]
        for index, event in enumerate(remaining):
            bucket_index = min(index * bucket_count // len(remaining), bucket_count - 1)
            buckets[bucket_index].append(event)
        for bucket in buckets:
            if bucket:
                selected.append(max(bucket, key=lambda event: (event_score(event), -events.index(event))))

    selected.sort(key=lambda event: events.index(event))
    return [event["id"] for event in selected[:target]]


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
    essential_map = {}
    for theme in iter_themes(data.get("categories", [])):
        if len(theme["events"]) >= 30:
            essential_map[theme["id"]] = select_events(theme["events"])

    MAP_PATH.write_text(
        json.dumps(essential_map, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Generated {len(essential_map)} essential selections in {MAP_PATH.name}")


if __name__ == "__main__":
    main()