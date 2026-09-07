import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
// A release must never advertise an AI clip whose audio is missing or corrupt.
execFileSync(process.execPath, ['tools/voice/verify.mjs'], { stdio: 'inherit' });
execFileSync(process.execPath, [require.resolve('expo/bin/cli'), 'export', '--platform', 'web'], { stdio: 'inherit' });
const html = await readFile('dist/index.html', 'utf8');
await writeFile('dist/index.html', html.replace('<html lang="en">', '<html lang="zh-Hant">')
  .replace('<title>LexiHarbor</title>', '<title>LexiHarbor｜英文閱讀與原句字卡</title>\n    <meta name="description" content="貼上英文文章，保存單字與原句，安排複習。含原創練習短文與精選 AI 自然發音，目前免費試用。" />')
  .replace('You need to enable JavaScript to run this app.', '請啟用 JavaScript，以使用英文閱讀與字卡功能。'));
