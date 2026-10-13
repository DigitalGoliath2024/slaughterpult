"""Group committed character audio without changing filenames."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ALIASES = {'cowboy': ('cowboy', 'southern'), 'human': ('philip', 'human', 'positive'), 'meshy': ('scared', 'crash', 'meshy')}

def classify(path):
    name = re.sub(r'[^a-z0-9]+', ' ', str(path).lower())
    character = next((key for key, aliases in ALIASES.items() if any(alias in name for alias in aliases)), None)
    stage = ('before' if re.search(r'\b(before|ready|pre|seated)\b|beforeflight|beforeflying|prelaunch', name)
             else 'landed' if re.search(r'land|after|slaughter', name)
             else 'flying' if re.search(r'fly|flight|airborne|during|launch', name) else None)
    return character, stage

def build(root):
    catalog = {key: {stage: [] for stage in ('before', 'flying', 'landed')} for key in ALIASES}
    unmatched = []
    for path in sorted(root.rglob('*')):
        if path.suffix.lower() not in ('.mp3', '.wav', '.ogg', '.m4a'):
            continue
        relative = path.relative_to(root).as_posix()
        character, stage = classify(relative)
        if character and stage:
            catalog[character][stage].append(relative)
        else:
            unmatched.append(relative)
    return catalog, unmatched

if __name__ == '__main__':
    catalog, unmatched = build(ROOT)
    (ROOT / 'character-voices.js').write_text('window.characterVoiceClips = ' + json.dumps(catalog, indent=2) + ';\n')
    print('Character voice pools:', {key: {stage: len(files) for stage, files in pools.items()} for key, pools in catalog.items()})
    if unmatched:
        print('Unassigned audio (character/stage unclear):', ', '.join(unmatched))
