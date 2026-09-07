# 詞庫資料與授權策略

2026-09-07 重新核查。這是來源評估，不表示已匯入或核准完整繁中英漢詞庫。開發順序以 [重新規劃](REBUILD_PLAN.md) 為準。

## 目前包含的資料

0.2 入口使用 `src/data/learningSample.ts` 的 60 個 AI 輔助獨立編寫詞條，經模型校閱、尚待正式人工編校。來源身分為 `lexiharbor-original-v2`。

另已匯入 `public/data/cedict-sample.json` 的 489 筆漢英參考小樣；其資料、選取與格式轉換結果依 CC BY-SA 4.0 分享，詳見 [完整授權與出處](../public/licenses/CC-CEDICT-NOTICE.md)。英文反查結果不直接當作英文學習的中文義項或單字卡答案。

舊 `src/data/dictionary.ts` 的 12 筆詞條與 `src/data/phrases.ts` 保留作歷史原型，0.2 入口不使用它們。PWN、OEWN、COW、ECDICT 並未匯入此試用版。

## 建議正式資料源

WordNet／Open English WordNet 主要是英文資料，不包含本產品需要的完整繁中釋義。中文內容必須另外確認來源與品質。

### Princeton WordNet 3.0

適合英文定義與同義詞。Princeton 明確表示可以商業使用，但必須在所有副本與文件保留其版權聲明和免責條款。正式匯入時請把完整 WordNet license 一併打包到 App 的「授權與出處」頁。

- 官方授權：https://wordnet.princeton.edu/license-and-commercial-use

### Open English WordNet

由 Princeton WordNet 衍生，新增部分採 CC BY 4.0。需要同時標註 Princeton WordNet 與 Open English WordNet 團隊。

- 授權：https://github.com/globalwordnet/english-wordnet/blob/main/LICENSE.md

### Kaikki / Wiktionary

可取得多語、發音與豐富詞形，但資料沿用 Wiktionary 的 CC BY-SA 與 GFDL。商用可行，然而 attribution、share-alike、再散布資料庫與版本標示需要慎重設計；正式採用前建議由法律顧問確認 App 的資料庫散布方式。

- 資料與說明：https://kaikki.org/dictionary/

### CC-CEDICT：漢英與英文反查候選

目前官方下載頁明示 CC BY-SA 4.0，可商用，須署名並按相同授權處理修改後資料的分享。2026-09-07 查閱頁面時列出的已發布版本為 2026-09-06，共 124,988 筆；匯入時仍須核對實際檔案 header、版本及校驗碼。

欄位為繁體詞、簡體詞、拼音及英文解釋。適合漢英查字，英文反向搜尋可提供相關中文詞，但不等於已具備逐英文義項的繁中解釋，也不能把中文詞條數標成英文字數。

- 正式下載與授權：https://www.mdbg.net/chinese/dictionary?page=cedict
- 已發布與未審核版本的區別：https://cc-cedict.org/editor/editor.php?handler=Download
- CC BY-SA 4.0 正式條文：https://creativecommons.org/licenses/by-sa/4.0/legalcode.en

以分開的資料模組保留來源、改動紀錄及適用授權。分檔不會免除改作資料的授權義務；程式碼也不因使用這份資料就當然必須使用同一授權。正式散布方式與可取得的資料版本需具體確認。

### Chinese Open Wordnet：暫不作商售准入

官方提供中文詞形與 PWN 3.0 義項對照；下載版是 beta，並明示覆蓋有限及可能有錯。它不是已校訂的繁中釋義庫。

資料專用 LICENSE 允許免權利金使用與散布，但作者原始論文描述了研究用途詞網與 Wiktionary 資料來源，未在該文交代全部再授權依據。這是需釐清的來源差異，不能據此斷定侵權，也不能直接保證所有內容權利完整。確認前不匯入正式產品。

- 官方說明：https://bond-lab.github.io/cow/
- 資料授權：https://github.com/omwn/omw-data/blob/main/wns/cow/LICENSE
- 作者論文：https://aclanthology.org/W13-4302.pdf

### ECDICT：來源待確認

repo 的 MIT 授權與詞庫內容每一來源的再散布權是不同問題。README 描述多種外部來源；未確認個別來源適用條款前，不把整份 CSV 視為已通過商用審查。

- README：https://github.com/skywind3000/ECDICT/blob/master/README.md
- repo LICENSE：https://github.com/skywind3000/ECDICT/blob/master/LICENSE

## 不可做的事

- 不要反編譯或擷取 Erudite 的封閉詞庫、例句、音檔、圖示或商店素材。
- 不要複製 Cambridge、Oxford、Collins 等商業字典的定義或例句，除非取得明確授權。
- 不要把免費 API 當作可商用的保證；需確認服務條款、速率、SLA、資料來源與再散布權。

## 生產建議

先以固定資料版本與自訂 300 個查詢做品質評估，記錄查詢覆蓋、多義詞、詞形及繁中用語問題。PWN／OEWN 可提供英文核心；CC-CEDICT 可評估漢英與英文反查。需要的繁中釋義另行編寫校訂或取得明確授權，先交付小樣，再決定是否擴大。

Android 採獨立詞庫與使用者資料庫，搜尋索引需實測英文與中文；不直接把大量詞條塞入目前的 JavaScript 陣列。例句、音標及等級有來源才收錄。資料版本、原檔、SHA-256、完整授權、署名及修改紀錄應隨建置保存。

「免權利金」是對合規取得的既有資料版本而言，不是對未來 API、內容編校、建置或商店費用的永久零成本承諾。資料來源的新版條款與線上服務價格須分別評估。
