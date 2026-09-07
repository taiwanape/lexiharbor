import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const source = process.argv[2];
if (!source) throw new Error('Usage: node scripts/process-adaptive-icon.mjs <source.png>');

const output = resolve('assets/adaptive-icon.png');
await mkdir(dirname(output), { recursive: true });
await sharp(source)
  .resize(680, 680, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .extend({ top: 172, bottom: 172, left: 172, right: 172, background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9 })
  .toFile(output);

console.log(output);
