export type ImageDimensions = { width: number; height: number };

const validDimensions = (width: number, height: number): ImageDimensions | null => (
  Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0 && width <= 50_000 && height <= 50_000
    ? { width, height }
    : null
);

const parsePng = (buffer: Buffer) => {
  if (buffer.length < 24 || buffer.toString('ascii', 1, 4) !== 'PNG') return null;
  return validDimensions(buffer.readUInt32BE(16), buffer.readUInt32BE(20));
};

const parseJpeg = (buffer: Buffer) => {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  const frameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;

  while (offset + 4 <= buffer.length) {
    while (offset < buffer.length && buffer[offset] === 0xff) offset += 1;
    const marker = buffer[offset];
    offset += 1;
    if (marker === undefined || marker === 0xd9 || marker === 0xda) return null;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > buffer.length) return null;
    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length) return null;
    if (frameMarkers.has(marker)) {
      if (length < 7) return null;
      return validDimensions(buffer.readUInt16BE(offset + 5), buffer.readUInt16BE(offset + 3));
    }
    offset += length;
  }

  return null;
};

const readUInt24LE = (buffer: Buffer, offset: number) => (
  buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16)
);

const parseWebp = (buffer: Buffer) => {
  if (buffer.length < 16 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') return null;
  let offset = 12;

  while (offset + 8 <= buffer.length) {
    const chunk = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const dataOffset = offset + 8;
    if (dataOffset + chunkSize > buffer.length) return null;

    if (chunk === 'VP8X' && chunkSize >= 10) {
      return validDimensions(readUInt24LE(buffer, dataOffset + 4) + 1, readUInt24LE(buffer, dataOffset + 7) + 1);
    }
    if (chunk === 'VP8L' && chunkSize >= 5 && buffer[dataOffset] === 0x2f) {
      const bits = buffer.readUInt32LE(dataOffset + 1);
      return validDimensions((bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1);
    }
    if (chunk === 'VP8 ' && chunkSize >= 10 && buffer[dataOffset + 3] === 0x9d && buffer[dataOffset + 4] === 0x01 && buffer[dataOffset + 5] === 0x2a) {
      return validDimensions(buffer.readUInt16LE(dataOffset + 6) & 0x3fff, buffer.readUInt16LE(dataOffset + 8) & 0x3fff);
    }
    offset = dataOffset + chunkSize + (chunkSize % 2);
  }

  return null;
};

export const readImageDimensions = (buffer: Buffer): ImageDimensions => {
  const dimensions = parsePng(buffer) || parseJpeg(buffer) || parseWebp(buffer);
  if (!dimensions) throw new Error('UNREADABLE_IMAGE_DIMENSIONS');
  return dimensions;
};
