/* 決賽短體驗。只用記憶體，完全不讀寫帳號、作答或 localStorage。 */
(function () {
  const { esc, icon } = APP.ui;
  const VID = 'TPE-TRY-2026';
  const rows = [
    ['A01', '校園', 1], ['A02', '社群', 1], ['A03', '校園', 2],
    ['A03', '校園', 2], ['A04', '社群', 1]
  ];
  const total = rows.reduce((n, r) => n + r[2], 0);
  const unique = rows.filter((r, i) => rows.findIndex(x => x[0] === r[0]) === i).reduce((n, r) => n + r[2], 0);
  const initial = () => ({ step: 1, misses: 0, caught: false, revealed: false, adjustment: null, reason: null, done: false });
  let state = initial();
  const choices = {
    adjustment: ['維持原案，先把廣告投出去', '改用免費校園公告，追蹤實際到場', '把每個管道的預算都減半'],
    reason: ['AI 推薦校園，所以照做', '校園報名最多，之後不用再看數據', '預算有限，先小規模試辦，再用到場數檢查']
  };
  const steps = ['接單', '抓錯', '應變', '說明', '拿證明'];
  const dataTable = () => `<table class="try-table"><caption>報名資料節錄・虛構示範</caption><thead><tr><th scope="col">報名編號</th><th scope="col">來源</th><th scope="col">人數</th></tr></thead><tbody>${rows.map((r, i) => `<tr class="${state.caught && (i === 2 || i === 3) ? 'duplicate' : ''}">${r.map((c, j) => `<td${j === 2 ? ' class="num"' : ''}>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const feedback = () => {
    if (state.step === 2) {
      if (state.caught) return `<div class="try-feedback good" role="status"><b>${state.revealed ? '一起看答案' : '抓到了！A03 被算了兩次。'}</b><p>同一編號只算一次，${total} − 2 = ${unique} 人。${state.revealed ? '確認重複資料後，就能往下做。' : 'AI 的加法沒錯，但資料重複了。'}</p></div>`;
      if (state.misses) return '<div class="try-feedback" role="status"><b>這句沒錯，再看一次。</b><p>試著比對報名編號，有沒有同一筆出現兩次？</p></div>';
    }
    if (state.step === 3 && state.adjustment !== null) return `<div class="try-feedback ${state.adjustment === 1 ? 'good' : ''}" role="status"><b>${state.adjustment === 1 ? '有顧到新限制。' : '先確認主管的新限制。'}</b><p>付費廣告暫停，先用免費公告；保留到場紀錄，才能知道有沒有效。</p></div>`;
    if (state.step === 4 && state.reason !== null) return `<div class="try-feedback ${state.reason === 2 ? 'good' : ''}" role="status"><b>${state.reason === 2 ? '這個理由有依據，也能檢查。' : '決定還需要一個檢查方法。'}</b><p>報名不等於到場。先試辦、看結果，再決定要不要擴大。</p></div>`;
    return '';
  };
  const options = key => `<div class="try-options" role="group" aria-label="${key === 'adjustment' ? '選擇調整方式' : '選擇決策理由'}">${choices[key].map((label, i) => `<button class="try-option ${state[key] === i ? 'selected' : ''}" data-choice="${key}" data-value="${i}" aria-pressed="${state[key] === i}" ${state[key] !== null ? 'disabled' : ''}><span>${label}</span>${state[key] === i ? icon('check') : icon('arrowRight')}</button>`).join('')}</div>`;
  const checks = () => [
    [state.revealed ? '確認 AI 的錯 ✓' : '抓出 AI 的錯 ✓', state.revealed ? '提示後確認，實際為 5 人' : `比對重複編號${state.misses ? '，再試後答對' : '，第一次答對'}`],
    ['處理需求變更 ✓', state.adjustment === 1 ? '選擇免費管道並追蹤到場' : '已看解析；這題還可以再練'],
    ['說明決策 ✓', state.reason === 2 ? '先試辦，再用到場數檢查' : '已看解析；記得說明如何檢查']
  ];
  // 只顯示本次作答所支持的項目；不把 60 秒選擇題當作正式五力評量。
  const dimensions = () => [
    [state.adjustment === 1 ? 100 : 50, state.adjustment === 1 ? '已選對' : '看過解析'],
    [null, '完整工單評量'],
    [state.revealed ? 50 : state.misses ? 75 : 100, state.revealed ? '提示後確認' : state.misses ? '再試答對' : '已選對'],
    [null, '完整工單評量'],
    [state.reason === 2 ? 100 : 50, state.reason === 2 ? '已選對' : '看過解析']
  ];
  const bars = () => `<div class="try-dimensions">${dimensions().map(([n, label], i) => `<div><span>${APP.DIMS[i].n}</span><div class="try-track" aria-hidden="true">${n === null ? '' : `<i style="width:${n}%"></i>`}</div><small>${label}</small></div>`).join('')}</div>`;
  const stamp = () => '<div class="try-stamp"><span>體驗完成</span><b>VERIFIED</b><small>示範章</small></div>';
  const result = () => `<div class="try-result-head"><div><h1 id="try-title" tabindex="-1">工單履歷已完成</h1><p>青年市集・60 秒體驗</p></div>${stamp()}</div>
    <ul class="try-checks">${checks().map(([a, b]) => `<li><b>${a}</b><span>${b}</span></li>`).join('')}</ul>
    ${bars()}<p class="try-note">短體驗只記錄選擇；完整五力須經實作與職人複核。</p>
    <p class="try-takeaway">這就是影子工單：不看你上過什麼課，看你能不能把事做對。</p>
    <a class="try-text-link" href="#/verify/${VID}">查驗這張證明 ${icon('arrowRight')}</a>
    <a class="try-text-link" href="#/tasks">想看完整版？進入公會大廳 ${icon('arrowRight')}</a>
    <button class="try-text-link" data-restart>再體驗一次 ${icon('refresh')}</button>`;
  const ready = () => state.step === 1 || state.step === 2 && state.caught || state.step === 3 && state.adjustment !== null || state.step === 4 && state.reason !== null;
  function screen() {
    let body = '';
    if (state.step === 1) body = `<h1 id="try-title" tabindex="-1">今天，你接到一張委託。</h1><div class="try-person">${APP.px.avatar('fair-supervisor', 38)}<span>市集主管的交辦</span></div><blockquote>「先確認有幾人報名，再想想怎麼推廣下一場。」</blockquote>${dataTable()}<p class="try-note">同一報名編號只算一次。先看資料，下一步請 AI 幫忙。</p>`;
    if (state.step === 2) body = `<h1 id="try-title" tabindex="-1">AI 說得對嗎？</h1><p class="try-instruction">點出 AI 回答裡有問題的那一句。</p>${dataTable()}<div class="try-ai"><b>AI 助手的回答</b><div class="try-options">${[`共有 ${total} 人報名。`, '資料裡有校園與社群兩個來源。'].map((s, i) => `<button class="try-option ${state.caught && i === 0 ? 'selected' : ''}" data-claim="${i}" ${state.caught ? 'disabled' : ''}>${s}${icon(state.caught && i === 0 ? 'check' : 'flag')}</button>`).join('')}</div></div>${feedback()}`;
    if (state.step === 3) body = `<h1 id="try-title" tabindex="-1">主管改需求了。</h1><div class="try-person">${APP.px.avatar('fair-supervisor', 38)}<span>主管剛傳來訊息</span></div><blockquote>「預算縮減，先停掉付費廣告。下一場怎麼辦？」</blockquote><p class="try-instruction">你會怎麼調整？</p>${options('adjustment')}${feedback()}`;
    if (state.step === 4) body = `<h1 id="try-title" tabindex="-1">職人多問了一句。</h1><div class="try-person">${APP.px.avatar('fair-mentor', 38)}<span>資深活動企劃</span></div><blockquote>「改用免費校園公告，你怎麼知道這樣有效？」</blockquote><p class="try-instruction">選一個說得清楚的理由。</p>${options('reason')}${feedback()}`;
    if (state.step === 5) body = result();
    const label = ['接下委託，看看 AI 怎麼說', '確認答案，繼續', '看職人怎麼問', '領取體驗證明'][state.step - 1];
    return `<div class="try-wrap"><div class="try-progress"><span>${state.step} / 5</span><ol aria-label="體驗進度">${steps.map((s, i) => `<li ${i + 1 === state.step ? 'aria-current="step"' : ''} class="${i + 1 <= state.step ? 'reached' : ''}">${s}</li>`).join('')}</ol></div><section class="try-sheet" aria-labelledby="try-title">${body}</section>
      <div class="try-dock"><div>${state.step === 5 ? '<a class="btn btn-accent" href="#/onepage?try=1">看完整工單履歷</a>' : `<button class="btn btn-accent" data-next ${ready() ? '' : 'disabled'}>${label}${icon('arrowRight')}</button>`}</div></div></div>`;
  }
  APP.views.try = () => ({
    title: '60 秒體驗', html: screen(),
    mount(root) {
      const update = next => {
        root.innerHTML = screen();
        if (next) { window.scrollTo(0, 0); root.querySelector('#try-title').focus({ preventScroll: true }); }
        else {
          const f = root.querySelector('.try-feedback');
          if (f) { f.tabIndex = -1; f.focus({ preventScroll: true }); f.scrollIntoView({ block: 'nearest', behavior: 'auto' }); }
        }
      };
      root.addEventListener('click', e => {
        const claim = e.target.closest('[data-claim]');
        if (claim && state.step === 2 && !state.caught) {
          if (claim.dataset.claim === '0') state.caught = true;
          else { state.misses++; if (state.misses >= 2) { state.caught = true; state.revealed = true; } }
          update(false);
        }
        const choice = e.target.closest('[data-choice]');
        if (choice && state[choice.dataset.choice] === null) { state[choice.dataset.choice] = +choice.dataset.value; update(false); }
        if (e.target.closest('[data-next]') && ready()) { state.step++; if (state.step === 5) state.done = true; update(true); }
        if (e.target.closest('[data-restart]')) { state = initial(); update(true); }
      });
    }
  });
  const unavailable = () => ({ title: '體驗證明', html: '<div class="wrap wrap-narrow page"><h1 class="section-title">先完成這台裝置的短體驗</h1><p class="mt16">體驗紀錄只保留在這個分頁，重新整理後就會清除。這不是正式核發的工作證明。</p><a class="btn btn-accent mt24" href="#/try">開始 60 秒體驗</a><a class="btn btn-text mt16" href="#/verify/TPE-PW-2026-BA58C8">看完整工單的查驗範例</a></div>' });
  APP.views.tryOnepage = () => {
    if (!state.done) return unavailable();
    return { title: '體驗工單履歷', html: `<div class="wrap wrap-narrow page"><div class="row-between no-print"><a class="btn btn-text" href="#/try">${icon('arrowLeft')}回體驗結果</a><button class="btn btn-ghost" data-print>${icon('print')}列印／存成 PDF</button></div><article class="onepage card mt16"><div class="try-result-head"><div><h1>工單履歷</h1><p>訪客・青年市集短體驗</p></div>${stamp()}</div>${bars()}<h2 class="mt24">這次留下的工作紀錄</h2><ul class="try-checks">${checks().map(([a,b]) => `<li><b>${a}</b><span>${b}</span></li>`).join('')}</ul><dl class="kv"><dt>調整方式</dt><dd>${choices.adjustment[state.adjustment]}</dd><dt>決策理由</dt><dd>${choices.reason[state.reason]}</dd></dl><p class="try-note mt16">體驗完成章僅代表走完流程，未經職人複核。完整五力需另做完整工單。作答只存在這台裝置目前的分頁，不會上傳。</p><a class="btn btn-primary mt16" href="#/verify/${VID}">查驗這張證明</a></article><a class="btn btn-text mt16" href="#/onepage">看帳號的完整工單履歷</a></div>`, mount(root) { root.querySelector('[data-print]').addEventListener('click', () => window.print()); } };
  };
  APP.tryVerify = vid => {
    if (vid !== VID) return null;
    if (!state.done) return unavailable();
    return { title: '體驗紀錄查驗', html: `<div class="wrap wrap-narrow page"><article class="card card-pad"><div class="try-result-head"><h1 class="section-title">這份體驗紀錄可核對</h1>${stamp()}</div><p class="mt16">青年市集・本分頁訪客</p><ul class="try-checks">${checks().map(([a,b]) => `<li><b>${a}</b><span>${b}</span></li>`).join('')}</ul><p>這是短體驗的示範章，尚未經職人複核。紀錄不會上傳，重新整理或換裝置就無法查到。</p><a class="btn btn-primary mt24" href="#/onepage?try=1">回這張工單履歷</a><a class="try-text-link" href="#/verify/TPE-PW-2026-BA58C8">看完整工單的查驗範例 ${icon('arrowRight')}</a></article></div>` };
  };
})();
