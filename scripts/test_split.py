import re

ABBREVIATIONS = [
    r'av\.\s+J\.-C\.',
    r'ap\.\s+J\.-C\.',
    r'J\.-C\.',
    r'av\.\s+JC',
    r'ap\.\s+JC',
    r'ca\.',
    r'env\.',
    r'etc\.',
    r'vol\.',
    r'al\.',
    r'éd\.',
    r'St\.',
    r'Ste\.',
    r'Dr\.',
    r'Prof\.',
    r'Gen\.',
    r'M\.',
    r'Mme\.',
    r'Mlle\.',
]

text = "Sur son lit de mort en mai 1543, le chanoine et astronome polonais Nicolas Copernic voit paraître à Nuremberg son traité majeur intitulé De revolutionibus orbium coelestium. Dans cet ouvrage fondateur, il démontre mathématiquement que la Terre tourne sur elle-même quotidiennement et gravite autour du Soleil aux côtés des autres planètes, remettant ainsi en cause le système géocentrique hérité de Ptolémée. Cette publication déclenche une véritable révolution scientifique en détrônant l'humanité du centre géométrique de l'Univers et en posant les premiers jalons de l'astronomie moderne."

masked = text
for idx, abbr in enumerate(ABBREVIATIONS):
    for m in reversed(list(re.finditer(abbr, masked, flags=re.IGNORECASE))):
        print(f"Matched {abbr}: '{m.group(0)}' at {m.start()}-{m.end()}")
        key = f"__ABBR_{idx}_{m.start()}__"
        masked = masked[:m.start()] + key + masked[m.end():]

print("\nMasked text around coelestium:")
idx = masked.find("coelestium")
print(masked[idx:idx+50])

masked = re.sub(r'\b([A-Z])\.\s+(?=[A-Z])', r'__INIT_\1__ ', masked)
raw_sentences = re.split(r'(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-ß0-9«\"])', masked)
print(f"\nRaw sentences count: {len(raw_sentences)}")
for i, s in enumerate(raw_sentences):
    print(f"--- {i+1} ---: {s[:60]}...")
