import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { readingSamples } = require('../../src/data/readingSamples.ts') as typeof import('../../src/data/readingSamples');
const { learningSample } = require('../../src/data/learningSample.ts') as typeof import('../../src/data/learningSample');
const { tokenizeReading, extractContext } = require('../../src/domain/reading.ts') as typeof import('../../src/domain/reading');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const manifest = JSON.parse(await readFile(path.join(root, 'src/data/naturalVoiceManifest.json'), 'utf8'));
const expected = new Set(['Hello, welcome to LexiHarbor.']);
for (const article of readingSamples) {
  expected.add(article.body);
  for (const token of tokenizeReading(article.body).filter(token => token.isWord)) expected.add(extractContext(article.body, token.start, token.end));
}
for (const entry of learningSample) for (const definition of entry.definitions) expected.add(definition.example);
const found = new Set<string>();
for (const clip of manifest.clips) {
  const id = createHash('sha256').update(JSON.stringify({ text: clip.text, voice: clip.voice, revision: manifest.revision, speed: clip.speed })).digest('hex').slice(0, 24);
  if (id !== clip.id || found.has(clip.text) || !expected.has(clip.text)) throw new Error(`Unexpected, duplicate, or mismatched input: ${clip.id}`);
  found.add(clip.text);
}
for (const text of expected) if (!found.has(text)) throw new Error(`Missing natural audio: ${text}`);
const publicManifest = await readFile(path.join(root, 'public/audio/manifest.json'), 'utf8');
if (JSON.stringify(JSON.parse(publicManifest)) !== JSON.stringify(manifest)) throw new Error('Public and source manifests differ');
console.log(JSON.stringify({ currentInputCoverage: 'passed', uniqueTexts: found.size,
  fullArticles: manifest.clips.filter((clip: any) => clip.kind === 'article').length,
  readingSentences: manifest.clips.filter((clip: any) => clip.kind === 'sentence').length,
  examples: manifest.clips.filter((clip: any) => clip.kind === 'example').length,
  preview: manifest.clips.filter((clip: any) => clip.kind === 'sample').length }, null, 2));
