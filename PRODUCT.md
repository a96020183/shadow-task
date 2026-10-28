# 影子工單

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

決賽評審現場以手機掃 QR；青年體驗工單、企業查看工作成果、職人複核答辯、市府閱讀政策指標。

## Product Purpose

臺北市青年局 2026 公共政策創意提案競賽原型。以去機密化工單、錯誤注入、需求變更及職人追問，展示年資以外可查驗的工作證據。

## Operating Context

首頁開始 60 秒體驗，五步依序為接工單、抓錯、應變、說明、看紀錄。接著可以看企業視角的答辯與示範查驗頁，或繼續完整工單。

## Capabilities and Constraints

原生 HTML/CSS/JS 與 hash 路由，無框架、無建置、執行時無外部請求。既有 data-*、shadowtask.v1、驗證碼及 QR 保留。內容已和企畫書對齊，不改文字。短體驗只留在分頁記憶體；原型沒有後端發證與跨裝置同步。

網站並非市府官方服務，查驗與紀錄必須清楚標示示範、非市府核發。兩個既有代碼為 TPE-PW-2026-BA58C8、TPE-TRY-2026。

## Brand Commitments

本 worktree 為 design-C「像素城市・任務板」：對應團隊 90 秒影片的臺北城市遊戲世界，既有 Cubic 11 與像素頭像、APP.px.skyline()。預設深色，也提供可讀的白天模式。

## Evidence on Hand

assets/js/data.js、決賽版改動說明.md 與既有測試。人物、回答、評語、數據均為明示的虛構或示範；不可暗示有真實政策成效或正式核發。

## Accessibility & Inclusion

繁體中文、手機 360/390px 無橫向溢出、內文至少 16px、可點目標至少 44px、清楚 focus ring、safe-area、reduced-motion、深淺兩色。尚需實機 iOS Safari、Android Chrome、LINE 掃碼驗證。
