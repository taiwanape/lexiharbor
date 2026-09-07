import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
execFileSync(process.execPath, [require.resolve('expo/bin/cli'), 'export', '--platform', 'web'], { stdio: 'inherit' });
const html = await readFile('dist/index.html', 'utf8');
await writeFile('dist/index.html', html.replace('<html lang="en">', '<html lang="zh-Hant">')
  .replace('<title>LexiHarbor</title>', '<title>LexiHarbor｜英語學習詞庫試用版</title>\n    <meta name="description" content="免費試用英文查字、收藏與單字卡複習。含 60 個英文學習詞條與 CC-CEDICT 漢英參考小樣。" />')
  .replace('You need to enable JavaScript to run this app.', '請啟用 JavaScript，以使用這個詞庫試用版。'));
