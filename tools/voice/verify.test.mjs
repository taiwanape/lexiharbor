import test from 'node:test';
import assert from 'node:assert/strict';
import { encodePcm16, inspectWav } from './verify.mjs';

const tone = () => Float32Array.from({ length: 24000 }, (_, i) => 0.2 * Math.sin(i * 2 * Math.PI * 220 / 24000));
test('PCM16 encode and signal inspection preserve duration and reject corrupt chunks', () => {
  const wav = encodePcm16(tone());
  const result = inspectWav(wav);
  assert.equal(result.duration, 1);
  assert.equal(result.sampleRate, 24000);
  assert.ok(result.rms > 0.1 && result.rms < 0.2);
  assert.throws(() => inspectWav(wav.subarray(0, 100)), /Truncated/);
});
test('reject silence, non-finite samples, and very short files', () => {
  assert.throws(() => inspectWav(encodePcm16(new Float32Array(24000))), /Signal check failed/);
  assert.throws(() => encodePcm16(new Float32Array([NaN])), /Non-finite/);
  assert.throws(() => inspectWav(encodePcm16(tone().slice(0, 2000))), /Signal check failed/);
});
test('reject heavily clipped output and unknown file headers', () => {
  const wav = encodePcm16(new Float32Array(24000).fill(1));
  assert.throws(() => inspectWav(wav), /Signal check failed/);
  assert.throws(() => inspectWav(Buffer.alloc(44)), /Not a WAV/);
});
