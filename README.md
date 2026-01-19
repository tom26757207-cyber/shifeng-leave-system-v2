# 秝豐居家長照 - 居服員請假管理系統

## 📋 系統簡介

這是一個為秝豐居家長照機構開發的請假管理系統，包含：
- **前台表單**：居服員線上填寫請假申請（響應式設計，手機/電腦皆可）
- **後台管理**：Google Sheets 管理介面，支援查詢、統計、列印功能
- **自動通知**：整合 LINE Notify，自動通知管理者

---

## 🏗️ 系統架構

```
前台（GitHub Pages）
    ↓
Google Apps Script（後端 API）
    ↓
Google Sheets（資料庫 + 後台管理）
    ↓
LINE Notify（即時通知）
```

---

## 🚀 部署步驟

### **第一步：建立 Google Sheets 資料庫**

1. 到 Google Drive 建立新試算表
2. 命名為：`秝豐居家長照_請假管理系統`
3. 建立 4 個工作表：
   - `居服員基本資料`
   - `請假單主表`
   - `請假類別設定`
   - `月度統計`

4. 複製欄位標題（參考前面設計的資料庫結構）

5. 輸入測試資料：
   - **居服員基本資料**：至少 3-5 位員工
   - **請假類別設定**：事假、病假、喪假、婚假、特休、公假、產假、陪產假

---

### **第二步：部署 Google Apps Script**

1. 在 Google Sheets 點選：`擴充功能 → Apps Script`

2. 刪除預設的程式碼，複製貼上 `google-apps-script.js` 的內容

3. **重要設定**：
   - 修改第 5 行：填入你的 LINE Notify Token（下一步取得）
   - 其他設定保持預設即可

4. 部署為 Web App：
   - 點選右上角「部署 → 新增部署作業」
   - 類型：選「網路應用程式」
   - 執行身分：選「我」
   - 具有存取權的使用者：選「任何人」
   - 點選「部署」
   - **複製 Web App 網址**（稍後會用到）

5. 授權：
   - 首次部署會要求授權
   - 點選「檢閱權限 → 進階 → 前往（不安全）→ 允許」

---

### **第三步：取得 LINE Notify Token**

#### **方案A：LINE Notify（推薦，簡單）**

1. 到 https://notify-bot.line.me/my/
2. 登入你的 LINE 帳號
3. 點選「發行權杖」
4. 選擇要接收通知的群組或聊天室
5. 權杖名稱：`秝豐請假通知`
6. 複製產生的 Token
7. 回到 Apps Script，貼到第 5 行

#### **方案B：LINE Official Account（需申請）**

如果你有 LINE Official Account，可以用 Messaging API：
1. 到 LINE Developers Console
2. 建立 Provider 和 Channel
3. 取得 Channel Access Token
4. 需要額外修改 Apps Script 的通知程式碼

**建議先用方案A測試！**

---

### **第四步：部署前台到 GitHub Pages**

1. 到 GitHub 建立新 Repository：
   - Repository 名稱：`shifeng-leave-system`
   - 設定為 Public

2. 上傳檔案：
   - `index.html`
   - `script.js`
   - `README.md`（選填）

3. **重要：修改 `script.js` 第 2 行**：
   ```javascript
   const APPS_SCRIPT_URL = '你的 Apps Script Web App 網址';
   ```
   貼上第二步複製的網址

4. 啟用 GitHub Pages：
   - 到 Repository 的 `Settings → Pages`
   - Source：選 `main` branch
   - 點選 `Save`

5. 等待 1-2 分鐘，前台網址會是：
   ```
   https://tom26757207.github.io/shifeng-leave-system
   ```

---

### **第五步：測試系統**

1. **測試前台表單**：
   - 開啟 `https://tom26757207.github.io/shifeng-leave-system`
   - 填寫一筆測試請假
   - 送出後應該會顯示成功訊息

2. **檢查 Google Sheets**：
   - 打開你的 Google Sheets
   - 查看「請假單主表」是否有新增資料

3. **檢查 LINE 通知**：
   - 應該會收到 LINE 訊息通知

4. **測試後台功能**：
   - 在 Google Sheets 點選上方選單「📋 請假管理」
   - 測試各項功能

---

## 🎯 使用說明

### **居服員端（前台）**

1. 用手機或電腦開啟前台網址
2. 選擇自己的「員工編號/姓名」
3. 填寫請假日期、類別、事由等
4. 確認交接狀態
5. 送出申請
6. 記下請假單編號

---

### **管理者端（後台）**

#### **查看請假單**
- 直接在 Google Sheets「請假單主表」查看
- 可用篩選功能篩選月份、員工、類別

#### **列印請假單**
1. 點選要列印的那一列（任一儲存格）
2. 點選上方選單「📋 請假管理 → 🖨️ 列印選定的請假單」
3. 系統會生成 PDF
4. 下載後列印給居服員簽名

#### **本月統計**
1. 點選「📋 請假管理 → 📊 本月請假統計」
2. 會顯示本月請假概況

#### **匯出 Excel**
1. 在 Google Sheets 點選「檔案 → 下載 → Microsoft Excel」
2. 可用 Excel 做更複雜的分析

---

## 📊 資料庫結構

### 工作表1：居服員基本資料
```
員工編號 | 員工姓名 | 聯絡電話 | 所屬單位 | 在職狀態 | 到職日期 | 建檔時間
```

### 工作表2：請假單主表
```
請假單編號 | 員工編號 | 員工姓名 | 請假日期(起) | 請假日期(迄) | 天數 | 時數 | 
請假類別 | 請假事由 | 影響個案 | 是否已完成交接 | 備註 | 申請時間 | 狀態 | 
核准督導 | 核准主管 | 居服員簽名 | 列印次數 | 最後列印時間
```

### 工作表3：請假類別設定
```
類別代碼 | 類別名稱 | 是否啟用 | 排序 | 說明
```

---

## 🔧 進階設定

### **新增員工**

#### 方法1：手動新增
1. 打開「居服員基本資料」工作表
2. 在最後一列新增資料

#### 方法2：Excel 批次匯入
1. 準備 Excel 檔案，格式：
   ```
   員工編號 | 員工姓名 | 聯絡電話 | 所屬單位 | 在職狀態
   E001    | 王小明   | 0912...  | 居服組   | 在職
   ```
2. 在 Google Sheets 點選「檔案 → 匯入」
3. 選擇你的 Excel 檔案
4. 匯入位置：「附加到目前的工作表」

### **新增請假類別**

1. 打開「請假類別設定」工作表
2. 新增一列，例如：
   ```
   PAT | 陪產假 | TRUE | 8 | 配偶生育陪產
   ```
3. 前台表單會自動更新

### **自訂 LINE 通知訊息**

修改 `google-apps-script.js` 的 `sendLineNotification` 函式

---

## 🔐 安全性說明

1. **前台表單**：
   - 任何人都能開啟（這是設計需求）
   - 但只能「送出請假」，看不到別人的資料

2. **Google Sheets 資料**：
   - 只有你的 Google 帳號能存取
   - 可以分享給其他主管（設定權限）

3. **Apps Script API**：
   - 有 CORS 來源驗證（只接受你的前台網址）
   - 外部無法直接查詢資料

---

## ❓ 常見問題

### Q1：前台送出後沒反應？
- 檢查 `script.js` 第 2 行的 Apps Script 網址是否正確
- 按 F12 開啟瀏覽器開發者工具，查看 Console 錯誤訊息

### Q2：沒收到 LINE 通知？
- 檢查 Apps Script 的 LINE_NOTIFY_TOKEN 是否正確
- 到 Apps Script 點選「📋 請假管理 → 📧 測試 LINE 通知」

### Q3：員工下拉選單是空的？
- 檢查「居服員基本資料」是否有資料
- 檢查「在職狀態」欄位是否為「在職」

### Q4：想修改表單樣式？
- 編輯 `index.html`，使用 TailwindCSS 的 class
- 參考：https://tailwindcss.com/docs

### Q5：如何備份資料？
- Google Sheets 會自動儲存版本記錄
- 也可以定期「檔案 → 下載 → Excel」手動備份

---

## 📞 技術支援

如有問題，請檢查：
1. Apps Script 的執行記錄（查看錯誤訊息）
2. 瀏覽器開發者工具的 Console
3. Google Sheets 的資料是否正確

---

## 📝 授權

此系統為秝豐居家長照機構專用，請勿轉發或商業使用。

---

## 🎉 完成！

現在你的請假系統已經上線了！

**前台網址**：https://tom26757207.github.io/shifeng-leave-system  
**後台管理**：你的 Google Sheets

可以分享前台網址給所有居服員使用了！💪