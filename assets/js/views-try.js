/* 短體驗只用獨立記憶體，不讀寫 shadowtask.v1。換步驟才替換畫面。 */
(function () {
  const { esc, icon } = APP.ui;
  const VID = 'TPE-TRY-2026';
  const rows = [
    ['A01', '校園', 1, '—'], ['A02', '社群', 1, '—'], ['A03', '校園', 2, '—'],
    ['A03', '校園', 2, '—'], ['A04', '社群', 1, '已取消']
  ];
  const total = rows.reduce((n, r) => n + r[2], 0);
  const correct = rows.filter((r, i) => r[3] !== '已取消' && rows.findIndex(x => x[0] === r[0]) === i).reduce((n, r) => n + r[2], 0);
  const initial = () => ({ step: 1, misses: 0, found: {}, revealed: false, wrongRow: null, adjustment: null, reason: null, hints: {}, done: false });
  let state = initial();
  const choices = {
    adjustment: ['改用免費校園公告，同時追蹤實際到場數', '改在 IG 限時動態免費宣傳，只看報名數有沒有回來', '改用去年報名最多的管道，沿用去年到場率估算'],
    reason: ['去年校園報名占六成，所以今年到場也會最多', '先在兩個校園小規模試辦，用實際到場數檢查', '公告點閱比上次多三成，所以到場也會多三成']
  };
  const answers = { adjustment: 0, reason: 1 };
  const steps = ['接工單', '抓錯', '應變', '說明', '看紀錄'];
  const caught = () => Object.keys(state.found).length === 2;
  const chat = (name, message, seed, typing = false) => `<div class="try-chat">${APP.px.avatar(seed, 32)}<div><div class="chat-meta">${name}</div><div class="chat-bubble${typing ? ' chat-arrive' : ''}"><p>${message}</p></div></div></div>`;
  const robot = () => '<svg class="try-robot" viewBox="0 0 16 16" width="32" height="32" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M7 0h2v3h4v2h2v8h-2v2H3v-2H1V5h2V3h4z"/><path fill="var(--paper)" d="M3 5h10v8H3z"/><path fill="currentColor" d="M5 7h2v2H5zm4 0h2v2H9zM5 11h6v1H5z"/></svg>';
  const ai = () => `<div class="try-chat try-ai">${robot()}<div><div class="chat-meta">AI 助手<span>已完成計算</span></div><div class="chat-bubble">共有 <span class="ai-total">${total}</span><strong class="ai-correct" hidden>${correct}</strong> 人報名，我已經幫你排除重複資料了。</div></div></div>`;
  const dataTable = (interactive = false) => `<table class="try-table${interactive ? ' interactive' : ''}"><caption>報名資料節錄・虛構示範</caption><thead><tr><th scope="col">編號</th><th scope="col">來源</th><th scope="col">人數</th><th scope="col">備註</th></tr></thead><tbody>${rows.map((r, i) => `<tr data-row="${i}"><td>${interactive ? `<button class="row-hit" data-row-pick="${i}" aria-label="第 ${i + 1} 列，${r.join('，')}" aria-pressed="false">${r[0]}</button>` : r[0]}</td><td>${r[1]}</td><td class="num">${r[2]}</td><td><span data-row-status>${r[3]}</span></td></tr>`).join('')}</tbody></table>`;
  const followup = '<div class="mentor-bridge">' + APP.px.avatar('fair-mentor', 40) + '<p class="try-followup">真實工單裡，職人會當面追問你為什麼。</p></div>';
  function feedback() {
    if (state.step === 2) {
      if (caught()) return `<div class="try-feedback good"><b>${state.revealed ? '看了提示，一起核對。' : '抓到了！'}</b><p>AI 說它排除了重複，其實沒有，還把已取消的報名算進去。正確是 <strong>${correct} 人</strong>（7 − 2 − 1）。AI 講得越肯定，越要自己對一次。</p>${followup}</div>`;
      if (state.wrongRow !== null) return `<div class="try-feedback"><b>這列可以保留，再看一下。</b><p>比對編號和備註，找出不該再算進去的報名。</p></div>`;
      if (Object.keys(state.found).length) return `<div class="try-feedback good"><b>${state.found.duplicate !== undefined ? 'A03 重複 1 筆，不能算兩次。' : 'A04 已取消，不能算進有效報名。'}</b><p>還有一個，看看其他資料列。</p></div>`;
    }
    const key = state.step === 3 ? 'adjustment' : 'reason';
    if (state.step >= 3 && state.step <= 4 && state[key] !== null) {
      const good = state[key] === answers[key];
      const explanation = key === 'adjustment' ? '付費廣告暫停，先用免費公告；保留到場紀錄，才能知道有沒有效。' : '報名不等於到場。先試辦、看結果，再決定要不要擴大。';
      return `<div class="try-feedback ${good ? 'good' : ''}"><b>${good ? (state.hints[key] ? '提示後答對。' : '答對，有留下檢查方法。') : '看了提示，再選一次。'}</b><p>${explanation}${good ? '' : '請選擇「' + choices[key][answers[key]] + '」。'}</p></div>`;
    }
    return '';
  }
  const options = key => `<div class="try-options" role="group" aria-label="${key === 'adjustment' ? '選擇調整方式' : '選擇決策理由'}">${choices[key].map((label, i) => `<button class="px-card try-option" data-choice="${key}" data-value="${i}" aria-pressed="false"><span>${label}</span>${icon('arrowRight')}</button>`).join('')}</div>`;
  const checks = () => [
    ['發現錯誤', state.revealed || state.misses > 0, `重複 1 筆＋取消 1 筆，實際 ${correct} 人`, state.revealed ? '看答案後確認' : state.misses > 0 ? '再試後找到' : '答對'],
    ['理解需求', !!state.hints.adjustment, '依預算限制調整推廣方法', state.hints.adjustment ? '再試後找到' : '答對'],
    ['說明負責', !!state.hints.reason, '用實際到場數檢查效果', state.hints.reason ? '再試後找到' : '答對']
  ];
  const marks = () => `<ul class="try-checks">${checks().map(([name, hinted, detail, label], i) => `<li style="--mark-delay:${i * 80}ms"><div><b>${name}</b><span class="result-mark ${hinted ? 'hinted' : ''}"><i aria-hidden="true"></i>${label}</span></div><p>${detail}</p></li>`).join('')}</ul><p class="try-note">拆解問題、驗證修正，要做完整工單才評。</p>`;
  const stamp = () => '<div class="try-stamp"><span class="clear-label" aria-hidden="true">CLEAR</span><b>完成體驗</b><small>示範・非正式核發</small></div>';
  const qr = () => `<div class="try-qr"><a href="${APP.ui.verifyURL(VID, true)}" aria-label="開啟線上版體驗查驗頁">${APP.ui.qrSVG(APP.ui.verifyURL(VID, true))}</a><div><b>驗證碼</b><p class="mono">${VID} <small>DEMO</small></p><p class="try-note">QR 指向線上版同一查驗網址。這次作答只在目前分頁；換裝置會看到示範說明，不會取得你的作答。</p></div></div>`;
  const recordCard = () => `<a class="try-record" href="#/verify/${VID}" aria-label="體驗紀錄（示範），開啟查驗頁"><h2>體驗紀錄（示範）</h2><p>工單 #0142・青年市集推廣分析</p>${marks()}<div class="record-verification"><div><span>驗證碼 <small>DEMO</small></span><b class="mono">${VID}</b><span>點此查驗 ${icon('arrowRight')}</span></div><div class="record-qr">${APP.ui.qrSVG(APP.ui.verifyURL(VID, true))}</div></div><p class="try-note">非市府核發・作答只在本分頁，換裝置僅顯示說明。</p></a>`;
  const result = () => `<div class="try-result-head"><h1 id="try-title" tabindex="-1">體驗完成</h1>${stamp()}</div><p class="try-official">完整工單通過職人答辯後，才會核發工單履歷。</p>${recordCard()}<p class="try-official">為什麼要由市府核發？市府是中立的第三方，企業才敢把它當成年資以外的證據。</p><p class="try-takeaway">接著，看看完整工單的回答有什麼不同。</p><a class="px-btn lg try-review-link" href="#/try/review">用企業的眼光看：<br>一位青年怎麼回答同一題 →</a><a class="try-text-link" href="#/tasks">看更多工單（完整版） ${icon('arrowRight')}</a><button class="try-text-link" data-restart>再體驗一次 ${icon('refresh')}</button>`;
  const ready = () => state.step === 1 || state.step === 2 && caught() || state.step === 3 && state.adjustment === answers.adjustment || state.step === 4 && state.reason === answers.reason;
  function screen() {
    let body = '';
    if (state.step === 1) body = `<h1 id="try-title" tabindex="-1">今天，接下這張工單。</h1>${chat('市集主管', '上一場青年市集的報名表在下面。幫我算實際有幾人報名，下一場照這個人數準備。', 'fair-supervisor', true)}${dataTable()}<p class="try-instruction">先看資料，下一步請 AI 幫忙。</p>`;
    if (state.step === 2) body = `<h1 id="try-title" tabindex="-1">AI 說得對嗎？</h1>${ai()}<p class="try-instruction">請點出有問題的資料列</p>${dataTable(true)}`;
    if (state.step === 3) body = `<h1 id="try-title" tabindex="-1">主管改需求了。</h1>${chat('市集主管', '預算砍半，先停掉付費廣告。下一場怎麼辦？', 'fair-supervisor', true)}<p class="try-instruction">你會怎麼調整？</p>${options('adjustment')}`;
    if (state.step === 4) body = `<h1 id="try-title" tabindex="-1">職人多問了一句。</h1>${chat('職人答辯官・資深活動企劃', '改用免費校園公告，你怎麼知道這樣有效？', 'fair-mentor')}<p class="try-instruction">選一個說得清楚的理由。</p>${options('reason')}`;
    if (state.step === 5) body = result();
    const label = ['接下工單，看看 AI 怎麼說', '確認答案，繼續', '看職人怎麼問', '查看體驗紀錄'][state.step - 1];
    return `<div class="try-commission"><div><span class="commission-sky">${APP.px.skyline()}</span><span class="px">工單 #0142</span></div></div><div class="try-wrap"><div class="try-progress"><ol aria-label="體驗進度">${steps.map((s, i) => `<li class="${i + 1 < state.step ? 'completed' : ''}" ${i + 1 === state.step ? 'aria-current="step"' : ''} aria-label="${s}${i + 1 < state.step ? '，已完成' : ''}">${i + 1 === state.step ? APP.px.avatar('guest', 24) : ''}</li>`).join('')}</ol><b>${steps[state.step - 1]}</b></div><section class="try-sheet${state.step === 5 ? ' result-sheet' : ''}" aria-labelledby="try-title">${body}<div data-feedback role="status" aria-live="polite" aria-atomic="true"></div></section>${state.step < 5 ? `<div class="try-dock"><div><p data-next-hint ${ready() ? 'hidden' : ''}>先完成這一步</p><button class="px-btn lg" data-next ${ready() ? '' : 'disabled'}>${label}${icon('arrowRight')}</button></div></div>` : ''}</div>`;
  }
  APP.views.try = () => {
    let root, timer, feedbackTimer, switching = false;
    function updateRows() {
      root.querySelectorAll('[data-row]').forEach(row => {
        const i = +row.dataset.row, key = Object.keys(state.found).find(k => state.found[k] === i);
        row.classList.toggle('found', !!key);
        row.classList.toggle('wrong', i === state.wrongRow);
        row.querySelector('[data-row-status]').textContent = key === 'duplicate' ? '✓ 重複' : key === 'cancel' ? '✓ 已取消' : i === state.wrongRow ? '× 可保留' : rows[i][3];
        row.querySelector('button').setAttribute('aria-pressed', String(!!key));
      });
    }
    function updateChoices() {
      root.querySelectorAll('[data-choice]').forEach(b => {
        const value = state[b.dataset.choice], selected = +b.dataset.value === value;
        b.classList.toggle('selected', selected);
        b.classList.toggle('incorrect', selected && value !== answers[b.dataset.choice]);
        b.setAttribute('aria-pressed', String(selected));
        b.disabled = value === answers[b.dataset.choice];
      });
    }
    function updateFeedback(scroll = false) {
      root.querySelector('[data-feedback]').innerHTML = feedback();
      root.querySelector('[data-next]').disabled = !ready();
      root.querySelector('[data-next-hint]').hidden = ready();
      clearTimeout(feedbackTimer);
      if (scroll) feedbackTimer = setTimeout(() => {
        const box = root.querySelector('[data-feedback]'), dock = root.querySelector('.try-dock');
        if (!box || !dock || switching) return;
        const distance = box.getBoundingClientRect().bottom - dock.getBoundingClientRect().top + 16;
        if (distance > 0) window.scrollBy({ top: distance, behavior: 'auto' });
      }, state.step === 2 && caught() ? 460 : 200);
    }
    function chooseRow(i) {
      if (state.step !== 2 || caught() || switching) return;
      const kind = i === 2 || i === 3 ? 'duplicate' : i === 4 ? 'cancel' : null;
      state.wrongRow = null;
      if (kind) {
        if (state.found[kind] !== undefined) return;
        state.found[kind] = i;
      } else {
        state.misses++;
        state.wrongRow = i;
        if (state.misses >= 2) { state.revealed = true; if (state.found.duplicate == null) state.found.duplicate = 3; state.found.cancel = 4; }
      }
      updateRows();
      if (caught()) {
        root.querySelector('.try-ai').classList.add('corrected');
        root.querySelector('.ai-correct').hidden = false;
        root.querySelectorAll('.found').forEach((row, n) => { row.style.setProperty('--found-delay', `${n * 80}ms`); row.classList.add('celebrate'); });
      } else if (!kind) {
        const row = root.querySelector(`[data-row="${i}"]`);
        row.classList.remove('shake'); void row.offsetWidth; row.classList.add('shake');
      }
      updateFeedback(true);
    }
    function changeStep(restart = false) {
      if (switching) return;
      switching = true;
      clearTimeout(feedbackTimer);
      root.querySelector('.try-sheet').classList.add('leaving');
      timer = setTimeout(() => {
        if (restart) state = initial(); else { state.step++; state.done = state.step === 5; }
        root.innerHTML = screen();
        switching = false;
        window.scrollTo(0, 0);
        root.querySelector('#try-title').focus({ preventScroll: true });
      }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 120 : 160);
    }
    return {
      title: '60 秒體驗', html: screen(),
      mount(el) {
        root = el;
        if (state.step === 2) { updateRows(); if (caught()) { root.querySelector('.try-ai').classList.add('corrected'); root.querySelector('.ai-correct').hidden = false; } }
        if (state.step < 5) updateFeedback();
        updateChoices();
        root.addEventListener('click', e => {
          if (switching) return;
          const row = e.target.closest('.interactive [data-row]');
          if (row) chooseRow(+row.dataset.row);
          const choice = e.target.closest('[data-choice]');
          if (choice && state[choice.dataset.choice] !== answers[choice.dataset.choice]) {
            const key = choice.dataset.choice, value = +choice.dataset.value;
            state[key] = value;
            if (value !== answers[key]) state.hints[key] = true;
            updateChoices();
            updateFeedback(true);
          }
          if (e.target.closest('[data-next]') && ready()) changeStep();
          if (e.target.closest('[data-restart]')) changeStep(true);
        });
      },
      unmount() { clearTimeout(timer); clearTimeout(feedbackTimer); }
    };
  };
  const unavailable = () => ({ title: '體驗示範紀錄', html: `<div class="wrap wrap-narrow page">${APP.ui.verifyNotice()}<h1 class="section-title mt16">體驗紀錄查驗</h1><p class="mt16">這個分頁還沒有已完成的作答。體驗紀錄只保留在原分頁，重新整理或換裝置後不會保留。</p>${qr()}<a class="btn btn-accent mt24" href="#/try">開始 60 秒體驗</a><a class="try-text-link" href="#/try/review">看完整工單的答辯示範 ${icon('arrowRight')}</a></div>` });
  APP.views.tryOnepage = () => {
    if (!state.done) return unavailable();
    return { title: '體驗紀錄', html: `<div class="wrap wrap-narrow page"><div class="row-between no-print"><a class="btn btn-text" href="#/try">${icon('arrowLeft')}回體驗結果</a><button class="btn btn-ghost" data-print>${icon('print')}列印／存成 PDF</button></div><article class="onepage card mt16"><div class="try-result-head"><h1>體驗紀錄</h1>${stamp()}</div><p>訪客・青年市集短體驗</p>${marks()}<dl class="kv mt24"><dt>調整方式</dt><dd>${choices.adjustment[state.adjustment]}</dd><dt>決策理由</dt><dd>${choices.reason[state.reason]}</dd></dl><p class="try-note">示範紀錄，未經職人複核。作答只存在目前分頁，不會上傳。</p><a class="try-text-link" href="#/verify/${VID}">查驗這次體驗紀錄 ${icon('arrowRight')}</a></article></div>`, mount(root) { root.querySelector('[data-print]').addEventListener('click', () => window.print()); } };
  };
  APP.tryVerify = vid => {
    if (vid !== VID) return null;
    if (!state.done) return unavailable();
    return { title: '體驗紀錄查驗', html: `<div class="wrap wrap-narrow page"><article class="card card-pad">${APP.ui.verifyNotice()}<h1 class="section-title mt16">這次的體驗紀錄</h1><p class="try-note">青年市集・本分頁訪客</p>${marks()}${qr()}<p class="try-note">未經職人複核。重新整理、關閉或換裝置後無法查到本次作答。</p><a class="try-text-link" href="#/onepage?try=1">列印這次體驗紀錄 ${icon('print')}</a><a class="try-text-link" href="#/try/review">用企業的眼光看完整答辯 ${icon('arrowRight')}</a><a class="try-text-link" href="#/try">回體驗結果 ${icon('arrowLeft')}</a></article></div>` };
  };
  APP.views.tryReview = () => ({
    title: '企業視角・答辯紀錄',
    html: `<div class="wrap wrap-narrow page try-review"><p class="sample-notice">虛構示範・人物、回答、評語與時間皆為示範</p><h1 class="section-title mt16">同一題，他怎麼回答？</h1><p class="section-sub">青年市集推廣分析・盲審代號 Y-0507</p><section class="review-dialogue"><h2>職人問題</h2><p>「改用免費校園公告，你怎麼知道這樣有效？」</p><h2>青年的回答原文節錄</h2><blockquote>「去年校園報名多，只能當起點，不能代表今年一定有效。我會先在兩個校園試辦，分開記錄公告來源、有效報名與實際到場；取消和重複報名先排除。試辦後再比較到場數，決定是否擴大。」</blockquote><h2>職人評語</h2><p>能區分報名與到場，也知道先核對資料再做決策。</p><p class="try-note">資深活動企劃，示範</p></section><div class="review-points"><div><b>做得好</b><p>沒有把去年的數據當保證，提出可檢查的試辦方法。</p></div><div><b>待加強</b><p>還要事先訂出擴大或停止試辦的判準。</p></div></div><dl class="kv mt24"><dt>所用時間</dt><dd>2 小時 42 分鐘（示範）</dd><dt>難度</dt><dd>L1</dd><dt>驗證碼</dt><dd class="mono">TPE-PW-2026-${APP.ui.hash('y0507gov-youth-fair').slice(0, 6)}</dd></dl><p class="try-note">完整工單包含資料核對、成果提交與當面追問。本頁為虛構答辯示範，非實際青年紀錄。</p><a class="try-text-link" href="#/verify/TPE-PW-2026-${APP.ui.hash('y0507gov-youth-fair').slice(0, 6)}">查驗這位青年的工單 ${icon('arrowRight')}</a><a class="try-text-link" href="#/verify/TPE-PW-2026-BA58C8">再看一張：${esc(APP.h.task('co-coffee-retention').title)} ${icon('arrowRight')}</a><a class="px-btn lg try-review-link mt24" href="#/company">到企業專區看示範人才 ${icon('arrowRight')}</a><a class="try-text-link" href="#/try">回 60 秒體驗</a></div>`
  });
})();
