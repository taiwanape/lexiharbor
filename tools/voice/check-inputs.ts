// Tokenization-only audit. This intentionally does not synthesize or publish audio.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KokoroTTS, TextSplitterStream } from 'kokoro-js';
import { AutoTokenizer, env } from '@huggingface/transformers';
const toolDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(toolDir, '../..');
const manifest = JSON.parse(await readFile(path.join(root, 'src/data/naturalVoiceManifest.json'), 'utf8'));
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.useFSCache = false;
globalThis.fetch = async () => { throw new Error('Network forbidden in tokenization audit'); };
const tokenizer = await AutoTokenizer.from_pretrained(path.join(toolDir, '.model-cache', manifest.revision));
// Kokoro's phonemization is internal. Substitute only inference with a stub, so
// the real packaged preprocessing and splitter can be checked without re-synthesis.
const noInference = async () => ({ waveform: { data: new Float32Array(1) } });
const tts = new KokoroTTS(noInference as any, tokenizer);
let chunks = 0, maximumTokens = 0;
const normalizeSpace = (text: string) => text.replace(/\s+/g, ' ').trim();
for (const clip of manifest.clips) {
  const splitter = new TextSplitterStream();
  splitter.push(clip.text); splitter.close();
  const spokenText: string[] = [];
  for await (const chunk of tts.stream(splitter, { voice: 'af_heart', speed: 1 })) {
    spokenText.push(chunk.text);
    const tokens = tokenizer(chunk.phonemes, { truncation: false }).input_ids.dims.at(-1)!;
    if (tokens > 512) throw new Error(`Input would be truncated: ${clip.id} (${tokens} tokens)`);
    maximumTokens = Math.max(maximumTokens, tokens);
    chunks++;
  }
  if (normalizeSpace(spokenText.join(' ')) !== normalizeSpace(clip.text)) throw new Error(`Splitter dropped source text: ${clip.id}`);
}
console.log(JSON.stringify({ clips: manifest.clips.length, speechChunks: chunks, maximumTokens, tokenizerLimit: 512,
  sourceTextPreserved: true, inputTruncation: false, inferenceRun: false }, null, 2));
