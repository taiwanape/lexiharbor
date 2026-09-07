# Google Play 上架檢查表（2026）

## 1. 發行身分

- [ ] 決定正式品牌名稱並做商標檢索
- [ ] 將 `com.yourstudio.lexiharbor` 換成永久 Application ID
- [ ] 完成 Google Play 開發者身分、聯絡信箱與付款資料驗證
- [ ] 建立公開支援信箱與隱私權政策 HTTPS 網址

## 2. 產品與內容

- [ ] 匯入完整、可商用且已做 attribution 的詞庫
- [ ] 由母語編輯審閱繁體中文、例句與常用語
- [ ] 替換示範價格，讓所有價格只來自 Google Play 商品資訊
- [ ] 加入錯字、無結果、離線、資料損毀與升級遷移測試
- [ ] 對手機、平板、Chromebook、深色模式與字體放大做 QA

## 3. Google Play Billing

- [ ] 建立一次性商品 `lexiharbor_premium_lifetime` 或正式商品 ID
- [ ] 建立 RevenueCat `premium` entitlement 與 current offering
- [ ] 在 `.env.local` 設定 Android public SDK key（不得提交 secret key）
- [ ] 先上傳測試 AAB，再於授權測試帳號完成購買、取消與恢復購買測試
- [ ] 若改用訂閱，付費牆必須清楚顯示價格、週期、自動續訂與取消方式

## 4. 政策與商店資料

- [ ] 填寫 Data safety；必須把 RevenueCat 或日後廣告 SDK 的資料行為一起申報
- [ ] 完成內容分級、App access、Target audience、Ads 聲明
- [ ] 上傳 App icon、Feature graphic、手機與平板截圖
- [ ] 提供短說明、完整說明與版本資訊
- [ ] 在 App 內與商店頁放置隱私政策、客服與資料刪除方式

## 5. 發行品質

- [ ] `pnpm typecheck` 與 `pnpm test` 全數通過
- [ ] `pnpm dlx expo-doctor` 除環境工具警告外無專案錯誤
- [ ] production AAB 目標 API 為 36 以上
- [ ] Play pre-launch report 無 crash、ANR、明顯無障礙或版面問題
- [ ] 先走 internal testing，再完成 Google 要求的 closed testing，最後 production rollout

## 官方政策連結

- Target API：[Android Developers](https://developer.android.com/google/play/requirements/target-sdk)
- Data safety：[Play Console Help](https://support.google.com/googleplay/android-developer/answer/10787469)
- Payments：[Play Console Help](https://support.google.com/googleplay/android-developer/answer/9858738)
- Expo SDK：[Expo documentation](https://docs.expo.dev/versions/latest/)
- RevenueCat Expo：[RevenueCat documentation](https://www.revenuecat.com/docs/getting-started/installation/expo)
