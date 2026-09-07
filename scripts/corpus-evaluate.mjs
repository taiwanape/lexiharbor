import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCedict } from './corpus-build.mjs';
import { searchCorpus } from './corpus-search.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => readFile(path.join(root, name), 'utf8');
const hash = (value) => createHash('sha256').update(value).digest('hex');
const sampleText = await read('public/data/cedict-sample.json');
const sample = JSON.parse(sampleText);
const source = JSON.parse(await read('public/data/cedict-source.json'));
const queryText = await read('data-evaluation/queries.json');
const querySet = JSON.parse(queryText);
const original = await readFile(path.join(root, source.original.cachePath));
if (hash(original) !== source.original.sha256 || hash(sampleText) !== source.sample.sha256) throw new Error('Data checksum mismatch; rebuild and investigate before evaluation.');
const full = parseCedict(original.toString('utf8'));
const queries = querySet.groups.flatMap((group) => group.queries.map((query) => ({ category: group.category, query })));
if (queries.length !== 300 || new Set(queries.map(({ query }) => query)).size !== 300) throw new Error('The frozen development set must contain 300 unique queries.');
const concise = (result) => ({
  normalizedQuery: result.normalizedQuery,
  inflectionUsed: result.inflectionUsed,
  queryKind: result.queryKind,
  candidateCount: result.total,
  top5: result.results.slice(0, 5).map(({ entry, rank, matchedDefinition }) => ({ id: entry.id, traditional: entry.traditional, rank, matchedDefinition })),
});
const results = [];
for (const [index, item] of queries.entries()) {
  results.push({
    id: `q${String(index + 1).padStart(3, '0')}`,
    ...item,
    expectedEmpty: item.category === 'no_result',
    sampleLiteral: concise(searchCorpus(sample.entries, item.query, { useInflections: false, limit: 5 })),
    sampleWithInflections: concise(searchCorpus(sample.entries, item.query, { limit: 5 })),
    fullWithInflections: concise(searchCorpus(full, item.query, { limit: 5 })),
    semanticQuality: 'not_adjudicated',
  });
}
const rate = (count, denominator) => `${(100 * count / denominator).toFixed(1)}%`;
const summarize = (rows, mode) => {
  const ordinary = rows.filter((row) => !row.expectedEmpty);
  const negative = rows.filter((row) => row.expectedEmpty);
  const hits = ordinary.filter((row) => row[mode].candidateCount > 0).length;
  return { queryCount: ordinary.length, mechanicalHits: hits, mechanicalHitRate: ordinary.length ? hits / ordinary.length : null, expectedEmptyCount: negative.length, correctEmptyCount: negative.filter((row) => row[mode].candidateCount === 0).length };
};
const categories = querySet.groups.map(({ category }) => ({ category, sampleLiteral: summarize(results.filter((row) => row.category === category), 'sampleLiteral'), sampleWithInflections: summarize(results.filter((row) => row.category === category), 'sampleWithInflections'), fullWithInflections: summarize(results.filter((row) => row.category === category), 'fullWithInflections') }));
const overview = { sampleLiteral: summarize(results, 'sampleLiteral'), sampleWithInflections: summarize(results, 'sampleWithInflections'), fullWithInflections: summarize(results, 'fullWithInflections') };
const output = {
  schemaVersion: 1, sourceId: source.sourceId,
  sampleEntries: sample.entries.length, fullEntries: full.length,
  datasetSha256: source.sample.sha256, querySetSha256: hash(queryText), referenceSearchSha256: hash(await read('scripts/corpus-search.mjs')),
  description: querySet.purpose,
  metricsMeaning: 'A mechanical hit means at least one headword/prefix or English-definition token/phrase match; it does not imply a correct English sense, natural Traditional Chinese translation, or top-ranked relevance. Negative control strings are measured separately.',
  qualityReview: { fullyHumanReviewed: false, semanticAccuracy: null, status: 'See QUALITY_NOTES.md for limited agent inspection; no statistically measured editorial accuracy.' },
  overview, categories, results,
};
await writeFile(path.join(root, 'data-evaluation/results.json'), `${JSON.stringify(output, null, 2)}\n`);
const labels = { nouns: '名詞', verbs: '動詞', polysemy: '多義詞', inflections: '詞形變化', phrases: '片語', traditional: '繁中查字', no_result: '無結果控制組' };
const table = categories.filter((row) => row.category !== 'no_result').map((row) => `| ${labels[row.category]} | ${row.sampleWithInflections.queryCount} | ${row.sampleLiteral.mechanicalHits} | ${row.sampleWithInflections.mechanicalHits} | ${row.fullWithInflections.mechanicalHits} |`).join('\n');
const showcases = ['apple', 'bank', 'run', 'went', 'take off', '好奇'].map((query) => {
  const row = results.find((item) => item.query === query);
  const mode = row.sampleWithInflections;
  return `| ${query} | ${mode.normalizedQuery} | ${mode.candidateCount} | ${mode.top5.map((item) => item.traditional).join('、') || '—'} |`;
}).join('\n');
const report = `# CC-CEDICT 資料小樣實測\n\n版本：${source.sourceId}；上游原始資料 ${full.length.toLocaleString('en-US')} 筆。小樣 ${sample.entries.length} 筆，${source.sample.headwordCount} 個不同繁中詞。來源日期為上游發布時間，測試結果可由固定資料和腳本重現。\n\n## 這份結果能說明什麼\n\n這是自訂 300 個開發查詢的機械檢索測試，包括 280 個一般查詢與 20 個預期無結果控制字串。不是標準高頻詞表、獨立盲測或實際使用頻率抽樣；詞庫選字與查詢集由同一專案制定，存在選擇偏差。結果不能外推成完整字典覆蓋率或翻譯正確率。\n\n「命中」只表示中文詞／前綴符合，或英文解釋中出現完整 token／連續片語。多義詞只找到一個義項仍會計一次命中；旁帶提及的字也可能誤列。尚未完成逐義項人工編校，語義正確率保留為 null。有限代理抽查見 [QUALITY_NOTES.md](QUALITY_NOTES.md)。\n\n## 機械檢索結果\n\n| 類別 | 查詢数 | 小樣原字面命中 | 小樣＋明示詞形表 | 上游全檔＋同詞形表 |\n| --- | ---: | ---: | ---: | ---: |\n${table}\n\n小樣字面命中 ${overview.sampleLiteral.mechanicalHits}/280（${rate(overview.sampleLiteral.mechanicalHits, 280)}）；加上明示詞形映射後 ${overview.sampleWithInflections.mechanicalHits}/280（${rate(overview.sampleWithInflections.mechanicalHits, 280)}）。上游全檔參考搜尋 ${overview.fullWithInflections.mechanicalHits}/280（${rate(overview.fullWithInflections.mechanicalHits, 280)}）。全檔測試只用於區分「小樣未收」與「同搜尋規則仍查不到」，不表示全檔已准入或完整英漢可用。\n\n20 個無結果控制字串：小樣正確空結果 ${overview.sampleWithInflections.correctEmptyCount}/20；全檔正確空結果 ${overview.fullWithInflections.correctEmptyCount}/20。這些字串刻意不成詞，不能代替真實拼錯字或近似詞的測試。\n\n| 查詢 | 實際檢索字串 | 小樣候選數 | 前 5 個中文候選 |\n| --- | --- | ---: | --- |\n${showcases}\n\n## 資料與搜尋限制\n\n- 資料方向是漢英；英文反查提供相關中文詞，沒有獨立英文詞條或英文義項對齊。\n- 同一中文字不同讀音可能包含姓氏、借詞、地名或異體註解；沒有以結果數冒充英文單字數。\n- 詞形表是腳本內的小型明示映射，不是完整詞形分析。歧義形式如 saw、left、better 需要詞義選擇；本實驗不能解決。\n- 保留原始 numbered pinyin 和交叉參照，沒有自行生成音標、英文例句、CEFR 等級或真人音檔。\n- 小樣與測試集受生活主題和已知關鍵查詢引導。缺少的選字：${source.selection.missingHeadwords.join('、') || '無'}。\n- 正式英漢學習字典仍需合規的逐義項繁中內容及編校；這次資料檢索實验沒有將該要求標成完成。\n\n## 重現\n\n在專案根目錄執行：\n\n\`\`\`text\nnode scripts/corpus-build.mjs\nnode scripts/corpus-evaluate.mjs\npnpm exec tsx --test tests/corpus-*.test.ts\n\`\`\`\n\n第一次建置已固定來源 manifest。後續建置驗證 SHA-256，不接受來源 URL 自動換版；如原始快取不存在且上游已更新，需還原固定快取或明確另開版本評估。可公開取得 [JSON 小樣](../public/data/cedict-sample.json)、[小樣原始記錄](../public/data/cedict-sample-source.txt)、[出處與校驗碼](../public/data/cedict-source.json)。完整 124,988 筆原檔保存在忽略的 .corpus-cache，沒有把全檔當作核准產品資料公開。\n\n原始檔 SHA-256：\`${source.original.sha256}\`。小樣 SHA-256：\`${source.sample.sha256}\`。結果檔同時記錄查詢集與參考搜尋腳本 hash，方便識別演算法改動。\n\n## 授權\n\n資料及其衍生摘錄採 CC BY-SA 4.0；出處、改動、免責聲明及可取得資料見 [CC-CEDICT-NOTICE.md](../public/licenses/CC-CEDICT-NOTICE.md)，完整正式條款見 [CC-BY-SA-4.0.txt](../public/licenses/CC-BY-SA-4.0.txt)。官方頁面：<https://www.mdbg.net/chinese/dictionary?page=cedict>。\n`;
await writeFile(path.join(root, 'data-evaluation/REPORT.md'), report);
console.log(JSON.stringify({ overview, categories: categories.map(({ category, sampleWithInflections, fullWithInflections }) => ({ category, sample: sampleWithInflections, full: fullWithInflections })) }, null, 2));
