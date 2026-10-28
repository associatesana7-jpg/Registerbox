#!/usr/bin/env python3
"""Authoring-time extraction only. Requires pypdf; never runs in the application.
See docs/gst-rate-data.md for immutable source URLs, provenance, and update checks.
Usage: python generate-gst-rate-data.py --pdf-dir /path/to/downloads
"""
import argparse
import collections
import hashlib
import json
from pathlib import Path
import re
import pypdf

ROOT = Path(__file__).resolve().parents[1]
RATE = {'I': 5, 'II': 18, 'III': 40, 'IV': 3, 'V': .25, 'VI': 1.5, 'VII': 28}
EXPECTED = {'I': 516, 'II': 640, 'III': 13, 'IV': 15, 'V': 3, 'VI': 2, 'VII': 6}

def tidy(text):
    return re.sub(r'\s+', ' ', text).strip().replace('pre- packaged', 'pre-packaged').replace('pre - packaged', 'pre-packaged').replace('semi -', 'semi-')

def taxable(path):
    rows = []; active = current = None; col = 56; pending = False
    for page_no, page in enumerate(pypdf.PdfReader(path).pages, 1):
        lines = page.extract_text(extraction_mode='layout').splitlines()
        starts = []
        for line in lines:
            m = re.match(r'^\s{0,3}(\d+)\.\s+(.*?)\s{2,}(\S.*)$', line)
            if m: starts.append(m.start(3))
        if starts: col = collections.Counter(starts).most_common(1)[0][0]
        for line in lines:
            m = re.search(r'Schedule\s+([IVX]+)\s*[–−-]\s*([\d.]+)\s*%', line)
            if m:
                active = m[1]; current = None; pending = True; continue
            if 'List 1 [See' in line or 'Explanation.— For the purposes' in line:
                active = current = None; continue
            if re.search(r'Corrected vide Notification No', line, re.I): continue
            if not active or not line.strip() or line.startswith(('NOTIFICATION ', 'Printed from ')): continue
            m = re.match(r'^\s{0,3}(\d+)\.\s+(.*?)\s{2,}(\S.*)$', line)
            if m:
                if pending: col = m.start(3); pending = False
                current = {'schedule': active, 'serial': m[1], 'hsn': line[m.start(2):col], 'description': line[col:], 'page': page_no}
                rows.append(current)
            elif current:
                if '(1)' in line and '(2)' in line: continue
                if not line[:col].strip(): current['description'] += ' ' + line.strip()
                else:
                    current['hsn'] += ' ' + line[8:col].strip()
                    current['description'] += ' ' + line[col:].strip()
    for row in rows:
        for field in ['hsn', 'description']: row[field] = tidy(row[field])
    for schedule, count in EXPECTED.items():
        found = [int(r['serial']) for r in rows if r['schedule'] == schedule]
        assert found == list(range(1, count + 1)), (schedule, count, found)
    return rows

def exempt(path):
    rows = []; current = None; stopped = False; side = 'description'
    for page_no, page in enumerate(pypdf.PdfReader(path).pages[:8], 1):
        def visit(text, cm, tm, font, size):
            nonlocal current, stopped, side
            if stopped or not text.strip(): return
            x = tm[4]
            if text.strip().startswith('Explanation.'):
                stopped = True; return
            m = re.fullmatch(r'(\d+)\.', text.strip())
            if m and 70 <= x <= 80 and int(m[1]) == len(rows) + 1:
                current = {'schedule': 'Exempt', 'serial': m[1], 'hsn': '', 'description': '', 'page': page_no}; rows.append(current); return
            if current:
                if x != 0: side = 'hsn' if 95 <= x < 230 else 'description'
                current[side] += ' ' + text.strip()
        page.extract_text(visitor_text=visit)
    assert [int(r['serial']) for r in rows] == list(range(1, 173))
    for row in rows:
        for field in ['hsn', 'description']: row[field] = tidy(row[field])
    # Annexures form part of the conditions, not blanket exemptions for chapters 30/92.
    reader = pypdf.PdfReader(path)
    annexures = '\n'.join(p.extract_text() for p in reader.pages[8:])
    sections = re.split(r'Annexure\s*-?\s*II', annexures, maxsplit=1)
    def names(text):
        return [tidy(x) for x in re.findall(r'^\s*\d+\s*\.\s*(.+)$', text, re.M)]
    drugs = names(sections[0]); instruments = names(sections[1])
    assert len(drugs) == 37 and len(instruments) == 134, (len(drugs), len(instruments))
    rows[112]['description'] += '. Annexure I listed drugs or medicines: ' + '; '.join(drugs)
    rows[160]['description'] += '. Annexure II listed indigenous handmade musical instruments: ' + '; '.join(instruments)
    return rows

def heading_labels(path):
    """Search descriptions only: DGFT RoDTEP percentages are never imported."""
    labels = {}; current = None
    for page in pypdf.PdfReader(path).pages:
        for line in page.extract_text().splitlines():
            line = tidy(line)
            match = re.match(r'^(\d{4})\s+([A-Z][A-Z ,;:()\-/0-9.\'&]+)$', line)
            if match:
                current = match[1]; labels[current] = match[2]; continue
            if current and line and line.upper() == line and re.search('[A-Z]', line) and not re.search(r'\d{8}|RoDTEP|UQC|FOB', line):
                labels[current] += ' ' + line
            else: current = None
    assert 'SMARTPHONES' in labels['8517']
    assert len(labels) > 900, len(labels)
    return labels

def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--pdf-dir', type=Path, required=True); args = parser.parse_args()
    goods = taxable(args.pdf_dir / 'gst-rates-9-2025-igst.pdf')
    exemptions = exempt(args.pdf_dir / 'gst-1010437.pdf')
    # 19/2025-CT(R), operative 1 February 2026: schedule VII omitted and seven new entries.
    goods = [r for r in goods if r['schedule'] != 'VII']
    amendments = [
        ('II', '4A', '2403 19 21, 2403 19 29', 'Biris'),
        ('III', '14', '2106 90 20', 'Pan masala'),
        ('III', '15', '2401', 'Unmanufactured tobacco; tobacco refuse [other than tobacco leaves]'),
        ('III', '16', '2402', 'Cigars, cheroots, cigarillos and cigarettes, of tobacco or of tobacco substitutes'),
        ('III', '17', '2403 (other than 2403 19 21, 2403 19 29)', 'Other manufactured tobacco and manufactured tobacco substitutes; homogenised or reconstituted tobacco; tobacco extracts and essences [other than biris]'),
        ('III', '18', '2404 11 00', 'Products containing tobacco or reconstituted tobacco and intended for inhalation without combustion'),
        ('III', '19', '2404 19 00', 'Products containing tobacco or nicotine substitutes and intended for inhalation without combustion'),
    ]
    for s, n, h, d in amendments:
        goods.append({'schedule': s, 'serial': n, 'hsn': h, 'description': d, 'page': 1, 'amendment': 'tobacco-2026'})
    # 01/2026-CT(R) INCLUDING corrigendum 6 May 2026, operative 1 May 2026.
    tariff_updates = {('I', '150'): '2202 99 21, 2202 99 29', ('I', '151'): '2202 99 31, 2202 99 39', ('III', '2'): '2202 91 00, 2202 99 91, 2202 99 99', ('III', '3'): '2202 99 91, 2202 99 99'}
    for row in goods:
        if (row['schedule'], row['serial']) in tariff_updates:
            row['hsn'] = tariff_updates[(row['schedule'], row['serial'])]; row['amendment'] = 'beverages-2026'
    data = []
    for row in goods + exemptions:
        schedule = row['schedule']; source = row.get('amendment') or ('goods-exempt-2025' if schedule == 'Exempt' else 'goods-taxable-2025')
        rate = 0 if schedule == 'Exempt' else RATE[schedule]
        data.append([f"{'exempt' if schedule == 'Exempt' else schedule}-{row['serial']}", row['hsn'], row['description'], rate, schedule, row['serial'], source, row['page']])
    assert len(data) == 1368, len(data)
    target = ROOT / 'src/lib/gst-rate-data.ts'
    labels = heading_labels(args.pdf_dir / 'gst-hsn-heading-labels.pdf')
    target.write_text('// Generated by scripts/generate-gst-rate-data.py. Do not hand-edit; see docs/gst-rate-data.md.\n// [id, tariff heading text, full entry description/conditions, total GST %, schedule, serial, source ID, PDF page]\nexport const GST_GOODS_DATA: readonly (readonly [string, string, string, number, string, string, string, number])[] = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\nexport const GST_HEADING_LABELS: Readonly<Record<string, string>> = ' + json.dumps(labels, ensure_ascii=False, separators=(',', ':')) + ';\n')
    hashes = {path.name: hashlib.sha256(path.read_bytes()).hexdigest() for path in [args.pdf_dir / 'gst-rates-9-2025-igst.pdf', args.pdf_dir / 'gst-1010437.pdf', args.pdf_dir / 'gst-1010534.pdf', args.pdf_dir / 'gst-1010645.pdf', args.pdf_dir / 'gst-hsn-heading-labels.pdf']}
    (ROOT / 'docs/gst-rate-sources/manifest.json').write_text(json.dumps({'generatedOn': '2026-10-28', 'rows': len(data), 'sourceSHA256': hashes}, indent=2) + '\n')
    print(f'Generated {len(goods)} taxable and {len(exemptions)} exemption entries in {target.name}.')

if __name__ == '__main__': main()
