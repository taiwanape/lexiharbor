import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KokoroTTS, TextSplitterStream } from 'kokoro-js';
import { AutoTokenizer, StyleTextToSpeech2Model, env } from '@huggingface/transformers';
import { inspectWav, encodePcm16 } from './verify.mjs';

const require = createRequire(import.meta.url);
const { learningSample } = require('../../src/data/learningSample.ts') as typeof import('../../src/data/learningSample');
const { readingSamples } = require('../../src/data/readingSamples.ts') as typeof import('../../src/data/readingSamples');
const { tokenizeReading, extractContext } = require('../../src/domain/reading.ts') as typeof import('../../src/domain/reading');
const toolDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(toolDir, '../..');
const modelId = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const revision = '1939ad2a8e416c0acfeecc08a694d14ef25f2231';
const codeRevision = 'dfb907a02bba8152ca444717ca5d78747ccb4bec';
const voice = 'af_heart';
const speed = 1;
const offline = process.argv.includes('--offline');
if (offline) globalThis.fetch = async () => { throw new Error('Network access forbidden in --offline verification'); };
const cache = path.join(toolDir, '.model-cache', revision);
const audioDir = path.join(root, 'public/audio');
const manifestFile = path.join(root, 'src/data/naturalVoiceManifest.json');
const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const expected = {
  'onnx/model_quantized.onnx': 'fbae9257e1e05ffc727e951ef9b9c98418e6d79f1c9b6b13bd59f5c9028a1478',
  'voices/af_heart.bin': 'd583ccff3cdca2f7fae535cb998ac07e9fcb90f09737b9a41fa2734ec44a8f0b',
};
const assetRecords: { path: string; url: string; sha256: string; bytes: number }[] = [];
async function writeAtomic(file: string, contents: string) {
  const temporary = `${file}.voice-build.tmp`;
  await writeFile(temporary, contents);
  await rename(temporary, file);
}

async function download(relativePath: string, url: string, expectedHash?: string) {
  const output = path.join(cache, relativePath);
  let data: Buffer;
  try { data = await readFile(output); }
  catch {
    if (offline) throw new Error(`Missing cached asset in offline mode: ${relativePath}`);
    console.log(`Downloading ${relativePath}`);
    const response = await fetch(url, { signal: AbortSignal.timeout(180_000) });
    if (!response.ok) throw new Error(`Download failed: ${relativePath} (${response.status})`);
    data = Buffer.from(await response.arrayBuffer());
    if (expectedHash && sha256(data) !== expectedHash) throw new Error(`Hash mismatch: ${relativePath}`);
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, data);
  }
  const hash = sha256(data);
  if (expectedHash && hash !== expectedHash) throw new Error(`Cached file hash mismatch: ${relativePath}`);
  assetRecords.push({ path: relativePath, url, sha256: hash, bytes: data.length });
  return data;
}

type Input = { text: string; kind: 'article' | 'sentence' | 'example' | 'sample'; sourceId: string };
const candidates: Input[] = [{ text: 'Hello, welcome to LexiHarbor.', kind: 'sample', sourceId: 'lexiharbor-voice-preview' }];
for (const article of readingSamples) {
  candidates.push({ text: article.body, kind: 'article', sourceId: article.id });
  const contexts = new Set(tokenizeReading(article.body).filter(token => token.isWord)
    .map(token => extractContext(article.body, token.start, token.end)));
  for (const text of contexts) candidates.push({ text, kind: 'sentence', sourceId: article.id });
}
for (const word of learningSample) for (const definition of word.definitions) {
  candidates.push({ text: definition.example, kind: 'example', sourceId: word.id });
}
const uniqueInputs = [...new Map(candidates.map(input => [input.text, input])).values()];
const smoke = process.argv.includes('--smoke');
const selected = process.argv.includes('--welcome') ? uniqueInputs.filter(input => input.kind === 'sample') : smoke ? [
  uniqueInputs.find(input => input.text === 'I went to the bank to open a savings account.')!,
  uniqueInputs.find(input => input.text === 'We sat on the river bank and watched the ducks.')!,
  uniqueInputs.find(input => input.text === 'Could we move our meeting to Friday?')!,
] : uniqueInputs;
if (selected.some(input => !input)) throw new Error('Smoke input no longer exists in source text.');

await mkdir(audioDir, { recursive: true });
for (const file of ['config.json', 'tokenizer.json', 'tokenizer_config.json', 'onnx/model_quantized.onnx', 'voices/af_heart.bin', 'README.md']) {
  await download(file, `https://huggingface.co/${modelId}/resolve/${revision}/${file}`, expected[file as keyof typeof expected]);
}
const license = await download('licenses/Apache-2.0.txt', `https://raw.githubusercontent.com/hexgrad/kokoro/${codeRevision}/LICENSE`);
const modelCard = await download('licenses/Kokoro-model-card.md', 'https://huggingface.co/hexgrad/Kokoro-82M/resolve/f3ff3571791e39611d31c381e3a41a3af07b4987/README.md');
await writeFile(path.join(audioDir, 'Apache-2.0.txt'), license);
await writeFile(path.join(audioDir, 'Kokoro-model-card.md'), modelCard);
await writeFile(path.join(audioDir, 'Kokoro-ONNX-model-card.md'), await readFile(path.join(cache, 'README.md')));

// Node Kokoro uses voices distributed in its NPM package. Verify that the actual
// voice is byte-identical to the selected pinned model snapshot before synthesis.
const voiceFile = path.resolve(path.dirname(require.resolve('kokoro-js')), '../voices/af_heart.bin');
if (sha256(await readFile(voiceFile)) !== expected['voices/af_heart.bin']) throw new Error('Installed Kokoro voice does not match pinned snapshot.');

env.allowRemoteModels = false;
env.allowLocalModels = true;
env.useFSCache = false;
env.cacheDir = path.join(toolDir, '.model-cache');
console.log('Loading pinned local model on CPU (no synthesis API requests).');
const model = await StyleTextToSpeech2Model.from_pretrained(cache, { dtype: 'q8', device: 'cpu' });
const tokenizer = await AutoTokenizer.from_pretrained(cache);
const tts = new KokoroTTS(model, tokenizer);
let existing: any[] = [];
try {
  const prior = JSON.parse(await readFile(manifestFile, 'utf8'));
  if (prior.revision === revision && prior.version === 1) existing = prior.clips;
} catch { /* First generation. */ }
const clips = new Map(existing.map(clip => [clip.id, clip]));
const currentIds = new Set(uniqueInputs.map(input => sha256(JSON.stringify({ text: input.text, voice, revision, speed })).slice(0, 24)));
for (const id of clips.keys()) if (!currentIds.has(id)) clips.delete(id);

async function saveManifest() {
  const result = {
    version: 1, provider: 'Kokoro', model: modelId, revision, dtype: 'q8', sampleRate: 24000,
    generatedAt: new Date().toISOString(), voice, language: 'en-US', license: 'Apache-2.0',
    processing: { version: 1, chunkGapMs: 100, outputFormat: 'WAV PCM16', peakCeiling: 0.95 },
    disclosure: 'AI-generated speech, not human narration. Automated signal checks only; human pronunciation and listening review pending.',
    source: { originalModel: 'https://huggingface.co/hexgrad/Kokoro-82M', modelSnapshot: `https://huggingface.co/${modelId}/tree/${revision}`,
      codeReference: `https://github.com/hexgrad/kokoro/tree/${codeRevision}`, package: 'kokoro-js@1.2.1',
      packageIntegrity: 'sha512-oq0HZJWis3t8lERkMJh84WLU86dpYD0EuBPtqYnLlQzyFP1OkyBRDcweAqCfhNOpltyN9j/azp1H6uuC47gShw==',
      inputTexts: 'LexiHarbor original practice texts and learning examples',
      assets: assetRecords },
    clips: [...clips.values()].sort((a, b) => a.id.localeCompare(b.id)),
  };
  await writeAtomic(manifestFile, JSON.stringify(result, null, 2) + '\n');
  await writeAtomic(path.join(audioDir, 'manifest.json'), JSON.stringify(result, null, 2) + '\n');
}
try {
  let index = 0;
  for (const input of selected) {
    const id = sha256(JSON.stringify({ text: input.text, voice, revision, speed })).slice(0, 24);
    const relativePath = `audio/${voice}-${id}.wav`;
    const output = path.join(root, 'public', relativePath);
    const old = clips.get(id);
    if (old) {
      try {
        const wav = await readFile(output);
        if (sha256(wav) === old.sha256) { inspectWav(wav); console.log(`Reuse ${++index}/${selected.length} ${input.kind}`); continue; }
      } catch { /* Regenerate a missing or invalid prior clip. */ }
    }
    const started = performance.now();
    // Stream splits paragraphs/sentences before tokenization, avoiding whole-article truncation.
    const parts: Float32Array[] = [];
    const splitter = new TextSplitterStream();
    splitter.push(input.text);
    splitter.close();
    for await (const chunk of tts.stream(splitter, { voice, speed })) parts.push(chunk.audio.audio);
    if (!parts.length) throw new Error(`No generated chunks: ${input.text}`);
    const gap = new Float32Array(2400); // 100 ms between generated sentence chunks.
    const length = parts.reduce((sum, part) => sum + part.length, 0) + gap.length * (parts.length - 1);
    const combined = new Float32Array(length);
    let offset = 0;
    parts.forEach((part, i) => { combined.set(part, offset); offset += part.length; if (i < parts.length - 1) offset += gap.length; });
    let maxAmplitude = 0;
    for (const sample of combined) {
      if (!Number.isFinite(sample)) throw new Error('Non-finite generated waveform');
      maxAmplitude = Math.max(maxAmplitude, Math.abs(sample));
    }
    const gain = maxAmplitude > 0.95 ? 0.95 / maxAmplitude : 1;
    if (gain !== 1) for (let i = 0; i < combined.length; i++) combined[i] *= gain;
    await writeFile(output, encodePcm16(combined));
    const wav = await readFile(output);
    const signal = inspectWav(wav);
    const wordCount = input.text.trim().split(/\s+/).length;
    if (signal.duration < Math.max(0.3, wordCount / 9) || signal.duration > Math.max(6, wordCount * 1.7)) throw new Error(`Suspicious speech length: ${input.text}`);
    clips.set(id, { id, ...input, language: 'en-US', voice, path: relativePath, speed,
      sha256: sha256(wav), bytes: wav.length, gain, ...signal, humanListeningReview: 'pending' });
    await saveManifest();
    console.log(`Generated ${++index}/${selected.length} ${input.kind} ${signal.duration.toFixed(2)}s in ${((performance.now() - started) / 1000).toFixed(1)}s: ${relativePath}`);
  }
  await saveManifest();
  console.log(`Complete: ${clips.size} verified waveform files. Human listening review remains pending.`);
} finally { await model.dispose(); }
