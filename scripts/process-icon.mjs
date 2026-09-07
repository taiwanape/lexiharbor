import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const source = process.argv[2];
if (!source) throw new Error('Usage: node scripts/process-icon.mjs <source.png>');

const output = resolve('assets/icon.png');
await mkdir(dirname(output), { recursive: true });
await sharp(source)
  .resize(1024, 1024, { fit: 'cover' })
  .flatten({ background: '#0F766E' })
  .png({ compressionLevel: 9 })
  .toFile(output);

console.log(output);
