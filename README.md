# 影子工單｜臺北青年工作證明（提案原型）

2026 臺北市政府青年局公共政策創意提案競賽「臺北影子工單計畫」的可操作原型。
**不是臺北市政府官方服務**；網站中的企業、局處名稱、人物與數據皆為虛構或示範。

**線上試玩：<https://a96020183.github.io/shadow-task/>**

## 怎麼開

- **最快**：直接雙擊 `index.html`（不需安裝、不需伺服器）。
- **或用本機伺服器**：在本資料夾執行 `python -m http.server 8000`，開 <http://localhost:8000>。

首次開啟會自動載入示範帳號「小安」（2 張已完成工單、戰隊、邀請紀錄）。
想從頭體驗：頁尾「重設為新帳號」→ 建立角色（可試學校信箱驗證，驗證碼會直接顯示）→ 接「物流客訴分類」工單。

作答只存在瀏覽器的 localStorage，不會上傳任何伺服器。

## 建議體驗路線（約 15 分鐘）

1. 首頁 → 公會大廳 → 「物流客訴分類與新人客服 SOP 改善」
2. 開工前向主管提問（會得到隱藏限制）
3. 實作時在資料表、文件、AI 回答上標記可疑之處 ⚑
4. 約 40 秒後或寫到一半，會出現「突發事件」需求變更
5. 答辯 3 題 → 結果頁（五力、錯誤解析、過程紀錄）→ 工單履歷
6. 再看「企業專區」「市府儀表板」「戰隊」

## 結構

```
index.html
assets/css/app.css      主要樣式（含深色模式、手機版）
assets/css/pixel.css    公會大廳的像素風樣式
assets/js/data.js       工單內容、示範人才、儀表板示範數據
assets/js/store.js      localStorage 存取
assets/js/ui.js         圖示、modal、toast、圖表
assets/js/pixel.js      像素 sprite、臺北天際線
assets/js/scoring.js    五力評分規則（透明規則；正式版為 AI 初評＋職人複核）
assets/js/views-*.js    各頁面
assets/js/social.js     戰隊、邀請、校際榜、示範帳號
assets/js/app.js        路由、導覽、建立角色
assets/fonts/           Cubic 11 像素字型（SIL OFL 1.1，見 Cubic_11-OFL.txt）
```

純靜態網站，沒有 build 步驟，可直接部署到 GitHub Pages（Settings → Pages → 從 main 分支根目錄部署）。
