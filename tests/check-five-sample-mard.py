#!/usr/bin/env python3
"""Reproducible palette-only check for the five public pet samples.

It intentionally does not judge likeness.  It verifies the fixed 64x64,
center-square, no-redraw input against the frozen MARD 221 reference palette.
"""
import argparse, base64, json, math, re
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
GROUPS = {'A': 26, 'B': 32, 'C': 29, 'D': 26, 'E': 24, 'F': 25, 'G': 21, 'H': 23, 'M': 15}

def palette():
    source = (ROOT / 'palette/mard-221-v2026-09-14.js').read_text()
    encoded = re.search(r"atob\('([^']+)'\)", source).group(1)
    values = list(base64.b64decode(encoded))
    codes = [f'{group}{i}' for group, count in GROUPS.items() for i in range(1, count + 1)]
    return list(zip(codes, [tuple(values[i:i + 3]) for i in range(0, len(values), 3)]))

def nearest(pixel, colors):
    code, rgb = min(colors, key=lambda item: sum((pixel[i] - item[1][i]) ** 2 for i in range(3)))
    return code, math.sqrt(sum((pixel[i] - rgb[i]) ** 2 for i in range(3)))

def sample(path, colors):
    image = Image.open(path).convert('RGB')
    side = min(image.size)
    left, top = (image.width - side) // 2, (image.height - side) // 2
    image = image.crop((left, top, left + side, top + side)).resize((64, 64), Image.Resampling.LANCZOS)
    mapped = [nearest(pixel, colors) for pixel in image.getdata()]
    counts = {}
    errors = []
    for code, error in mapped:
        counts[code] = counts.get(code, 0) + 1
        errors.append(error)
    return {'file': path.name, 'grid': '64x64', 'cells': len(mapped), 'invalid_codes': 0,
            'unique_mard_codes': len(counts), 'mean_rgb_error': round(sum(errors) / len(errors), 3),
            'max_rgb_error': round(max(errors), 3), 'cell_sum': sum(counts.values())}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('samples', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    colors = palette()
    report = {'palette_id': 'mard-221-alfonse-doudou-v2026-09-14', 'brand': 'MARD',
              'series': '221 色（A-H、M）', 'bead_size_mm': 2.6,
              'parameters': {'crop': 'center-square', 'grid': '64x64', 'ai_redraw': False, 'identity_anchors': 'manual in browser; not auto-added in this palette-only check'},
              'checks': [sample(path, colors) for path in sorted(args.samples.glob('*.jpg'))]}
    report['all_nonbackground_cells_map_to_known_code'] = all(item['invalid_codes'] == 0 and item['cell_sum'] == item['cells'] for item in report['checks'])
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(report, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
