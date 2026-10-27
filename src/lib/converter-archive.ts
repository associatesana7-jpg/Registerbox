/** Bounded ZIP reader shared by the local file converters. */
export type ConverterArchiveEntry = {
  name: string;
  compressedSize: number;
  uncompressedSize: number;
  compression: 0 | 8;
};

export type ConverterArchiveOptions = {
  maxUncompressedBytes: number;
  maxEntries?: number;
  maxArchiveBytes?: number;
  filter?: (entry: ConverterArchiveEntry) => boolean;
};

type Entry = ConverterArchiveEntry & {
  crc: number;
  offset: number;
  dataOffset: number;
  end: number;
  flags: number;
  rawName: Uint8Array;
};

const invalid = () => new Error('This archive is damaged or has inconsistent file metadata. Save a fresh copy and try again.');
const unsupported = () => new Error('This archive uses unsupported ZIP features, encryption or ZIP64. Save an unencrypted standard Office file and try again.');
const expansion = () => new Error('This compressed file expands beyond the browser safety limit. Save a smaller file and try again.');
const crcTable = new Uint32Array(256);
for (let index = 0; index < 256; index++) {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  crcTable[index] = value >>> 0;
}

function updateCrc(crc: number, bytes: Uint8Array) {
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return crc >>> 0;
}

function decodeUtf8(bytes: Uint8Array) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { throw invalid(); }
}

function sameBytes(a: Uint8Array, b: Uint8Array) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function parseExtra(bytes: Uint8Array, rawName: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let unicodeName: string | undefined;
  for (let offset = 0; offset < bytes.length;) {
    if (offset + 4 > bytes.length) throw invalid();
    const kind = view.getUint16(offset, true);
    const length = view.getUint16(offset + 2, true);
    offset += 4;
    if (offset + length > bytes.length) throw invalid();
    if (kind === 0x0001 || kind === 0x9901) throw unsupported();
    if (kind === 0x7075) {
      if (length < 5 || bytes[offset] !== 1 || view.getUint32(offset + 1, true) !== (updateCrc(0xffffffff, rawName) ^ 0xffffffff) >>> 0) throw invalid();
      const name = decodeUtf8(bytes.subarray(offset + 5, offset + length));
      if (unicodeName !== undefined && unicodeName !== name) throw invalid();
      unicodeName = name;
    }
    offset += length;
  }
  return unicodeName;
}

function canonicalPath(name: string) {
  const normalized = name.normalize('NFC');
  const parts = normalized.split('/');
  if (!normalized || normalized.length > 1_024 || /[\\\u0000-\u001f\u007f]/.test(normalized) || normalized.startsWith('/') || /^[a-z]:/i.test(normalized)
    || parts.some((part, index) => part === '.' || part === '..' || (!part && index < parts.length - 1))) {
    throw new Error('This archive contains an unsafe or ambiguous file path. Save a fresh standard Office file and try again.');
  }
  return normalized;
}

function validLimit(value: number) { return Number.isSafeInteger(value) && value > 0; }

/**
 * Checks both ZIP directories and actual streamed output. Filtered entries are
 * still validated and decompressed against the common budget, but not retained.
 */
export async function unzipConverterArchive(bytes: Uint8Array, options: ConverterArchiveOptions): Promise<Record<string, Uint8Array>> {
  const maxEntries = options.maxEntries ?? 2_000;
  const maxArchiveBytes = options.maxArchiveBytes ?? 5_000_000;
  if (!validLimit(options.maxUncompressedBytes) || !validLimit(maxEntries) || !validLimit(maxArchiveBytes)) throw new Error('Invalid archive processing limits.');
  if (bytes.length > maxArchiveBytes) throw new Error('Files must total 5 MB or less (5,000,000 bytes).');
  if (bytes.length < 22) throw invalid();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = (offset: number) => view.getUint16(offset, true);
  const u32 = (offset: number) => view.getUint32(offset, true);
  let eocd = -1;
  for (let offset = bytes.length - 22, minimum = Math.max(0, bytes.length - 65_557); offset >= minimum; offset--) {
    if (u32(offset) === 0x06054b50 && offset + 22 + u16(offset + 20) === bytes.length) { eocd = offset; break; }
  }
  if (eocd < 0) throw invalid();
  const count = u16(eocd + 10);
  const directorySize = u32(eocd + 12);
  const directoryStart = u32(eocd + 16);
  if (u16(eocd + 4) || u16(eocd + 6) || u16(eocd + 8) !== count || count === 0xffff || directorySize === 0xffffffff || directoryStart === 0xffffffff || (eocd >= 20 && u32(eocd - 20) === 0x07064b50)) throw unsupported();
  if (count > maxEntries) throw new Error(`This archive contains over ${maxEntries.toLocaleString()} files. Save a smaller file and try again.`);
  if (directoryStart + directorySize !== eocd || directoryStart > eocd) throw invalid();
  const entries: Entry[] = [];
  const paths = new Set<string>();
  let directoryOffset = directoryStart;
  let declaredTotal = 0;
  for (let index = 0; index < count; index++) {
    if (directoryOffset + 46 > eocd || u32(directoryOffset) !== 0x02014b50) throw invalid();
    const flags = u16(directoryOffset + 8);
    const compression = u16(directoryOffset + 10);
    const crc = u32(directoryOffset + 16);
    const compressedSize = u32(directoryOffset + 20);
    const uncompressedSize = u32(directoryOffset + 24);
    const nameLength = u16(directoryOffset + 28);
    const extraLength = u16(directoryOffset + 30);
    const commentLength = u16(directoryOffset + 32);
    const offset = u32(directoryOffset + 42);
    if ((flags & ~0x080e) || (compression !== 0 && compression !== 8) || u16(directoryOffset + 34) || compressedSize === 0xffffffff || uncompressedSize === 0xffffffff || offset === 0xffffffff) throw unsupported();
    if (compression === 0 && (flags & 6 || compressedSize !== uncompressedSize)) throw invalid();
    const endOfCentral = directoryOffset + 46 + nameLength + extraLength + commentLength;
    if (!nameLength || endOfCentral > eocd || compressedSize > bytes.length || offset + 30 > directoryStart) throw invalid();
    const rawName = bytes.subarray(directoryOffset + 46, directoryOffset + 46 + nameLength);
    const unicodeName = parseExtra(bytes.subarray(directoryOffset + 46 + nameLength, directoryOffset + 46 + nameLength + extraLength), rawName);
    // Standard Office paths are ASCII or marked UTF-8. An authenticated Unicode
    // path extra field is also accepted and repacked with an unambiguous name.
    if (!(flags & 0x0800) && rawName.some((byte) => byte >= 128) && unicodeName === undefined) throw unsupported();
    const decoded = flags & 0x0800 ? decodeUtf8(rawName) : unicodeName ?? decodeUtf8(rawName);
    if (unicodeName !== undefined && flags & 0x0800 && unicodeName.normalize('NFC') !== decoded.normalize('NFC')) throw invalid();
    const name = canonicalPath(decoded);
    const key = name.toLocaleLowerCase('en-US').replace(/\/$/, '');
    if (paths.has(key)) throw new Error('This archive contains duplicate or ambiguous file paths. Save a fresh copy and try again.');
    paths.add(key);
    declaredTotal += uncompressedSize;
    if (declaredTotal > options.maxUncompressedBytes) throw expansion();
    if (u32(offset) !== 0x04034b50 || u16(offset + 6) !== flags || u16(offset + 8) !== compression) throw invalid();
    const localNameLength = u16(offset + 26);
    const localExtraLength = u16(offset + 28);
    const dataOffset = offset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataOffset + compressedSize;
    if (dataOffset > directoryStart || dataEnd > directoryStart || !sameBytes(rawName, bytes.subarray(offset + 30, offset + 30 + localNameLength))) throw invalid();
    const localUnicode = parseExtra(bytes.subarray(offset + 30 + localNameLength, dataOffset), rawName);
    if (localUnicode !== undefined && canonicalPath(localUnicode) !== name) throw invalid();
    const localCrc = u32(offset + 14);
    const localCompressed = u32(offset + 18);
    const localUncompressed = u32(offset + 22);
    let end = dataEnd;
    if (flags & 8) {
      if ((localCrc && localCrc !== crc) || (localCompressed && localCompressed !== compressedSize) || (localUncompressed && localUncompressed !== uncompressedSize)) throw invalid();
      if (end + 12 > directoryStart) throw invalid();
      if (u32(end) === 0x08074b50) end += 4;
      if (end + 12 > directoryStart || u32(end) !== crc || u32(end + 4) !== compressedSize || u32(end + 8) !== uncompressedSize) throw invalid();
      end += 12;
    } else if (localCrc !== crc || localCompressed !== compressedSize || localUncompressed !== uncompressedSize) throw invalid();
    if (name.endsWith('/') && uncompressedSize) throw invalid();
    entries.push({ name, compression, compressedSize, uncompressedSize, crc, offset, dataOffset, end, flags, rawName });
    directoryOffset = endOfCentral;
  }
  if (directoryOffset !== directoryStart + directorySize) throw invalid();
  const spans = [...entries].sort((a, b) => a.offset - b.offset);
  for (let index = 1; index < spans.length; index++) if (spans[index].offset < spans[index - 1].end) throw invalid();
  const filePaths = new Set(entries.filter((entry) => !entry.name.endsWith('/')).map((entry) => entry.name.toLocaleLowerCase('en-US')));
  for (const entry of entries) {
    const parts = entry.name.toLocaleLowerCase('en-US').split('/');
    for (let index = 1; index < parts.length; index++) if (filePaths.has(parts.slice(0, index).join('/'))) throw invalid();
  }
  const { Inflate } = await import('fflate');
  const output: Record<string, Uint8Array> = Object.create(null);
  let actualTotal = 0;
  let lastYield = Date.now();
  for (const entry of entries) {
    const retain = !options.filter || options.filter(entry);
    const parts: Uint8Array[] = [];
    let actualSize = 0;
    let crc = 0xffffffff;
    const receive = (chunk: Uint8Array) => {
      actualSize += chunk.length;
      actualTotal += chunk.length;
      if (actualSize > entry.uncompressedSize) throw invalid();
      if (actualTotal > options.maxUncompressedBytes) throw expansion();
      crc = updateCrc(crc, chunk);
      if (retain && chunk.length) parts.push(chunk);
    };
    if (entry.compression === 0) {
      for (let offset = 0; offset < entry.compressedSize; offset += 65_536) {
        receive(bytes.subarray(entry.dataOffset + offset, entry.dataOffset + Math.min(offset + 65_536, entry.compressedSize)));
        if (Date.now() - lastYield > 12) { await new Promise<void>((resolve) => setTimeout(resolve, 0)); lastYield = Date.now(); }
      }
    } else {
      const inflater = new Inflate(receive);
      try {
        if (!entry.compressedSize) throw invalid();
        // A tiny compressed feed bounds one inflate allocation even when ZIP
        // metadata deliberately understates the real output size.
        for (let offset = 0; offset < entry.compressedSize; offset += 512) {
          const end = Math.min(offset + 512, entry.compressedSize);
          inflater.push(bytes.subarray(entry.dataOffset + offset, entry.dataOffset + end), end === entry.compressedSize);
          if (Date.now() - lastYield > 12) { await new Promise<void>((resolve) => setTimeout(resolve, 0)); lastYield = Date.now(); }
        }
      } catch (error) {
        if (error instanceof Error && /archive|safety limit/.test(error.message)) throw error;
        throw invalid();
      }
    }
    if (actualSize !== entry.uncompressedSize || ((crc ^ 0xffffffff) >>> 0) !== entry.crc) throw invalid();
    if (retain) {
      const data = new Uint8Array(actualSize);
      let offset = 0;
      for (const part of parts) { data.set(part, offset); offset += part.length; }
      output[entry.name] = data;
    }
    if (Date.now() - lastYield > 12) { await new Promise<void>((resolve) => setTimeout(resolve, 0)); lastYield = Date.now(); }
  }
  return output;
}
