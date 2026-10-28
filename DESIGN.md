---
name: "影子工單｜C 像素城市・任務板"
description: "深夜藍城市、像素任務框與可閱讀的工作紀錄。"
colors:
  accent: "#ffc93c"
  accent-ink: "#10213e"
  paper: "#0d1b3d"
  paper-2: "#1b3458"
  card: "#14294d"
  ink: "#f2f7ff"
  ink-2: "#d2e0f3"
  muted: "#b8cbe5"
  line: "#365173"
  line-2: "#728eb8"
  px-drop: "#061027"
  teal: "#73e1c6"
  teal-soft: "#163e43"
  red: "#ff9699"
  blue: "#92c9ff"
  light-paper: "#eaf4ff"
  light-paper-2: "#dcecff"
  light-card: "#ffffff"
  light-ink: "#10264a"
  light-ink-2: "#2a4667"
  light-muted: "#415b79"
  light-line: "#b3cbe3"
  light-line-2: "#264a73"
  light-px-drop: "#afc9e8"
  light-teal: "#006956"
  light-teal-soft: "#d6f3e9"
  light-red: "#a9293e"
  light-blue: "#174f95"
typography:
  display:
    fontFamily: '"Cubic 11", system-ui, -apple-system, "PingFang TC", "Microsoft JhengHei", sans-serif'
    fontSize: "66px"
    fontWeight: 400
    lineHeight: 1.12
    letterSpacing: "0"
  headline:
    fontFamily: '"Cubic 11", system-ui, -apple-system, "PingFang TC", "Microsoft JhengHei", sans-serif'
    fontSize: "33px"
    fontWeight: 400
    lineHeight: 1.3
  title:
    fontFamily: '"Cubic 11", system-ui, -apple-system, "PingFang TC", "Microsoft JhengHei", sans-serif'
    fontSize: "22px"
    fontWeight: 400
    lineHeight: 1.35
  body:
    fontFamily: 'system-ui, -apple-system, "PingFang TC", "Microsoft JhengHei", sans-serif'
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: '"Cubic 11", system-ui, -apple-system, "PingFang TC", "Microsoft JhengHei", sans-serif'
    fontSize: "16px"
    fontWeight: 400
    letterSpacing: "0"
  button:
    fontFamily: '"Cubic 11", system-ui, -apple-system, "PingFang TC", "Microsoft JhengHei", sans-serif'
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  square: "0px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  base: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.square}"
    padding: "10px 18px"
  button-ghost:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.square}"
    padding: "10px 18px"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.square}"
    padding: "8px 10px"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.square}"
    padding: "10px 12px"
  navigation:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
  chip:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "5px 12px"
  chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "5px 12px"
  task-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "24px"
  feedback-good:
    backgroundColor: "{colors.teal-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "16px"
---

# Design System: 影子工單｜C 像素城市・任務板

## Overview

**Creative North Star: "像素城市・任務板"**

臺北城市是共同場景，工作任務以直角框、像素標題、關卡點與角色對話呈現。深色預設如夜間城市，白天模式採藍白表面；內文維持清楚的系統黑體。企業與市府介面沿用同一套字體與框線，但收斂陰影及裝飾，讓回答、紀錄與指標保持主角。

本文件記錄已實作的視覺系統。執行時來源為 `assets/css/city.css`；`index.html` 依序載入 `app.css` → `pixel.css` → `finals.css` → `city.css`，最後一層承載 C 版視覺覆寫。新增畫面沿用此順序，勿直接恢復早期樣式表中的圓角、舊色票與專業端字體。產品事實與示範聲明以 `PRODUCT.md` 為準。

**Key Characteristics:**

- 深夜藍與藍白兩套城市表面。
- Cubic 11 負責標題、按鈕、導航與數字；系統黑體負責閱讀。
- 直角粗框、沒有模糊的硬陰影、黃色主要行動。
- 青綠表達已完成與正確；專業端以較平靜的列表與表格呈現。

## Colors

前置 token 是目前色票的擷取；沒有 `light-` 前綴的是預設深色，白天 token 對應 `data-theme="light"` 的同名 CSS variable 覆寫。執行時使用 `var(--paper)` 等語意變數，不自行切換字面色碼。

sidecar 的 tonalRamp 由現有色票推算，僅供色帶預覽，不新增 CSS tokens。

### Primary

- **任務黃（accent）**：主要行動、當前關卡及少量導航狀態；搭配深色的 accent-ink。

### Secondary

- **完成青綠（teal / light-teal）**：正確、完成與有效進度；回饋表面使用 teal-soft。
- **提示藍（blue / light-blue）**：鍵盤焦點與輔助資訊。圖表沿用 city.css 的 series、grid、axis tokens。

### Tertiary

- **修正紅（red / light-red）**：錯誤與風險。文字或圖形須同時說明狀態，不能只靠顏色。

### Neutral

- **城市底色（paper）、任務面板（card）、次層表面（paper-2）**：建立閱讀層次。
- **主要文字（ink）、次文字（ink-2）、說明文字（muted）**：維持深淺兩色的內容層級。
- **分隔線（line）、結構框（line-2）、投影（px-drop）**：區分內容與可操作的任務邊界。

**The Theme Exceptions Rule.** QR 圖碼與安靜區固定白底；頂部原型提示列在白天仍為深色實底配淺色文字。這些是掃碼及閱讀所需的局部例外，不由一般面板色覆蓋。

城市 SVG 使用 city.css 的 `--sky-1` 至 `--sky-6`、`--sky-star`、`--sky-orb`、`--sky-mountain`、`--sky-building`、`--sky-building-alt`、`--sky-window`、`--sky-window-alt`、`--sky-tower`、`--sky-glass`、`--sky-lit` 與 `--scene`。深淺色各有已實作的場景值；透過既有 `APP.px.skyline()` 引用，不把天空色階變成介面漸層或另外硬寫一套城市色票。

## Typography

**Display Font:** 本地 Cubic 11，後備為系統黑體。標題、按鈕、HUD、標籤與數字使用像素字；不載入外部字型。新增顯示文字時沿用 `tools/subset_font.py` 的字型子集流程。

**Body Font:** system-ui、Apple 系統字、PingFang TC、Microsoft JhengHei。段落、說明、對話內容及表格閱讀內容使用系統黑體。

- **Display**：首頁大標題；桌面使用 display token，手機改為 44px。
- **Headline**：頁面與任務標題；手機通常為 28px。
- **Title**：委託單與次層標題；各畫面的 20px、24px、28px 是既有情境變體。
- **Body**：以 body token 為基準；導言及重點對話可為 17–18px。不要因手機寬度縮小主要內文。
- **Label / Button**：像素字常規字重；數字使用 tabular-nums。提示列、補充 metadata 與裝飾標籤存在較小字級，不應複製成段落內文。

**The Readable Body Rule.** 主要內文至少 16px，像素字限於辨識與操作層；長段落使用系統黑體。

## Layout

共用頁面置中最大寬度 1200px，桌面左右留白 24px；窄手機為 16px。短體驗工作區最大寬度 680px。間距沿用前置尺度，少數任務單、對話與證據列使用已實作的 20px 情境間距。

主要響應斷點為 1180px（展開式導航）、760px（手機單欄與底部導航）、380px（窄螢幕細節）；基礎網格另保留 640px 單欄規則。首頁桌面雙欄、手機依閱讀順序單欄；專業端以列表、對齊的數值與分隔線維持資訊密度。

手機底部分頁列為 64px 加安全區，體驗操作列位於其上，內容須預留兩列高度。觸控目標至少 44 × 44px；一般按鈕至少 48px 高，首頁主要行動桌面 60px、手機 56px。保留 safe-area，不讓固定列遮住結果或 QR。

## Elevation & Depth

深度來自清楚框線、表面色差與無模糊投影。一般任務卡為 3px 硬陰影，主要任務框為 4px，首頁城市舞台為 5px；色彩由 px-drop 隨主題切換。完整 CSS 值收錄於 sidecar。

**The Quiet Professional Rule.** 企業、市府等專業頁的卡片、面板與按鈕取消投影，仍保留直角與結構框。巢狀卡片不重複加陰影。

## Shapes

直角為預設。一般任務框與表單使用 2px 邊框，重要任務紀錄與城市舞台使用 3px 邊框；細部標籤與分隔線可較輕。像素圖維持 pixelated rendering，鉚釘僅用於主要委託框。查驗聲明以虛線框區別於結果或認證章。

## Components

### Buttons

黃色主要鍵、面板色次要鍵與透明文字動作共用像素字及直角。一般按鈕有硬陰影；按下位移 2px，專業端保持平面。鍵盤 focus 使用提示藍 3px 外框及 4px 間距。禁用保留可讀標籤；體驗操作列的禁用狀態使用次層表面並取消陰影。

### Chips / Tags

可選 chip 與分頁至少 44px 高；選中採 ink 底、paper 字。狀態 tag 依完成或警告語意配色；專業端 tag 保持中性色。不要把裝飾標籤當成互動按鈕。

### Cards / Containers

一般面板使用 card 底、line-2 框及硬陰影；內距桌面 24px、手機 16px。列表與表格以分隔線串接，不要求每段內容都再包卡。專業端取消陰影；巢狀內容以留白建立層次。

### Inputs / Fields

使用系統黑體、面板底、2px 結構框與至少 48px 高度。placeholder 使用 muted；focus 取消光暈，保留清楚外框。錯誤、選取及已完成狀態沿用語意色與文字提示。

### Navigation

頂部與展開選單皆為實色面板，沒有玻璃模糊。手機底部五個入口維持像素標籤；當前入口有次層底色與 4px 黃色內側上緣。體驗流程仍保留全站導航，操作列堆疊於其上。

### Task Progress / Results

關卡以連接的方形 HUD 點呈現；當前關卡黃色，已完成青綠。資料列可框選，正確列以青綠底與左側標記回應。回饋面板搭配角色追問；結果為獨立紀錄單，CLEAR 是裝飾文字，不能代替示範說明或查驗狀態。

短動態服務換題、選取與回饋。城市窗光不循環閃爍，頁面不做整頁進場動畫。`prefers-reduced-motion` 移除位移與抖動，保留簡短透明度回饋；精確動態與斷點收錄於 sidecar。

## Do's and Don'ts

### Do:

- **Do** 以最後載入的 city.css 為執行時視覺來源，使用既有語意變數與深淺色覆寫。
- **Do** 保留至少 16px 的主要內文、44px 觸控目標、清楚焦點及安全區。
- **Do** 讓主要行動用黃、正確與完成用青綠，並以文字補充狀態。
- **Do** 保留 QR 白底、原型提示與非市府核發的示範說明。
- **Do** 使用既有城市 SVG、像素頭像與本地字型，專業端收斂陰影。

### Don't:

- **Don't** 引入米白奶油底、紫粉漸層、玻璃面板或模糊軟陰影。
- **Don't** 把長段內文改成過小像素字，或把所有內容改成重複圓角卡片。
- **Don't** 使用 emoji 取代既有圖示，或增加滿版與循環裝飾動畫。
- **Don't** 把 CLEAR、青綠結果、QR 或示範紀錄呈現成官方核發徽章。
