import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export function encodePcm16(samples) {
  const wav = Buffer.alloc(44 + samples.length * 2);
  wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVE', 8);
  wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22); wav.writeUInt32LE(24000, 24); wav.writeUInt32LE(48000, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) {
    if (!Number.isFinite(samples[i])) throw new Error('Non-finite waveform sample');
    wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  }
  return wav;
}

export function inspectWav(buffer) {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') throw new Error('Not a WAV file');
  let format, channels, sampleRate, bits, pcm;
  for (let offset = 12; offset + 8 <= buffer.length;) {
    const type = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (start + size > buffer.length) throw new Error('Truncated WAV chunk');
    if (type === 'fmt ') { format = buffer.readUInt16LE(start); channels = buffer.readUInt16LE(start + 2); sampleRate = buffer.readUInt32LE(start + 4); bits = buffer.readUInt16LE(start + 14); }
    if (type === 'data') pcm = buffer.subarray(start, start + size);
    offset = start + size + size % 2;
  }
  if (format !== 1 || channels !== 1 || sampleRate !== 24000 || bits !== 16 || !pcm?.length || pcm.length % 2) throw new Error('Unexpected WAV encoding');
  let peak = 0, sum = 0, active = 0, clipped = 0;
  for (let i = 0; i < pcm.length; i += 2) {
    const value = pcm.readInt16LE(i) / 32768;
    peak = Math.max(peak, Math.abs(value)); sum += value * value;
    if (Math.abs(value) > 0.003) active++;
    if (Math.abs(value) >= 0.999) clipped++;
  }
  const count = pcm.length / 2;
  const result = { duration: count / sampleRate, sampleRate, channels, peak, rms: Math.sqrt(sum / count), activeRatio: active / count, clippingRatio: clipped / count };
  if (result.duration < 0.3 || result.duration > 180 || result.rms < 0.003 || result.activeRatio < 0.04 || result.clippingRatio > 0.01) throw new Error(`Signal check failed: ${JSON.stringify(result)}`);
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const manifest = JSON.parse(await readFile(path.join(root, 'src/data/naturalVoiceManifest.json'), 'utf8'));
  if (manifest.version !== 1 || !manifest.clips.length) throw new Error('Empty voice manifest');
  const ids = new Set();
  let bytes = 0, duration = 0;
  for (const clip of manifest.clips) {
    if (!/^audio\/af_heart-[a-f0-9]{24}\.wav$/.test(clip.path) || ids.has(clip.id)) throw new Error('Invalid or duplicate clip');
    ids.add(clip.id);
    const wav = await readFile(path.join(root, 'public', clip.path));
    if (createHash('sha256').update(wav).digest('hex') !== clip.sha256 || wav.length !== clip.bytes) throw new Error(`Hash/size mismatch: ${clip.path}`);
    const signal = inspectWav(wav);
    if (Math.abs(signal.duration - clip.duration) > 0.0001) throw new Error('Duration mismatch');
    duration += signal.duration; bytes += wav.length;
  }
  console.log(JSON.stringify({ clips: ids.size, bytes, durationSeconds: duration, automatedSignalChecks: 'passed', humanListeningReview: 'pending' }, null, 2));
}
