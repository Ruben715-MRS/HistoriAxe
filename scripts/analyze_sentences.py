import json
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

# French sentence segmentation:
# Note: we should handle abbreviations like "av. J.-C.", "ap. J.-C.", "etc.", "env.", "vol.", "éd.", "St.", "Ste.", etc.
ABBREVIATIONS = [
    r'\bav\.\s+J\.-C\.',
    r'\bap\.\s+J\.-C\.',
    r'\bJ\.-C\.',
    r'\bav\.\s+JC',
    r'\bap\.\s+JC',
    r'\bca\.',
    r'\benv\.',
    r'\betc\.',
    r'\bvol\.\s*(?=\d)',
    r'\bal\.',
    r'\béd\.',
    r'\bSt\.',
    r'\bSte\.',
    r'\bDr\.',
    r'\bProf\.',
    r'\bGen\.',
    r'\bM\.',
    r'\bMme\.',
    r'\bMlle\.',
]

def split_sentences(text):
    if not text or not text.strip():
        return []
    t = text.strip()
    # Mask abbreviations
    masked = t
    replacements = {}
    for idx, abbr in enumerate(ABBREVIATIONS):
        matches = list(re.finditer(abbr, masked))
        for m in reversed(matches):
            key = f"__ABBR_{idx}_{m.start()}__"
            replacements[key] = m.group(0)
            masked = masked[:m.start()] + key + masked[m.end():]

    # Mask single-letter initials in real person names (e.g. John F. Kennedy, Franklin D. Roosevelt)
    FIRST_NAMES = r'(?:John|George|Franklin|Harry|Dwight|Lyndon|Michael|Ida|Lester|James|Carl|Charles|David|Robert|William|Thomas|Richard|Edward|Henry|Joseph|Arthur|Francis|Walter|Herbert|Edgar|Frank|Percy|Alfred|Alexander|Martin)'
    masked = re.sub(rf'(\b{FIRST_NAMES}\s+)([A-Z])\.\s+(?=[A-Z][a-z])', r'\1__INIT_\2__ ', masked)
    # Double/triple initials like J. R. R. Tolkien, W. E. B. Du Bois, C. S. Lewis
    masked = re.sub(r'\b([A-Z])\.\s+([A-Z])\.\s+([A-Z])\.\s+(?=[A-Z][a-z])', r'__INIT_\1__ __INIT_\2__ __INIT_\3__ ', masked)
    masked = re.sub(r'\b([A-Z])\.\s+([A-Z])\.\s+(?=[A-Z][a-z])', r'__INIT_\1__ __INIT_\2__ ', masked)

    # Split on sentence end punctuation (. ! ?) followed by whitespace and capital or quote
    raw_sentences = re.split(r'(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-ß0-9«\"])', masked)
    
    # Restore initials and abbreviations
    sentences = []
    for s in raw_sentences:
        restored = s
        restored = re.sub(r'__INIT_([A-Z])__\s*', r'\1. ', restored)
        for key, val in replacements.items():
            restored = restored.replace(key, val)
        restored = restored.strip()
        if restored:
            sentences.append(restored)
    return sentences

if __name__ == '__main__':
    with open('data/fr.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    events = []
    def recurse(node):
        if isinstance(node, dict):
            if 'events' in node and isinstance(node['events'], list):
                for ev in node['events']:
                    events.append(ev)
            for k, v in node.items():
                if k != 'events':
                    recurse(v)
        elif isinstance(node, list):
            for item in node:
                recurse(item)

    recurse(data)

    counts = {}
    sample_by_count = {}

    for ev in events:
        desc = ev.get('description', '')
        s = split_sentences(desc)
        c = len(s)
        counts[c] = counts.get(c, 0) + 1
        if c not in sample_by_count:
            sample_by_count[c] = (ev.get('id'), ev.get('titre'), desc, s)

    print(f"Total events in fr.json: {len(events)}")
    print("Sentence count distribution:")
    for k in sorted(counts.keys()):
        pct = counts[k] / len(events) * 100
        print(f"  {k} phrases: {counts[k]} events ({pct:.1f}%)")

    print("\nSamples for each sentence count:")
    for k in sorted(sample_by_count.keys()):
        ev_id, titre, desc, s = sample_by_count[k]
        print(f"\n--- {k} phrases (id: {ev_id}, titre: {titre}) ---")
        print("Description:", desc)
        for idx, sent in enumerate(s):
            print(f"   [{idx+1}] {sent}")
