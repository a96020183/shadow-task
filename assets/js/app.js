/* 路由、導覽、角色建立、啟動 */
(function () {
  const { esc, icon, $, $$, toast, modal, LOGO, level } = APP.ui;
  const px = APP.px;
  const V = APP.views;

  const ROUTES = [
    [/^\/$/, () => V.landing()],
    [/^\/try$/, () => V.try()],
    [/^\/try\/review$/, () => V.tryReview()],
    [/^\/tasks$/, () => V.tasks()],
    [/^\/task\/([\w-]+)$/, m => V.task(m[1])],
    [/^\/work\/([\w-]+)$/, m => V.work(m[1])],
    [/^\/defense\/([\w-]+)$/, m => V.defense(m[1])],
    [/^\/result\/([\w-]+)$/, m => V.result(m[1])],
    [/^\/portfolio$/, () => V.portfolio()],
    [/^\/resume$/, () => V.portfolio()],
    [/^\/p\/([\w-]+)$/, m => V.publicPortfolio(m[1])],
    [/^\/company$/, () => V.company()],
    [/^\/gov$/, () => V.gov()],
    [/^\/squad$/, () => V.squad()],
    [/^\/join\/([\w-]+)$/, m => V.join(m[1])],
    [/^\/learn$/, () => V.learn()],
    [/^\/mentor$/, () => V.mentor()],
    [/^\/onepage(?:\?try=1)?$/, m => m[0].includes("?") ? V.tryOnepage() : V.onepage()],
    [/^\/verify\/([\w-]+)$/, m => APP.tryVerify(m[1]) || V.verify(m[1])],
    [/^\/about$/, () => V.about()]
  ];
  const NAV = [
    ['#/tasks', '公會大廳', /^#\/(tasks|task|work|defense|result)/],
    ['#/squad', '戰隊', /^#\/(squad|join)/],
    ['#/portfolio', '工單履歷', /^#\/(portfolio|resume|onepage|verify)/],
    ['#/company', '企業專區', /^#\/(company|p\/)/],
    ['#/gov', '市府儀表板', /^#\/gov/],
    ['#/mentor', '職人答辯官', /^#\/mentor/],
    ['#/about', '計畫說明', /^#\/(about|learn)/]
  ];

  let current = null;

  function shell() {
    document.body.innerHTML = `
      <a class="sr-only skip" href="#/" data-skip>跳到主要內容</a>
      <details class="proto-bar"><summary>競賽提案原型・非市府官方服務 <span>說明</span></summary><p>這不是臺北市政府的官方服務。企業、局處、人物與數據皆為虛構或示範，統計數據另註出處。作答只存在這台裝置，不會上傳。</p></details>
      <header class="nav"><div class="wrap nav-in">
        <a class="brand" href="#/" aria-label="影子工單首頁">${LOGO}<span>影子工單<small>TAIPEI SHADOW-TASK</small></span></a>
        <nav id="main-links" class="nav-links" data-links aria-label="主要導覽">${NAV.map(([h, n]) => `<a href="${h}">${n}</a>`).join('')}</nav>
        <div class="nav-right">
          <span data-demo></span>
          <button class="icon-btn" data-theme-toggle aria-label="切換深淺色">${icon('moon')}</button>
          <a class="user-pill" href="#/portfolio" data-pill></a>
          <button class="icon-btn menu-btn" data-menu aria-label="開啟選單" aria-expanded="false" aria-controls="main-links">${icon('menu')}</button>
        </div>
      </div></header>
      <main id="view" tabindex="-1"></main>
      <nav class="mobile-nav" aria-label="手機主要導覽">${[['#/', '首頁', 'ticket'], ['#/tasks', '青年', 'user'], ['#/company', '企業', 'briefcase'], ['#/gov', '市府', 'chart'], ['#/mentor', '職人', 'chat']].map(([h,n,i]) => `<a href="${h}">${icon(i)}<span>${n}</span></a>`).join('')}</nav>
      <footer class="foot"><div class="wrap foot-grid">
        <div style="max-width:560px"><a class="brand" href="#/">${LOGO}<span>影子工單<small>TAIPEI SHADOW-TASK</small></span></a>
          <p class="mt12">本網站為「2026 臺北市政府青年局公共政策創意提案競賽」的提案原型，<b>不是臺北市政府的官方服務</b>。網站中的企業、局處名稱、人物與數據皆為虛構或示範，統計數據另註明出處。你的作答只存在這台裝置的瀏覽器，不會上傳到任何伺服器。</p>
          <p class="mt8 faint">像素字型：Cubic 11（俐方體 11 號，SIL OFL 1.1）。</p></div>
        <div class="stack" style="--gap:6px"><b style="color:var(--ink)">頁面</b>${NAV.map(([h, n]) => `<a href="${h}">${n}</a>`).join('')}<a href="#/learn">學習成效榜</a></div>
        <details class="prototype-tools"><summary>原型操作</summary><div class="row"><a href="#" data-load-demo>載入示範帳號</a><a href="#" data-reset>重設為新帳號</a></div></details>
      </div></footer>`;
    document.addEventListener('click', e => {
      if (e.target.closest('[data-theme-toggle]')) { APP.theme.set(APP.theme.effective() === 'dark' ? 'light' : 'dark'); paintChrome(); }
      if (e.target.closest('[data-menu]')) { const open = $('[data-links]').classList.toggle('open'); $('[data-menu]').setAttribute('aria-expanded', String(open)); }
      if (e.target.closest('a[href^="#/"]')) { $('[data-links]').classList.remove('open'); $('[data-menu]').setAttribute('aria-expanded', 'false'); }
      if (e.target.closest('[data-load-demo]')) { e.preventDefault(); confirmDemo(); }
      if (e.target.closest('[data-reset]')) { e.preventDefault(); confirmReset(); }
      if (e.target.closest('[data-demo-chip]')) demoMenu();
      if (e.target.closest('[data-skip]')) { e.preventDefault(); const v = $('#view'); if (v) v.focus(); }
    });
  }

  function confirmDemo() {
    modal({ title: '載入示範帳號？', body: '<p>會載入示範帳號「小安」：2 張已完成工單、1 個戰隊與邀請紀錄。目前這台裝置上的作答會被覆蓋。</p>', actions: [{ label: '取消' }, { label: '載入示範帳號', cls: 'btn-primary', onClick: c => { c(); APP.demo.load(); toast('已載入示範帳號「小安」', 'ok'); location.hash = '#/tasks'; render(); } }] });
  }
  function confirmReset() {
    modal({ title: '重設為新帳號？', body: '<p>會清除這台裝置上的所有作答、戰隊與履歷，從建立角色開始體驗完整流程。</p>', actions: [{ label: '取消' }, { label: '重設', cls: 'btn-primary', onClick: c => { c(); APP.demo.fresh(); toast('已重設，從建立角色開始吧', 'ok'); location.hash = '#/tasks'; render(); } }] });
  }
  function demoMenu() {
    modal({
      title: '示範模式', body: '<p>你正在使用示範帳號「小安」。示範帳號已完成 2 張工單，物流客服工單留給你親自體驗。</p><p class="muted mt8">想從零開始體驗建立角色、學校信箱驗證的流程，可以重設為新帳號。</p>',
      actions: [{ label: '重設為新帳號', onClick: c => { c(); confirmReset(); } }, { label: '去接物流客服工單', cls: 'btn-primary', onClick: c => { c(); location.hash = '#/task/co-logistics-cs'; } }]
    });
  }

  function paintChrome() {
    const s = APP.store.get();
    const hash = location.hash || '#/';
    $$('[data-links] a').forEach((a, i) => a.classList.toggle('active', NAV[i][2].test(hash)));
    $$('.mobile-nav a').forEach(a => {
      const h = a.getAttribute('href');
      const active = h === '#/' ? /^#\/(?:try(?:\/review)?)?$/.test(hash) : h === '#/tasks' ? /^#\/(tasks|task|work|defense|result|squad|join|portfolio|resume|onepage|learn)/.test(hash) : hash.startsWith(h);
      active ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
    });
    const lv = level(s.xp);
    const judging = /^#\/(?:$|try(?:\/review)?$|company$|verify\/|p\/)/.test(hash);
    $('[data-pill]').hidden = judging;
    $('[data-pill]').innerHTML = judging ? '' : s.onboarded
      ? `<span class="avatar" style="background:var(--night);padding:2px">${px.avatar(s.user.name, 24)}</span><span class="who">${esc(s.user.name)} <span class="lv">LV.${lv.lv}</span></span>`
      : `<span class="avatar">${icon('user')}</span><span class="who">訪客</span>`;
    $('[data-demo]').innerHTML = s.demo ? `<button class="chip" data-demo-chip style="border-color:var(--accent);background:var(--accent-soft)">${icon('star')}示範模式</button>` : '';
    $('[data-theme-toggle]').innerHTML = icon(APP.theme.effective() === 'dark' ? 'sun' : 'moon');
  }

  function render() {
    const path = (location.hash || '#/').slice(1) || '/';
    document.body.dataset.route = (path.split('/')[1] || 'home').split('?')[0];
    document.body.classList.toggle('professional', /^(company|gov|mentor|verify|onepage|p)$/.test(document.body.dataset.route));
    let view = null;
    try {
      for (const [re, fn] of ROUTES) { const m = path.match(re); if (m) { view = fn(m); break; } }
      if (!view) view = V.notFound();
    } catch (err) {
      console.error(err);
      view = { title: '發生錯誤', html: `<div class="wrap wrap-narrow page"><div class="card empty"><h2 style="font-size:22px">這個頁面出了點問題</h2><p class="muted mt8">可能是這台裝置上的資料格式不相容。重設後即可正常使用。</p><div class="row mt24" style="justify-content:center"><button class="btn btn-primary" data-reset>${icon('refresh')}重設資料</button><a class="btn btn-ghost" href="#/">回首頁</a></div></div></div>` };
    }
    if (current && current.unmount) { try { current.unmount(); } catch (e) { console.error(e); } }
    $$('.modal-bg').forEach(m => m.remove());
    current = view;
    // 每次換頁換一個新容器，避免前一頁掛的事件監聽器累積
    const old = $('#view');
    const root = old.cloneNode(false);
    old.replaceWith(root);
    root.innerHTML = view.html || '';
    document.title = (view.title ? view.title + '｜' : '') + '影子工單・臺北青年工作證明';
    if (view.mount) { try { view.mount(root); } catch (err) { console.error(err); } }
    paintChrome();
  }
  APP.render = render;

  /* ---------------- 建立角色 ---------------- */
  APP.onboard = function (then) {
    const s = APP.store.get();
    let code = null, verified = false, verifiedEmail = '';
    modal({
      title: '建立你的接案者角色',
      wide: true,
      body: `<div class="stack" style="--gap:16px">
        <div class="row" style="gap:14px"><div style="background:var(--night);width:72px;height:72px;display:grid;place-items:center" data-ava>${px.avatar('guest', 56)}</div><p class="muted" style="font-size:13.5px;flex:1">只需要 1 分鐘。你的作答只存在這台裝置的瀏覽器，原型不會上傳任何資料。</p></div>
        <div class="grid g2" style="gap:12px">
          <label class="field"><span>暱稱</span><input class="input" data-name maxlength="12" placeholder="例：小安" value="${esc(s.user.name)}"></label>
          <label class="field"><span>目前身分</span><select class="select" data-who>${['在學生', '應屆畢業（2 年內）', '轉職中', '接案・非典就業', '待業中', '其他'].map(w => `<option ${s.user.who === w ? 'selected' : ''}>${w}</option>`).join('')}</select></label>
        </div>
        <div class="field"><span>身分驗證<em>選填，驗證後才能加入校際榜、領取推薦獎勵</em></span>
          <div class="tabs" style="margin-bottom:10px"><button type="button" class="on" data-vt="edu">學校信箱（在學生）</button><button type="button" data-vt="tp">臺北通（其他身分）</button></div>
          <div data-vbox="edu"><div class="row"><input class="input" data-email placeholder="你的學校信箱，例如 s1234@mail.xxx.edu.tw" style="flex:1"><button type="button" class="btn btn-ghost" data-send>${icon('mail')}寄送驗證碼</button></div>
            <div class="row mt8 hide" data-coderow><input class="input mono" data-code maxlength="6" placeholder="6 位數驗證碼" style="max-width:180px"><button type="button" class="btn btn-ghost" data-verify>驗證</button><span class="faint" style="font-size:12.5px" data-codehint></span></div>
            <label class="field mt8"><span>學校名稱</span><input class="input" data-school placeholder="例：臺北示範大學" value="${esc(s.user.school)}"></label></div>
          <div data-vbox="tp" class="hide"><button type="button" class="btn btn-ghost" data-tp>${icon('shield')}以臺北通登入（示範）</button><p class="faint mt8" style="font-size:12.5px">正式版以臺北通進行實名驗證，確保一人一帳號。</p></div>
        </div>
        <div class="field"><span>現在想到找工作，你的焦慮程度？<em>1 = 幾乎不焦慮，5 = 非常焦慮</em></span>
          <div class="scale">${[1, 2, 3, 4, 5].map(n => `<label><input type="radio" name="anx" value="${n}" ${s.anxiety.pre === n ? 'checked' : ''}><span>${n}</span></label>`).join('')}</div>
          <p class="faint mt8" style="font-size:12px">完成工單後會再問一次，作為市府評估「減緩求職焦慮」成效的指標。</p></div>
      </div>`,
      actions: [{ label: '稍後再說' }, {
        label: '建立角色並開始', cls: 'btn-primary', onClick: (close, bg) => {
          const name = $('[data-name]', bg).value.trim();
          if (!name) { toast('請輸入暱稱', 'warn'); $('[data-name]', bg).focus(); return; }
          s.user.name = name; s.user.who = $('[data-who]', bg).value; s.user.school = $('[data-school]', bg).value.trim();
          const em = $('[data-email]', bg).value.trim();
          if (verified === 'edu' && em === verifiedEmail) { s.user.schoolVerified = true; s.user.email = em; }
          else if (verified === 'edu') { s.user.schoolVerified = false; toast('信箱已更改，學校信箱驗證未完成', 'warn'); }
          if (verified === 'tp') s.user.idVerified = true;
          const anx = bg.querySelector('[name=anx]:checked'); if (anx) s.anxiety.pre = +anx.value;
          s.onboarded = true; s.demo = false; APP.store.save();
          close(); toast(`歡迎，${name}！`, 'ok'); paintChrome(); then && then();
        }
      }],
      onOpen(bg) {
        bg.addEventListener('input', e => { if (e.target.dataset.name !== undefined) $('[data-ava]', bg).innerHTML = px.avatar(e.target.value || 'guest', 56); });
        bg.addEventListener('click', e => {
          const vt = e.target.closest('[data-vt]');
          if (vt) { $$('[data-vt]', bg).forEach(b => b.classList.toggle('on', b === vt)); $$('[data-vbox]', bg).forEach(b => b.classList.toggle('hide', b.dataset.vbox !== vt.dataset.vt)); }
          if (e.target.closest('[data-send]')) {
            const em = $('[data-email]', bg).value.trim();
            if (!/^[^@\s]+@[^@\s]+\.edu\.tw$/i.test(em)) { toast('請輸入 .edu.tw 結尾的學校信箱', 'warn'); return; }
            code = String(Math.floor(100000 + Math.random() * 900000));
            $('[data-coderow]', bg).classList.remove('hide');
            $('[data-codehint]', bg).innerHTML = `原型不會真的寄信，示範驗證碼：<b class="mono">${code}</b>`;
            $('[data-code]', bg).focus();
          }
          if (e.target.closest('[data-verify]')) {
            if (code && $('[data-code]', bg).value.trim() === code) { verified = 'edu'; verifiedEmail = $('[data-email]', bg).value.trim(); $('[data-codehint]', bg).innerHTML = '<span style="color:var(--teal);font-weight:700">✓ 學校信箱已驗證</span>'; toast('學校信箱驗證成功', 'ok'); }
            else toast('驗證碼不正確', 'bad');
          }
          if (e.target.closest('[data-tp]')) { verified = 'tp'; e.target.closest('[data-tp]').outerHTML = '<span class="tag tag-ok">✓ 已以臺北通完成實名驗證（示範）</span>'; }
        });
      }
    });
  };

  /* ---------------- 啟動 ---------------- */
  function boot() {
    let first = false;
    try { first = localStorage.getItem('shadowtask.v1') === null; } catch (e) { first = true; }
    if (first) APP.demo.load(false);
    shell();
    window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { const l = $('[data-links]'); if (l && l.classList.contains('open')) { l.classList.remove('open'); const m = $('[data-menu]'); if (m) { m.setAttribute('aria-expanded', 'false'); m.focus(); } } }
    });
    if (window.matchMedia) {
      const mq = matchMedia('(prefers-color-scheme: dark)');
      if (mq.addEventListener) mq.addEventListener('change', paintChrome);
      else if (mq.addListener) mq.addListener(paintChrome);
    }
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
