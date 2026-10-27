/** Validate raster bytes before the browser's image decoder sees them. */
export type RasterInfo = { kind: 'png' | 'jpeg' | 'webp' | 'gif'; width: number; height: number };

export function inspectConverterRaster(bytes: Uint8Array): RasterInfo | null {
  const starts = (...values: number[]) => values.every((value, index) => bytes[index] === value);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let kind: RasterInfo['kind'];
  let width = 0;
  let height = 0;
  try {
    if (starts(137, 80, 78, 71, 13, 10, 26, 10)) {
      kind = 'png'; width = view.getUint32(16); height = view.getUint32(20);
    } else if (starts(255, 216, 255)) {
      kind = 'jpeg';
      let offset = 2;
      while (offset < bytes.length - 9) {
        if (bytes[offset++] !== 255) continue;
        while (bytes[offset] === 255) offset++;
        const marker = bytes[offset++];
        if (marker === 0xd9 || marker === 0xda) break;
        if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
        const length = view.getUint16(offset);
        if (length < 2) break;
        if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
          height = view.getUint16(offset + 3); width = view.getUint16(offset + 5); break;
        }
        offset += length;
      }
    } else if (starts(82, 73, 70, 70) && new TextDecoder().decode(bytes.subarray(8, 12)) === 'WEBP') {
      kind = 'webp';
      const chunk = new TextDecoder().decode(bytes.subarray(12, 16));
      if (chunk === 'VP8X' && bytes.length >= 30) {
        width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
        height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
      } else if (chunk === 'VP8 ' && bytes.length >= 30) {
        width = view.getUint16(26, true) & 0x3fff; height = view.getUint16(28, true) & 0x3fff;
      } else if (chunk === 'VP8L' && bytes.length >= 25 && bytes[20] === 0x2f) {
        width = 1 + bytes[21] + ((bytes[22] & 0x3f) << 8);
        height = 1 + (bytes[22] >> 6) + (bytes[23] << 2) + ((bytes[24] & 0x0f) << 10);
      }
    } else if (starts(71, 73, 70, 56, 55, 97) || starts(71, 73, 70, 56, 57, 97)) {
      kind = 'gif'; width = view.getUint16(6, true); height = view.getUint16(8, true);
    } else return null;
  } catch { throw new Error('This image has a damaged or incomplete header. Save a fresh PNG or JPG and try again.'); }
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) throw new Error('This image has invalid or unsupported dimensions. Save a fresh PNG or JPG.');
  if (width > 20_000 || height > 20_000 || width * height > 24_000_000) throw new Error('An image exceeds 24 megapixels or 20,000 pixels on one side. Resize it before adding it.');
  return { kind, width, height };
}

let previewQueue: Promise<unknown> = Promise.resolve();

/** Previews are small re-encoded PNGs, never the unvalidated original blob. */
export function createConverterThumbnail(file: File): Promise<Blob> {
  const task = previewQueue.then(async () => {
    if (!file.size || file.size > 5_000_000) throw new Error('Choose images totalling 5 MB or less.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const image = inspectConverterRaster(bytes);
    const extension = file.name.split('.').pop()?.toLowerCase();
    const expected = extension === 'jpg' || extension === 'jpeg' ? 'jpeg' : extension;
    if (!image || image.kind === 'gif' || image.kind !== expected) throw new Error('The image contents do not match its PNG, JPG or WebP extension. Choose the original file.');
    const ratio = Math.min(1, 180 / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * ratio));
    const height = Math.max(1, Math.round(image.height * ratio));
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Your browser could not prepare an image preview.');
    let bitmap: ImageBitmap | undefined;
    let objectUrl: string | undefined;
    let fallback: HTMLImageElement | undefined;
    try {
      if (typeof createImageBitmap === 'function') {
        bitmap = await createImageBitmap(new Blob([bytes as BlobPart], { type: `image/${image.kind}` }), { resizeWidth: width, resizeHeight: height, imageOrientation: 'from-image' });
        context.drawImage(bitmap, 0, 0, width, height);
      } else {
        objectUrl = URL.createObjectURL(new Blob([bytes as BlobPart], { type: `image/${image.kind}` }));
        fallback = new Image(); fallback.src = objectUrl;
        await fallback.decode();
        context.drawImage(fallback, 0, 0, width, height);
      }
      return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('This image could not be previewed. Save a fresh PNG or JPG.')), 'image/png'));
    } finally {
      bitmap?.close();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      if (fallback) fallback.src = '';
      canvas.width = 0; canvas.height = 0;
    }
  });
  previewQueue = task.catch(() => {});
  return task;
}
