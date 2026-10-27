"""Regenerate compact IndicXlit native-word priors without storing the 850 MB ZIP.

Run manually when updating the pinned upstream model data:
    python3 scripts/generate-typing-lexicons.py kn hi
Omit languages to regenerate all entries in the committed manifest. Network
requests use fixed ZIP ranges; only the top 50,000 words are retained in memory.
Normal web builds use the checked-in .json.gz files and do not run this script.
"""
import gzip
import hashlib
import heapq
import json
from pathlib import Path
import struct
import sys
import urllib.request
import zlib

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / 'public/vendor/typing-lexicons'
MANIFEST_PATH = TARGET / 'native-lexicons-manifest.json'
manifest = json.loads(MANIFEST_PATH.read_text())
selected = set(sys.argv[1:] or [item['language'] for item in manifest['languages']])
known = {item['language'] for item in manifest['languages']}
if selected - known:
    raise SystemExit('Unsupported dictionary language: ' + ', '.join(sorted(selected - known)))

for item in manifest['languages']:
    language = item['language']
    if language not in selected:
        continue
    source = item['sourceEntry']
    offset, size = source['offset'], source['compressedBytes']
    request = urllib.request.Request(manifest['source'], headers={'Range': f'bytes={offset}-{offset + size + 512}'})
    with urllib.request.urlopen(request, timeout=180) as response:
        if response.status != 206:
            raise RuntimeError('Upstream did not honor the bounded dictionary range request.')
        header = response.read(30)
        if header[:4] != b'PK\x03\x04':
            raise RuntimeError('Unexpected upstream ZIP local header.')
        name_length, extra_length = struct.unpack_from('<HH', header, 26)
        name = response.read(name_length).decode('utf8')
        response.read(extra_length)
        if name != f'word_prob_dicts/{language}_word_prob_dict.json':
            raise RuntimeError('Upstream ZIP entry changed; review the manifest before updating.')
        inflater = zlib.decompressobj(-15)
        remaining, output_bytes, crc32, entries = size, 0, 0, 0
        pending = b''
        heap = []
        while remaining:
            compressed = response.read(min(262144, remaining))
            if not compressed:
                raise RuntimeError('Truncated dictionary stream.')
            remaining -= len(compressed)
            decoded = inflater.decompress(compressed)
            output_bytes += len(decoded)
            if output_bytes > source['uncompressedBytes']:
                raise RuntimeError('Upstream dictionary exceeded its declared size.')
            crc32 = zlib.crc32(decoded, crc32)
            rows = (pending + decoded).split(b'\n')
            pending = rows.pop()
            for row in rows:
                row = row.strip().rstrip(b',')
                if row in (b'', b'{', b'}'):
                    continue
                word, frequency = next(iter(json.loads(b'{' + row + b'}').items()))
                entries += 1
                value = (frequency, word)
                if len(heap) < 50000:
                    heapq.heappush(heap, value)
                elif value > heap[0]:
                    heapq.heapreplace(heap, value)
        if not inflater.eof or pending.strip(b'}\r\n '):
            raise RuntimeError('Incomplete dictionary JSON stream.')
        if output_bytes != source['uncompressedBytes'] or f'{crc32:08x}' != source['crc32']:
            raise RuntimeError('Upstream dictionary ZIP checksum or size changed.')
        if entries != item['sourceEntries']:
            raise RuntimeError('Upstream dictionary entry count changed.')
        data = json.dumps({word: float(f'{probability:.8g}') for probability, word in sorted(heap, reverse=True)}, ensure_ascii=False, separators=(',', ':')).encode('utf8')
        if hashlib.sha256(data).hexdigest() != item['json']['sha256']:
            raise RuntimeError('Regenerated JSON differs from the pinned artifact; review before updating.')
        compressed = gzip.compress(data, compresslevel=9, mtime=0)
        (TARGET / f'{language}.json.gz').write_bytes(compressed)
        item['gzip'] = {'bytes': len(compressed), 'sha256': hashlib.sha256(compressed).hexdigest()}
        print(f'{language}: {entries:,} source words -> {len(heap):,} compact entries, {len(compressed):,} gzip bytes', flush=True)
MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
