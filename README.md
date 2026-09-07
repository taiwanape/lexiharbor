# LexiHarbor

一個可商業化的英語／繁體中文詞典與單字學習 App MVP。介面與程式碼為原創實作，沒有複製 Erudite 的品牌、圖像、原始碼或封閉詞庫。

## 線上試用

GitHub Pages 部署後可在 `https://<你的帳號>.github.io/lexiharbor/` 試用 Web 版本。瀏覽器版可體驗查字、收藏、單字卡、會話與付費介面；Google Play 真實付款與 Android 系統整合必須在 Android development build 測試。

## 已完成

- 英文、中文與同義詞搜尋
- 詞性、音標、中文解釋、英文定義、例句、同義詞
- 系統文字轉語音發音
- 收藏與查詢歷史（本機持久化）
- 每日一字、單字卡複習、學習進度與連續天數
- 分類情境會話與發音
- 自動／手動深色模式
- RevenueCat + Google Play Billing 的付費入口、恢復購買與 entitlement 檢查
- Android App Bundle 的 EAS production build 設定
- API 36 相容的 Expo SDK 57
- 原創 App icon

## 本機執行

需要 Node.js 22.13 以上與 pnpm。

```bash
pnpm install
pnpm start
```

Web 預覽：

```bash
pnpm web
```

驗證：

```bash
pnpm typecheck
pnpm test
pnpm dlx expo-doctor
```

## 付費設定

目前 UI 會顯示示範價格；只有接上商店後才會收款，正式價格永遠以 Google Play 回傳值為準。

1. 把 `app.json` 的 `android.package` 改成你永久使用的 Application ID；建立 Play Console App 後不可任意更換。
2. 在 Google Play 建立一次性商品，例如 `lexiharbor_premium_lifetime`。
3. 在 RevenueCat 建立 Android App，連接 Google Play，新增 `premium` entitlement、商品與 current offering。
4. 複製 `.env.example` 為 `.env.local`，填入 RevenueCat 的 Android **public SDK key**。
5. `eas init` 後把 EAS project ID 寫回 `app.json`。
6. 以 development build 測試真實購買；Expo Go 無法完成商店交易。

## 建置 AAB

```bash
pnpm dlx eas-cli login
pnpm dlx eas-cli build --platform android --profile production
```

詳細上架工作請見 [docs/PUBLISHING_CHECKLIST.md](docs/PUBLISHING_CHECKLIST.md)。

## 詞庫

目前倉庫只含 12 筆手工撰寫的示範詞條，足以驗證產品流程，但**不應以此直接上架成正式字典**。正式上架前請匯入已確認可商用的完整資料源並保留授權聲明。建議的資料策略見 [docs/DATA_LICENSES.md](docs/DATA_LICENSES.md)。

## 結構

```text
App.tsx                         應用程式入口與分頁
src/data/                      示範詞庫與情境會話
src/screens/                   五個主要頁面
src/state/AppContext.tsx       收藏、歷史、複習進度
src/services/purchases.ts      Google Play / RevenueCat 付費橋接
src/components/Paywall.tsx     商店付費牆
assets/icon.png                原創商用圖示
docs/                          上架、隱私、商店文案、資料授權
```

## 商業化邊界

這份程式可作為正式產品的基礎，但能否「立即上架銷售」仍取決於開發者帳號驗證、最終 Application ID、完整詞庫、隱私政策網址、商店商品、付款資料、內容分級、封閉測試與 Google 審核。這些都必須由帳號持有人在 Play Console 完成。
