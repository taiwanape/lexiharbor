# LexiHarbor

英語／繁體中文詞典與單字學習 App 的 0.2 詞庫試用版。已重做查字、收藏詳情與複習排程；目前不收費，尚未作為正式完整字典銷售。

[開啟試用版](https://taiwanape.github.io/lexiharbor/) — 可試搜尋 bank、went、take off、好奇，加入單字本，再進入複習。

## 可試用功能

- 60 個獨立編寫的英文學習詞條，含繁中意思、英文解釋與例句翻譯。
- 英文、變化形、片語與繁中搜尋；完全符合優先。
- 489 筆 CC-CEDICT 漢英參考小樣，與英文學習內容分開顯示。
- 系統文字轉語音，英美口音依實際裝置語音提供。
- 收藏、最近查詢皆可開啟詳情，舊收藏可遷移。
- 每日一字依本地日期更換；複習保存 1 分鐘／3 天／7 天的實際到期時間。
- 今日次數與連續天數按真實紀錄計算，重開保留進度。
- 跟隨系統／淺色／深色與發音口音偏好保存。
- 備份匯出、貼上匯入、匯入前自動備份可取回。
- 來源、授權與試用版隱私說明。

## 本機執行

需要 Node.js 22.13 以上與 pnpm。

```bash
pnpm install
pnpm web
```

```bash
pnpm typecheck
pnpm test
pnpm build:web
pnpm preview
```

## 內容與授權

英文學習內容為 AI 輔助獨立編寫、模型校閱的小樣，尚待正式人工編校。音標和 CEFR 等級沒有可靠編校來源，因此本版不顯示。

漢英資料以 CC-CEDICT 官方已發布版為來源，小樣與衍生資料依 CC BY-SA 4.0 散布。完整授權、來源版本、SHA-256、改動及可下載資料見 [CC-CEDICT 聲明](public/licenses/CC-CEDICT-NOTICE.md)。這些資料權利不受本專案其他檔案的授權狀態限制。

300 個自訂查詢的結果是檢索開發評估，不是語義準確率或代表性覆蓋率。詳見 [評估報告](data-evaluation/REPORT.md)、[具體品質限制](data-evaluation/QUALITY_NOTES.md) 與 [資料授權策略](docs/DATA_LICENSES.md)。

```bash
pnpm corpus:build
pnpm corpus:evaluate
```

重建使用固定 checksum；上游移動下載 URL 換版時會拒絕靜默升級。完整原始快取保存在 ignored `.corpus-cache/`，公開小樣原始記錄位於 `public/data/`。

## 試用與銷售

目前入口不載入舊付費牆或購買服務，也沒有試算價格。舊版的 `src/screens`、`src/state/AppContext.tsx`、`src/components/Paywall.tsx`、`src/services/purchases.ts` 僅留作未連接的歷史原型。

本網頁不代表 Android 安裝、離線語音或商店付款已驗證。正式繁中內容、Android 資料庫、正式識別碼、安裝檔、帳號與販售方式仍待後續完成。網頁目前無 service worker，不承諾首次載入後可離線重開。

後續工作以 [重新規劃](docs/REBUILD_PLAN.md) 為準，本次交付與驗收見 [0.2 試用版紀錄](docs/TRIAL_V02.md)。

## 結構

| 路徑 | 用途 |
| --- | --- |
| App.tsx / src/LearningApp.tsx | 新版入口、四個主要頁面與詞條詳情 |
| src/data/learningSample.ts | 60 個英文學習小樣 |
| src/domain/ | 搜尋、複習、資料驗證純邏輯 |
| src/state/useLearning.ts | 排序寫入、本機偏好與備份遷移 |
| public/data/ | 可再散布的漢英小樣及來源 |
| public/licenses/ | CC-CEDICT 完整授權與出處 |
| data-evaluation/ | 300 個自訂查詢與品質報告 |
| scripts/ | 資料產生、建置與預覽 |
| docs/ | 規劃、驗收與上架草案 |
