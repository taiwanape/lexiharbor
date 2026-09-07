# 詞庫資料與授權策略

## 目前包含的資料

`src/data/dictionary.ts` 的 12 筆英文詞條與 `src/data/phrases.ts` 的常用語是此專案手工撰寫的示範內容，不是從參考 App 擷取。

## 建議正式資料源

### Princeton WordNet 3.0

適合英文定義與同義詞。Princeton 明確表示可以商業使用，但必須在所有副本與文件保留其版權聲明和免責條款。正式匯入時請把完整 WordNet license 一併打包到 App 的「授權與出處」頁。

- 官方授權：https://wordnet.princeton.edu/license-and-commercial-use

### Open English WordNet

由 Princeton WordNet 衍生，新增部分採 CC BY 4.0。需要同時標註 Princeton WordNet 與 Open English WordNet 團隊。

- 授權：https://github.com/globalwordnet/english-wordnet/blob/main/LICENSE.md

### Kaikki / Wiktionary

可取得多語、發音與豐富詞形，但資料沿用 Wiktionary 的 CC BY-SA 與 GFDL。商用可行，然而 attribution、share-alike、再散布資料庫與版本標示需要慎重設計；正式採用前建議由法律顧問確認 App 的資料庫散布方式。

- 資料與說明：https://kaikki.org/dictionary/

## 不可做的事

- 不要反編譯或擷取 Erudite 的封閉詞庫、例句、音檔、圖示或商店素材。
- 不要複製 Cambridge、Oxford、Collins 等商業字典的定義或例句，除非取得明確授權。
- 不要把免費 API 當作可商用的保證；需確認服務條款、速率、SLA、資料來源與再散布權。

## 生產建議

以 Open English WordNet 做英文核心，另行購買或建立高品質繁中翻譯；轉成 SQLite + FTS5，首發包內放 20k–50k 常用詞，其餘語言包採按需下載。這樣能兼顧啟動速度、離線能力、安裝包大小與授權追蹤。
