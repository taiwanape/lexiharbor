# 0.4 閱讀港口視覺

日期：2026-09-07。這是既有 Expo App 的版面更新，沿用 GitHub Pages 與本機資料格式，不是另一個展示網站。

## 方向與範圍

參考 [What’Sub 公開網站](https://whatsub.equal2.app/) 的醒目主標、原創主視覺、清楚操作入口與產品完成度；不使用其角色、圖檔、商標、程式或內容。使用者提供的 YouTube 連結當次未能讀取影片，未把影片內容當作已驗證的設計依據。

LexiHarbor 採自己的「閱讀港口」意象：一本書展開成海灣、燈塔與帆船。墨藍與鈷藍為主色，金黃色點綴，英文閱讀使用 Georgia；中文介面使用系統黑體，不額外請求外部字型服務。

- 1080px 以上：224px 側欄、寬版首頁、雙欄文章與字卡、三欄練習封面。
- 手機：底部五項導覽、優先顯示開始閱讀與試聽入口、緊湊橫排短文卡。760px 起首頁主視覺改左右排列，平板不拉長插圖。
- 統一淺／深色、圓角、表單、按鈕、錯誤提示與閱讀視窗。統計仍來自使用者實際紀錄。
- 不新增帳號、付費、伺服器或即時 AI API。既有語音與詞庫授權、資料備份機制不變。
- 此版仍是免費試用；視覺升級不等於已通過商店審核、內容人工編校或可開始收費。

## GPT 生圖交付

模式：Codex 內建 `image_gen.imagegen` 文字生圖，3 張全新圖，不使用參考圖編輯、競品圖檔或 API CLI。下方記錄實際提交的完整提示詞。生成後只做尺寸縮小與 WebP 壓縮；未用程式繪製或重畫插圖。

| 用途 | 原始 PNG | App 使用的 WebP |
| --- | --- | --- |
| 首頁閱讀港口 | [reading-harbor-original.png](../assets/design/reading-harbor-original.png) | [reading-harbor.webp](../assets/design/reading-harbor.webp)，1000px 寬，68,738 bytes |
| 工作短文封面 | [city-desk-original.png](../assets/design/city-desk-original.png) | [city-desk.webp](../assets/design/city-desk.webp)，760px 寬，62,562 bytes |
| 日常短文封面 | [quiet-bookshop-original.png](../assets/design/quiet-bookshop-original.png) | [quiet-bookshop.webp](../assets/design/quiet-bookshop.webp)，760px 寬，83,666 bytes |

三張原始圖均為 1536 × 1024。只有約 215KB 的 WebP 被 App 引用，原始 PNG 不進入網頁輸出。替代文字由介面提供，不讓模型生成圖片中的文案。旅遊短文重用港口插圖。

### 港口提示詞

```text
Use case: stylized-concept
Asset type: Original landscape hero illustration for an English-learning app for adults, approximately 3:2 aspect ratio.
Primary request: An open book transforming into a small harbor landscape with a lighthouse and a tiny sailboat, a clever literary exploration metaphor.
Scene/backdrop: Warm ivory background. The open book's curved layered pages become sculptural harbor shorelines and cobalt water, with one elegant lighthouse rising from the pages and one tiny sailboat on the water.
Style/medium: Sophisticated editorial ink-and-gouache cut-paper artwork for adults; expressive confident black and dark navy outlines, bold flat shapes with tactile painted edges and subtle print grain.
Composition/framing: Bold sculptural composition in a landscape canvas approximately 3:2. Show the entire book and lighthouse with generous clear margins on every edge so the image fits a rounded card. Strong visual hierarchy and a beautifully balanced silhouette.
Lighting/mood: Warm, quietly adventurous, intelligent, inviting.
Color palette: Rich cobalt blue, golden-chartreuse accents, warm ivory, black and dark navy outlines.
Constraints: Single original artwork, no people, no readable or decorative letters, no text, no words, no logos, no watermark, no interface, no screenshot. Not childish. No robot, monster, or mascot. No gradients or photorealistic rendering.
```

### 書桌提示詞

```text
Use case: stylized-concept
Asset type: Original landscape lesson cover illustration for an English-learning app for adults, approximately 3:2 aspect ratio.
Primary request: A bright city work desk with an open notebook, a letter envelope, a cobalt chair and coffee, sunlight and a plant.
Scene/backdrop: A calm sunlit city workspace. A clear desk holds an open notebook with blank pages, a simple closed letter envelope and a coffee cup. A rich cobalt chair anchors the scene, with a small leafy plant and architectural window shapes suggesting city life.
Style/medium: Sophisticated editorial ink-and-gouache cut-paper artwork for adults; expressive confident black and dark navy outlines, rich painted flat shapes, tactile edges and subtle print grain.
Composition/framing: Landscape approximately 3:2. Editorial architectural composition with interesting geometric sunlight and strong clean shapes, generous breathing room. Keep focal objects safely inside the edges for a rounded card crop.
Lighting/mood: Bright, thoughtful, productive and welcoming.
Color palette: Rich cobalt blue, golden-chartreuse accents, warm ivory background, black and dark navy outlines.
Constraints: Single original artwork. All notebook and envelope surfaces blank. No readable or decorative letters, no words, no logos, no watermark, no interface, no screenshot. No people required. Not childish. No robot, monster, or mascot. No gradients or photorealistic rendering.
```

### 書店提示詞

```text
Use case: stylized-concept
Asset type: Original landscape lesson cover illustration for an English-learning app for adults, approximately 3:2 aspect ratio.
Primary request: An inviting small bookshop on a quiet street, one tiny adult reader browsing, a deep cobalt facade and a golden accent, peaceful everyday curiosity.
Scene/backdrop: A small neighborhood bookshop on a calm street. Deep cobalt facade with an inviting shop window full of simple book shapes and a doorway. One small adult figure browses the book display, fully visible and naturally proportioned. Warm ivory architecture and restrained golden-chartreuse details.
Style/medium: Sophisticated editorial ink-and-gouache cut-paper artwork for adults; expressive confident black and dark navy outlines, bold sculptural architectural shapes, tactile painted edges and subtle print grain.
Composition/framing: Landscape approximately 3:2. Carefully composed wide street vignette with the entire storefront readable as architecture, quiet negative space and generous margins so it fits a rounded lesson card. The adult reader is a tiny secondary element.
Lighting/mood: Peaceful, cultured, warm, everyday curiosity.
Color palette: Rich cobalt blue, golden-chartreuse accents, warm ivory background, black and dark navy outlines.
Constraints: Single original artwork. Storefront signage and book covers have no text whatsoever. No readable or decorative letters, no words, no logos, no watermark, no interface, no screenshot. Not childish. No robot, monster, or mascot. No gradients or photorealistic rendering.
```

## 驗收

沿用既有 domain/storage/語音測試；新增深淺色文字與表單邊框對比測試。瀏覽器測試只使用 localhost 的測試資料，不更動正式站使用者的文章與字卡。

- `pnpm test`：95 / 95 通過；`pnpm typecheck` 通過。
- `node --test tools/voice/verify.test.mjs`：3 / 3 通過。網頁建置驗證既有 106 個音檔與內容雜湊通過，並非宣稱完成聽感人工編校。
- `pnpm build:web`：成功，只打包 3 張 WebP，原始 PNG 未进入 dist。
- 視覺檢查：390 × 844 手機首頁／閱讀／字卡／複習、320 × 720 查字／設定、768 × 1024 平板首頁、1280 × 720 短視窗側欄／桌面閱讀、1440 × 1000 首頁／三張封面。檢查淺色與深色。
- 修正：短視窗側欄可獨立捲動、單字本移除重複大標、表單獨立高對比邊框、長按鈕有寬度上限。文字基本對比 ≥ 4.5:1，表單邊框對卡片 ≥ 3:1；不把裝飾性卡片分隔線全部加深。
- 實際流程：新增英文文章 → 點選 curious → 填入參考意思 → 儲存原句字卡 → 修改意思 → 翻卡 → 評為 3 天後複習 → 待複習數歸零；重載後紀錄保留。
- 查字 curious 可開啟兩個義項；首頁試聽顯示「AI 合成語音（非真人錄音）・播放中」，可停止。
- 最後瀏覽器錯誤／警告記錄為空。Android 原生版與實體手機未在本次驗收，不以網頁測試代替商店上架測試。
