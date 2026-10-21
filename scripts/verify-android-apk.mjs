#!/usr/bin/env node
/**
 * Verify APK Signature Scheme v2 without downloading or exporting a signing key.
 * Format and digest rules: https://source.android.com/docs/security/features/apksigning/v2
 * Uses only Node's built-in crypto module. Rejects ZIP64/multidisk APKs.
 */
import { createHash, createPublicKey, verify, constants, X509Certificate } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const assert = (condition, message) => { if (!condition) throw Error(message); };
const hash = (algorithm, value) => createHash(algorithm).update(value).digest();
const u32 = (buffer, offset) => { assert(offset >= 0 && offset + 4 <= buffer.length, 'Truncated APK signature field.'); return buffer.readUInt32LE(offset); };
const u64 = (buffer, offset) => {
  assert(offset >= 0 && offset + 8 <= buffer.length, 'Truncated APK signing block.');
  const value = buffer.readBigUInt64LE(offset);
  assert(value <= BigInt(Number.MAX_SAFE_INTEGER), 'APK signing block is too large.');
  return Number(value);
};
const lp = (buffer, offset = 0) => {
  const length = u32(buffer, offset), end = offset + 4 + length;
  assert(end <= buffer.length, 'Truncated APK signature value.');
  return { value: buffer.subarray(offset + 4, end), end };
};
const fields = (buffer) => {
  const values = [];
  for (let offset = 0; offset < buffer.length;) { const item = lp(buffer, offset); values.push(item.value); offset = item.end; }
  return values;
};
const records = (buffer) => fields(buffer).map(item => {
  const algorithm = u32(item, 0), data = lp(item, 4);
  assert(data.end === item.length, 'Unexpected APK signature record data.');
  return { algorithm, value: data.value };
});
const algorithms = new Map([
  [0x0101, { digest: 'sha256', padding: constants.RSA_PKCS1_PSS_PADDING, saltLength: 32, strength: 3 }],
  [0x0102, { digest: 'sha512', padding: constants.RSA_PKCS1_PSS_PADDING, saltLength: 64, strength: 6 }],
  [0x0103, { digest: 'sha256', padding: constants.RSA_PKCS1_PADDING, strength: 2 }],
  [0x0104, { digest: 'sha512', padding: constants.RSA_PKCS1_PADDING, strength: 5 }],
  [0x0201, { digest: 'sha256', strength: 3 }],
  [0x0202, { digest: 'sha512', strength: 6 }],
  [0x0301, { digest: 'sha256', strength: 1 }],
]);

export function verifyAndroidApk(path) {
  const apk = readFileSync(path);
  let eocd = -1;
  for (let offset = apk.length - 22; offset >= Math.max(0, apk.length - 22 - 65535); offset--) {
    if (u32(apk, offset) === 0x06054b50 && offset + 22 + apk.readUInt16LE(offset + 20) === apk.length) { eocd = offset; break; }
  }
  assert(eocd >= 0, 'APK ZIP end record was not found.');
  assert(apk.readUInt16LE(eocd + 4) === 0 && apk.readUInt16LE(eocd + 6) === 0, 'Multidisk APKs are not supported.');
  const directorySize = u32(apk, eocd + 12), directory = u32(apk, eocd + 16);
  assert(directory !== 0xffffffff && directorySize !== 0xffffffff, 'ZIP64 APKs are not supported.');
  assert(directory + directorySize === eocd, 'APK ZIP directory is not immediately followed by its end record.');
  assert(directory >= 32 && apk.subarray(directory - 16, directory).equals(Buffer.from('APK Sig Block 42')), 'APK signing block was not found.');
  const blockSize = u64(apk, directory - 24), blockStart = directory - blockSize - 8;
  assert(blockStart >= 0 && u64(apk, blockStart) === blockSize, 'APK signing block sizes disagree.');
  const pairs = new Map();
  for (let offset = blockStart + 8; offset < directory - 24;) {
    const size = u64(apk, offset), end = offset + 8 + size;
    assert(size >= 4 && end <= directory - 24, 'APK signing block contains an invalid pair.');
    const id = u32(apk, offset + 8);
    assert(!pairs.has(id), 'APK signing block contains a duplicate identifier.');
    pairs.set(id, apk.subarray(offset + 12, end));
    offset = end;
  }
  const v2 = pairs.get(0x7109871a);
  assert(v2, 'APK Signature Scheme v2 was not found.');
  const signersField = lp(v2);
  assert(signersField.end === v2.length, 'Unexpected data after APK signer sequence.');
  const signers = fields(signersField.value);
  assert(signers.length > 0, 'APK has no signing identity.');
  const digestCache = new Map();
  const protectedDigest = (algorithm) => {
    if (digestCache.has(algorithm)) return digestCache.get(algorithm);
    const adjustedEnd = Buffer.from(apk.subarray(eocd));
    adjustedEnd.writeUInt32LE(blockStart, 16);
    const chunks = [];
    for (const section of [apk.subarray(0, blockStart), apk.subarray(directory, eocd), adjustedEnd]) {
      for (let offset = 0; offset < section.length; offset += 2 ** 20) {
        const chunk = section.subarray(offset, offset + 2 ** 20), header = Buffer.alloc(5);
        header[0] = 0xa5; header.writeUInt32LE(chunk.length, 1);
        chunks.push(createHash(algorithm).update(header).update(chunk).digest());
      }
    }
    const header = Buffer.alloc(5); header[0] = 0x5a; header.writeUInt32LE(chunks.length, 1);
    const result = createHash(algorithm).update(header).update(Buffer.concat(chunks)).digest();
    digestCache.set(algorithm, result);
    return result;
  };
  const verified = signers.map(signer => {
    const signedData = lp(signer), signaturesField = lp(signer, signedData.end), publicKeyField = lp(signer, signaturesField.end);
    assert(publicKeyField.end === signer.length, 'Unexpected APK signer data.');
    const signatures = records(signaturesField.value);
    const candidates = signatures.filter(s => algorithms.has(s.algorithm)).sort((a, b) => algorithms.get(b.algorithm).strength - algorithms.get(a.algorithm).strength);
    assert(candidates.length > 0, 'APK has no supported signature algorithm.');
    const selected = candidates[0], specification = algorithms.get(selected.algorithm);
    const key = createPublicKey({ key: publicKeyField.value, format: 'der', type: 'spki' });
    assert(verify(specification.digest, signedData.value, { key, ...(specification.padding ? { padding: specification.padding } : {}), ...(specification.saltLength ? { saltLength: specification.saltLength } : {}) }, selected.value), 'APK signing signature failed verification.');
    const digestsField = lp(signedData.value), certificatesField = lp(signedData.value, digestsField.end), attributesField = lp(signedData.value, certificatesField.end);
    assert(attributesField.end === signedData.value.length, 'Unexpected APK signed data.');
    const digests = records(digestsField.value);
    assert(JSON.stringify(digests.map(d => d.algorithm)) === JSON.stringify(signatures.map(s => s.algorithm)), 'APK signature algorithm lists disagree.');
    const digest = digests.find(d => d.algorithm === selected.algorithm);
    assert(digest && digest.value.equals(protectedDigest(specification.digest)), 'APK contents failed integrity verification.');
    const certificates = fields(certificatesField.value);
    assert(certificates.length > 0, 'APK signing certificate is missing.');
    const certificate = new X509Certificate(certificates[0]);
    assert(certificate.publicKey.export({ format: 'der', type: 'spki' }).equals(publicKeyField.value), 'APK certificate and signing public key disagree.');
    return { algorithmId: `0x${selected.algorithm.toString(16)}`, certificateSha256: hash('sha256', certificates[0]).toString('hex'), contentDigest: digest.value.toString('hex') };
  });
  return { path: resolve(path), bytes: apk.length, sha256: hash('sha256', apk).toString('hex'), apkSignatureSchemeV2: 'verified', signers: verified };
}

if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href) {
  try {
    assert(process.argv.length === 3, 'Usage: node scripts/verify-android-apk.mjs /absolute/path/to/app.apk');
    console.log(JSON.stringify(verifyAndroidApk(process.argv[2]), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
