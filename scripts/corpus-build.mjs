/** Reproducible research sample. Run with node scripts/corpus-build.mjs.
 * Downloads only the publisher's explicitly offered release archive and CC's license text.
 * First run establishes public/data/cedict-source.json; later runs enforce its hashes.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const archiveUrl = 'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz';
const licenseUrl = 'https://creativecommons.org/licenses/by-sa/4.0/legalcode.txt';
const hash = (value) => createHash('sha256').update(value).digest('hex');
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const readOptional = async (name) => readFile(path.join(root, name)).catch((error) => {
  if (error.code === 'ENOENT') return null;
  throw error;
});
async function obtain(url, filename, expectedHash) {
  let buffer = await readOptional(filename);
  if (!buffer) {
    const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`Download failed: ${response.status} ${url}`);
    buffer = Buffer.from(await response.arrayBuffer());
    if (expectedHash && hash(buffer) !== expectedHash) {
      throw new Error(`Published download changed: ${url}. Restore the pinned archive; do not silently update the source version.`);
    }
    await writeFile(path.join(root, filename), buffer);
  }
  if (expectedHash && hash(buffer) !== expectedHash) throw new Error(`Checksum mismatch: ${filename}`);
  return buffer;
}

export function parseCedict(text) {
  return text.split(/\r?\n/).filter((line) => line && !line.startsWith('#')).map((line, index) => {
    const match = /^(\S+) (\S+) \[([^\]]+)\] \/(.*)\/$/.exec(line);
    if (!match) throw new Error(`Unsupported CEDICT line ${index + 1}`);
    const [, traditional, simplified, pinyin, senses] = match;
    return {
      id: `cedict:${hash(`${traditional}\t${simplified}\t${pinyin}`).slice(0, 24)}`,
      traditional, simplified, pinyin, definitions: senses.split('/'),
      sourceLine: line,
    };
  });
}

async function main() {
  for (const directory of ['.corpus-cache', 'public/data', 'public/licenses', 'data-evaluation']) {
    await mkdir(path.join(root, directory), { recursive: true });
  }
  const priorBytes = await readOptional('public/data/cedict-source.json');
  const prior = priorBytes ? JSON.parse(priorBytes) : null;
  const archive = await obtain(archiveUrl, '.corpus-cache/cedict-release.txt.gz', prior?.archive.sha256);
  const original = gunzipSync(archive);
  const rawText = original.toString('utf8');
  const header = rawText.split(/\r?\n/).filter((line) => line.startsWith('#'));
  const releaseDate = header.find((line) => line.startsWith('#! date='))?.slice('#! date='.length);
  const declaredEntries = Number(header.find((line) => line.startsWith('#! entries='))?.slice('#! entries='.length));
  if (!releaseDate || !declaredEntries || !header.some((line) => line.includes('https://creativecommons.org/licenses/by-sa/4.0/'))) {
    throw new Error('Source header is missing the expected release metadata / license. Review before importing.');
  }
  const license = await obtain(licenseUrl, 'public/licenses/CC-BY-SA-4.0.txt', prior?.license.sha256);
  const licenseText = license.toString('utf8');
  if (!licenseText.startsWith('Attribution-ShareAlike 4.0 International') || !licenseText.includes('Section 8 -- Interpretation.')) {
    throw new Error('Full official CC BY-SA 4.0 license text was not obtained.');
  }
  const all = parseCedict(rawText);
  if (all.length !== declaredEntries) throw new Error(`Entry count mismatch: header ${declaredEntries}; parsed ${all.length}`);
  if (prior && hash(original) !== prior.original.sha256) throw new Error('Original data checksum mismatch.');
  const selectedHeadwords = JSON.parse(await readFile(path.join(root, 'data-evaluation/sample-headwords.json'), 'utf8'));
  const wanted = new Set(selectedHeadwords.headwords);
  const selected = all.filter((entry) => wanted.has(entry.traditional));
  if (selected.length < 300 || selected.length > 500) throw new Error(`Expected 300–500 sample entries, received ${selected.length}`);
  const entries = selected.map(({ sourceLine, ...entry }) => entry);
  if (new Set(entries.map((entry) => entry.id)).size !== entries.length) throw new Error('Duplicate source identities require explicit handling.');
  const sourceId = `cc-cedict-${releaseDate.slice(0, 10)}`;
  const generated = { schemaVersion: 1, sourceId, direction: 'zh-en', license: 'CC-BY-SA-4.0', entries };
  const sampleBytes = json(generated);
  const headerBytes = `${header.join('\n')}\n`;
  const selectedOriginal = `${headerBytes}# LexiHarbor research subset: selection only; full source header above describes the upstream full release.\n# Subset entries: ${selected.length}\n${selected.map((entry) => entry.sourceLine).join('\n')}\n`;
  const manifest = {
    schemaVersion: 1,
    sourceId,
    title: 'CC-CEDICT',
    attribution: 'CC-CEDICT contributors; published by MDBG. CC-CEDICT continues CEDICT, started by Paul Denisowski in 1997.',
    publisherPage: 'https://www.mdbg.net/chinese/dictionary?page=cedict',
    releasePolicy: 'https://cc-cedict.org/editor/editor.php?handler=Download',
    retrievedAt: prior?.retrievedAt ?? new Date().toISOString(),
    upstreamReleaseDate: releaseDate,
    upstreamEntryCount: all.length,
    archive: { url: archiveUrl, cachePath: '.corpus-cache/cedict-release.txt.gz', sha256: hash(archive), bytes: archive.length },
    original: { cachePath: '.corpus-cache/cedict-release.u8', sha256: hash(original), bytes: original.length },
    originalHeaderPath: 'public/data/cedict-original-header.txt',
    license: { id: 'CC-BY-SA-4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/', textUrl: licenseUrl, path: 'public/licenses/CC-BY-SA-4.0.txt', sha256: hash(license), bytes: license.length },
    changes: ['Selected requested Traditional Chinese headwords into a small development subset.', 'Split slash-separated English definitions into a JSON array without rewriting their text.', 'Added stable SHA-256-derived entry identifiers and source metadata.'],
    adapter: 'LexiHarbor project',
    adaptedDataLicense: 'CC-BY-SA-4.0',
    sample: { path: 'public/data/cedict-sample.json', sha256: hash(sampleBytes), entryCount: entries.length, headwordCount: new Set(entries.map((entry) => entry.traditional)).size },
    redistributableSource: { path: 'public/data/cedict-sample-source.txt', sha256: hash(selectedOriginal), description: 'All selected source records, unchanged, with the upstream header. This is the complete source for the distributed sample, not the complete upstream dictionary.' },
    selection: { path: 'data-evaluation/sample-headwords.json', requestedHeadwords: wanted.size, missingHeadwords: [...wanted].filter((word) => !entries.some((entry) => entry.traditional === word)), order: 'original upstream order' },
    limitations: ['Chinese-to-English dictionary with English reverse lookup; not a complete English-to-Traditional-Chinese learning dictionary.', 'Development subset selected for familiar topics; not a frequency-balanced or representative corpus.', 'No full human editorial review has been completed; definition matches are not validation of translations or English senses.', 'No implied endorsement by the upstream project or publisher.'],
  };
  await writeFile(path.join(root, '.corpus-cache/cedict-release.u8'), original);
  await writeFile(path.join(root, 'public/data/cedict-original-header.txt'), headerBytes);
  await writeFile(path.join(root, 'public/data/cedict-sample.json'), sampleBytes);
  await writeFile(path.join(root, 'public/data/cedict-sample-source.txt'), selectedOriginal);
  await writeFile(path.join(root, 'public/data/cedict-source.json'), json(manifest));
  console.log(JSON.stringify({ sourceId, upstreamEntries: all.length, sampleEntries: entries.length, missingHeadwords: manifest.selection.missingHeadwords, archiveSha256: hash(archive) }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error); process.exitCode = 1; });
}
