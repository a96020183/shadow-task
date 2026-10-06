/* 公開頁面：首頁、公會大廳、工單詳情、學習成效榜、計畫說明 */
(function () {
  const { esc, nl, icon, level } = APP.ui;
  const px = APP.px;
  const V = APP.views = APP.views || {};

  /* ---------- 共用 ---------- */
  const H = APP.h = {
    task: id => APP.TASKS.find(t => t.id === id),
    orgTag: t => `<span class="tag ${t.orgType === 'gov' ? 'tag-gov' : 'tag-co'}">${icon(t.orgType === 'gov' ? 'building' : 'briefcase')}${APP.ORG_TYPES[t.orgType]}</span>`,
    xpFor: t => 60 + t.hours * 20,
    me() { const s = APP.store.get(); return { name: s.user.name || '訪客', xp: s.xp, lv: level(s.xp), s }; },
    gradeOf: total => total >= 90 ? 'S' : total >= 75 ? 'A' : total >= 60 ? 'B' : 'C',
    stateOf(t) {
      const a = APP.store.attempt(t.id);
      if (!a) return { k: 'new' };
      if (a.result) return { k: 'done', grade: a.result.grade };
      return { k: 'working', step: a.step };
    },
    src: (txt) => `<span class="faint" style="font-size:11.5px">${esc(txt)}</span>`
  };

  function startTask(id, practice) {
    const s = APP.store.get();
    const go = () => { const a = APP.store.ensureAttempt(id); a.practice = !!practice; APP.store.save(); location.hash = '#/work/' + id; };
    if (!s.onboarded) return APP.onboard(go);
    go();
  }
  APP.startTask = startTask;

  /* ======================================================== 首頁 */
  V.landing = () => {
    const featured = APP.TASKS.filter(t => t.status === 'open');
    return {
      title: '沒有年資，也有證明',
      html: `
      <section class="hero"><div class="wrap hero-grid">
        <div>
          <div class="eyebrow">臺北影子工單計畫・公共政策提案原型</div>
          <h1 class="mt16">沒有年資，<br>也有<span class="hl"><span>證明</span></span>。</h1>
          <p class="hero-lead">接下市府與企業提供的<b>去機密化歷史工單</b>，自由使用 AI。但<span class="lie">我們故意讓 AI 說謊</span>：抓出錯誤資料、應付中途的需求變更，最後完成答辯。<br>我們不認證你上過什麼課，而是證明你<b>真的能把工作做對</b>。</p>
          <div class="hero-cta">
            <a class="px-btn lg" href="#/tasks">${px.sprite('scroll', { size: 22 })}進入公會大廳</a>
            <a class="btn btn-ghost btn-lg" href="#/company">${icon('briefcase')}我是企業</a>
          </div>
          <div class="hero-proof">
            <div><b>51.8%</b><span>新鮮人最擔心「缺乏相關工作經驗」<br>${H.src('1111 人力銀行，2026')}</span></div>
            <div><b>34.4%</b><span>企業：新人面試說的和實際表現有落差<br>${H.src('yes123，2025')}</span></div>
            <div><b>.07</b><span>「年資」預測工作表現的效度<br>${H.src('Sackett et al., 2022')}</span></div>
          </div>
        </div>
        <div class="hero-visual" aria-hidden="true">
          <div class="peek">${px.avatar('hero-peek', 54)}</div>
          <div class="ticket hv-card c1">
            <div class="ticket-top">
              <div class="row-between"><span class="ticket-id">TPE-G-0142</span>${H.orgTag(APP.TASKS[0])}</div>
              <h3>青年市集報名數據分析與下季推廣預算建議</h3>
              <div class="row" style="gap:6px"><span class="tag">資料判讀</span><span class="tag">預算分配</span><span class="tag">一頁式報告</span></div>
            </div>
            <div class="ticket-perf"></div>
            <div class="ticket-foot"><div class="meta"><span>${icon('clock')}3 小時</span><span class="lvl lvl-1">L1</span></div><span>AI 可用・需揭露</span></div>
          </div>
          <div class="card card-pad hv-card c2" style="padding:18px">
            <div class="row-between"><b style="font-size:14px">工作台・進行中</b><span class="timer">${icon('clock')}01:42:18</span></div>
            <div class="hv-event warn">${px.sprite('bolt', { size: 18 })}<div><b>主管來信：需求變更</b><br>下季預算從 50 萬刪為 35 萬，第 2 場改平日晚上。</div></div>
            <div class="hv-event bad">${icon('flag')}<div><b>你標記了 AI 的回答</b><br>「KOL 每位到場成本約 NT$210」，實際約 NT$567。</div></div>
          </div>
          <div class="card hv-card c3" style="padding:18px 20px">
            <div class="row" style="gap:12px">${px.avatar('Y-0507', 40)}<div><b>Y-0507・工單履歷</b><div class="faint mono" style="font-size:11.5px">TPE-PW-2026-8F3A1C</div></div><span class="grade grade-S sm" style="margin-left:auto">S</span></div>
            <div class="mini-dims mt12">${APP.DIMS.map((d, i) => `<div><b>${[82, 90, 96, 80, 74][i]}</b><span>${d.n}</span></div>`).join('')}</div>
            <div class="hv-stamp"><span class="stamp">已驗證<b>VERIFIED</b></span></div>
          </div>
        </div>
      </div></section>

      <section class="wrap mt64">
        <div class="eyebrow">問題</div>
        <h2 class="section-title mt8">企業不是不要新人，是沒辦法低成本確認新人能不能做事。</h2>
        <p class="section-sub">所以只好用「年資」擋人。新人陷入沒經驗、沒工作、更沒經驗的循環，而 AI 正在把最適合新人練手的入門工作自動化。</p>
        <div class="card mt24"><div class="loop">
          <div class="loop-node"><b>沒有經驗</b><span class="muted">履歷上只有學校與成績</span></div>
          <div class="loop-node" style="border-left:1px dashed var(--line);border-right:1px dashed var(--line)"><b>找不到工作</b><span class="muted">職缺要求「相關經驗 1–3 年」</span></div>
          <div class="loop-node"><b>更沒有經驗</b><span class="muted">入門工作又被 AI 吃掉</span></div>
        </div></div>
        <div class="grid g3 mt24">
          <div class="card kpi"><div class="label">22–25 歲在高 AI 暴露職業的就業（相對同儕）</div><div class="value">−13% → −19%</div><div class="delta muted" style="font-weight:400">Stanford Digital Economy Lab，2025 初版 → 2026 修訂</div></div>
          <div class="card kpi"><div class="label">大學程度失業率：各教育程度中最高</div><div class="value">4.56%</div><div class="delta muted" style="font-weight:400">主計總處，2026 年 8 月（全體 3.41%）</div></div>
          <div class="card kpi"><div class="label">臺北市 25–29 歲失業率（全國 5.77%）</div><div class="value">7.8%</div><div class="delta muted" style="font-weight:400">主計總處，2025 年；2024 年起回升</div></div>
        </div>
      </section>

      <section class="wrap mt96">
        <div class="eyebrow">同一個人，兩種證明</div>
        <h2 class="section-title mt8">HR 只花 10 秒看履歷。這 10 秒，決定新人有沒有機會。</h2>
        <div class="two-cv mt32">
          <div class="cv old"><div class="cv-h">傳統履歷</div>
            <dl><dt>學歷</dt><dd>私立科技大學・企業管理系</dd><dt>經歷</dt><dd>無相關工作經驗</dd><dt>技能</dt><dd>Excel、PowerPoint、ChatGPT</dd><dt>證照</dt><dd>AI 應用證照</dd><dt>自傳</dt><dd>「我學習能力強、抗壓性高……」</dd></dl>
            <div class="cv-v bad">${icon('x')}HR：沒經驗，先跳過</div></div>
          <div class="cv-mid">${icon('arrowRight')}<span>同一個人</span></div>
          <div class="cv new"><div class="cv-h">工單履歷<span class="tag" style="margin-left:8px">盲審 Y-0412</span></div>
            <dl><dt>已驗證</dt><dd>3 張：咖啡品牌回購診斷 <b>S</b>・市集預算建議 <b>A</b>・物流客訴 SOP <b>A</b></dd><dt>抓錯</dt><dd>埋設錯誤 8/9，含 2 次 AI 的錯誤數字</dd><dt>應變</dt><dd>3 次需求變更皆完整調整</dd><dt>答辯</dt><dd>「我會給老闆看拆分表：舊會員只掉 4 個百分點，問題在新客留不住。」</dd></dl>
            <div class="cv-v ok">${icon('check')}HR：這個人可以約面試</div></div>
        </div>
      </section>

      <section class="wrap mt96">
        <div class="eyebrow">怎麼運作</div>
        <h2 class="section-title mt8">像真的上班一樣，只是這次犯錯不用付代價。</h2>
        <div class="steps mt32">
          ${[
            ['scroll', '接單', '從公會大廳挑一張去機密化的歷史工單，2–4 小時可完成。'],
            ['bubble', '理解與拆解', '先用自己的話重述需求、向主管提問，再把任務拆成步驟。'],
            ['gem', '實作（可用 AI）', '自由使用 AI，但要揭露怎麼用、怎麼驗證。'],
            ['bolt', '突發事件', '資料裡埋了錯、AI 會出錯、主管中途改需求。', 1],
            ['shield', '答辯 → 工單履歷', '由職人答辯官追問你的決定，通過後核發可驗證的工單履歷。']
          ].map((s, i) => `<div class="card step-card ${s[3] ? 'hot' : ''}"><div class="step-ico">${px.sprite(s[0], { size: 22 })}</div><div class="num mt12">STEP 0${i + 1}</div><h4>${s[1]}</h4><p>${s[2]}</p></div>`).join('')}
        </div>
      </section>

      <section class="wrap mt96">
        <div class="eyebrow">評的是什麼</div>
        <h2 class="section-title mt8">不考會不會用 AI，考的是判斷力。</h2>
        <p class="section-sub">AI 工具半年換一次，這五種能力不會過期。每張工單都用同一把尺，企業看得懂、青年也知道下一步要練什麼。</p>
        <div class="dims mt32">${APP.DIMS.map((d, i) => `<div class="dim"><div class="k">0${i + 1}</div><h4>${d.n}</h4><p>${d.d}</p></div>`).join('')}</div>
      </section>

      <section class="wrap mt96">
        <div class="eyebrow">一個平台，三種面孔</div>
        <h2 class="section-title mt8">對青年像遊戲，對企業像履歷，對市府像儀表板。</h2>
        <div class="dual mt32">
          <a class="px-card face youth" href="#/tasks"><div class="face-k">青年</div><h4>公會大廳</h4><p>接委託、升等、組戰隊。降低開始的門檻，讓不會主動參加 hackathon 的人也願意試一次。</p>
            <div class="preview">${px.avatar('me', 48)}<div><div class="px px-22">Lv.2 熟手接案者</div>${px.xpBar(.6, 14)}</div></div></a>
          <a class="card face" href="#/company"><div class="face-k">企業</div><h4>可驗證的工單履歷</h4><p>不用賭。先看他做過什麼、怎麼做決定、怎麼抓 AI 的錯，再決定要不要面試。</p>
            <div class="preview"><span class="grade grade-A">A</span><div><b>Y-0388・轉職（餐飲 → 營運）</b><div class="faint" style="font-size:12.5px">盲審模式：學校已隱藏</div></div></div></a>
          <a class="card face" href="#/gov"><div class="face-k">市府</div><h4>成果型儀表板</h4><p>追蹤的不是「辦了幾場、來了幾人」，而是面試率、錄取率、六個月留任率。</p>
            <div class="preview">${icon('chart')}<div><b>面試邀約率 15.5%</b><div class="faint" style="font-size:12.5px">完成者中（試辦示範數據）</div></div></div></a>
        </div>
      </section>

      <section class="wrap mt96">
        <div class="eyebrow">差在哪裡</div>
        <h2 class="section-title mt8">不是又一門課，也不是又一張證書。</h2>
        <div class="card mt24 table-scroll"><table class="compare">
          <thead><tr><th></th><th>AI 課程／證照</th><th>傳統實習</th><th>國外虛擬工作模擬<br><span class="faint" style="font-weight:400">如 Forage</span></th><th class="us">影子工單</th></tr></thead>
          <tbody>
          ${[
            ['企業看得到實際成果', 0, 1, 0, 1],
            ['評判斷力，不只看完成', 0, 2, 0, 1],
            ['錯誤注入與需求變更', 0, 2, 0, 1],
            ['答辯，防止代做', 0, 0, 0, 1],
            ['企業不用先付訓練成本', 1, 0, 1, 1],
            ['常態開放、可規模化', 1, 0, 1, 1],
            ['公部門背書、接上補助', 2, 2, 0, 1]
          ].map(r => `<tr><td><b>${r[0]}</b></td>${r.slice(1).map((v, i) => `<td class="${i === 3 ? 'us' : ''}">${v === 1 ? `<span class="yes">${icon('check')}</span>` : v === 2 ? '<span class="meh">部分</span>' : `<span class="no">${icon('x')}</span>`}</td>`).join('')}</tr>`).join('')}
          </tbody></table></div>
        <p class="faint mt12" style="font-size:12.5px">Forage 學生端免費、企業端付費，但「企業看不到學生提交的成果」（University of South Florida 職涯中心說明）。</p>
      </section>

      <section class="wrap mt96">
        <div class="grid g2" style="align-items:center">
          <div>
            <div class="eyebrow">順便解決另一個問題</div>
            <h2 class="section-title mt8">AI 課程那麼多，哪一門真的有用？</h2>
            <p class="section-sub">想學的人很難分辨課程好壞。影子工單是企業和青年共用的同一把尺，也能反過來檢驗課程：上過哪門課的人，工單真的做得比較好？</p>
            <a class="btn btn-primary mt24" href="#/learn">${icon('chart')}看學習資源成效榜</a>
          </div>
          <div class="card">${APP.LEARN.slice(0, 2).concat(APP.LEARN.slice(-2, -1)).map(l => `<div class="learn-row" style="grid-template-columns:1fr 160px"><div><b>${esc(l.n)}</b><div class="faint" style="font-size:12px">${l.price ? 'NT$' + l.price.toLocaleString() : '免費'}・${l.users.toLocaleString()} 人用過</div></div><div class="meter"><div class="tr"><div class="fi" style="width:${l.aRate * 2}%"></div></div><b>${l.aRate}%</b></div></div>`).join('')}
            <div class="learn-row faint" style="font-size:12px;grid-template-columns:1fr">使用者完成工單達 A 級以上的比例（示範數據，課程名稱為虛構）</div></div>
        </div>
      </section>

      <section class="wrap mt96">
        <div class="band">
          <div class="grid g2" style="align-items:center;gap:32px">
            <div><h2>AI 工具半年換一次，<br>判斷力可以用一輩子。</h2><p class="muted mt16">先接一張 2 小時的工單試試看。你的成果只存在這台裝置的瀏覽器，不會上傳。</p></div>
            <div class="row" style="justify-content:flex-end"><a class="px-btn lg" href="#/task/co-logistics-cs">${px.sprite('sword', { size: 20 })}接第一張工單</a><a class="btn btn-ghost btn-lg" href="#/about">看完整計畫</a></div>
          </div>
        </div>
      </section>`
    };
  };

  /* ======================================================== 公會大廳 */
  V.tasks = () => {
    const me = H.me();
    const done = APP.store.completed().filter(d => !d.a.practice);
    const pm = APP.portfolioMine();
    const verified = pm.entries;
    let filter = 'all', q = '';
    const l1 = verified.filter(e => e.t.level === 1);
    const l2open = l1.length >= 2 && l1.reduce((n, e) => n + e.total, 0) / l1.length >= 75;
    const quest = t => {
      const st = H.stateOf(t);
      if (t.status === 'locked' && l2open) t = Object.assign({}, t, { status: 'soon', unlocked: true });
      const cls = 'q-l' + t.level;
      const rar = t.level === 1 ? 'L1 見習委託' : t.level === 2 ? 'L2 企業挑戰' : 'L3 正式錄用';
      const stateTxt = st.k === 'done' ? `<span class="grade grade-${st.grade} sm">${st.grade}</span>` : st.k === 'working' ? '<span class="q-state" style="color:var(--teal)">進行中 ▶</span>' : t.status === 'open' ? '<span class="q-state">接單 ▶</span>' : t.status === 'soon' ? (t.unlocked ? '<span class="tag tag-ok">已解鎖・企業出題中</span>' : '<span class="tag tag-warn">即將開放</span>') : '';
      const inner = `<div class="q-stripe"></div><div class="q-body">
          <div class="q-top"><span class="rar">${rar}</span><span class="ticket-id">${t.code}</span></div>
          <h3>${esc(t.title)}</h3>
          <div class="q-org">${icon(t.orgType === 'gov' ? 'building' : 'briefcase')}${esc(t.org)}</div>
          <p>${esc(t.summary)}</p>
          <div class="q-skills">${t.skills.map(s => `<span class="tag">${esc(s)}</span>`).join('')}</div>
        </div>
        <div class="q-foot"><div class="q-reward"><span>${px.sprite('coin', { size: 14 })}<b>+${H.xpFor(t)}</b> XP</span><span>${icon('clock')}${t.hours} 小時</span>${t.done ? `<span>${icon('users')}${t.done.toLocaleString()}</span>` : ''}</div>${stateTxt}</div>
        ${t.status === 'locked' ? `<div class="q-lock"><div>${px.sprite('lock', { size: 30 })}<b>尚未解鎖</b><span>${esc(t.unlock)}</span></div></div>` : ''}`;
      return t.status === 'open' ? `<a class="px-card ${cls}" href="#/task/${t.id}" data-q="${esc(t.title + t.skills.join('') + t.org)}" data-type="${t.orgType}" data-st="${st.k}">${inner}</a>`
        : `<div class="px-card ${cls}" data-q="${esc(t.title + t.skills.join('') + t.org)}" data-type="${t.orgType}" data-st="${st.k}">${inner}</div>`;
    };
    const board = APP.BOARD.slice();
    const mine = done.slice().sort((x, y) => x.a.result.at - y.a.result.at);
    if (me.s.onboarded && mine.length >= 2) {
      const first = mine[0].a.result.total, last = mine[mine.length - 1].a.result.total;
      board.push({ alias: me.name, gain: last - first, title: `第 1 張 ${first} → 第 ${mine.length} 張 ${last}`, me: true });
    }
    board.sort((a, b) => b.gain - a.gain);
    const sq = me.s.squad;
    const l1done = l1.length;
    return {
      title: '公會大廳',
      html: `<div class="wrap page">
        <div class="lobby-banner px-edge">${px.skyline()}
          <div class="lobby-in">
            <div class="lobby-title"><div class="eyebrow">TAIPEI SHADOW-TASK GUILD</div><h1 class="px px-44">公會大廳</h1><p>接下委託，把能力變成企業看得懂的證明。每張委託都來自真實業務，資料已去機密化。</p></div>
            ${me.s.onboarded ? `<a class="player" href="#/portfolio">${px.avatar(me.name, 60)}<div style="flex:1"><div class="pn px">${esc(me.name)}</div><div class="pl">LV.${me.lv.lv} ${esc(me.lv.n)}・${me.xp} XP</div>${px.xpBar(me.lv.pct, 18)}<div class="ps"><span>已驗證 <b>${verified.length}</b></span><span>徽章 <b>${pm.badges.length}</b></span><span>戰隊 <b>${sq ? esc(sq.name) : '—'}</b></span></div></div></a>`
              : `<div class="player">${px.avatar('guest', 60)}<div style="flex:1"><div class="pn px">訪客</div><div class="pl">建立角色後開始累積經驗</div><button class="px-btn sm" data-onboard>建立角色</button></div></div>`}
          </div>
        </div>

        <div class="tiers mt32">
          <div class="px-card tier cur">${px.sprite('scroll', { size: 40 })}<div><div class="rk">TIER 01・開放中</div><div class="px px-22">見習委託</div><p>市府與企業的歷史工單，完成即核發工單履歷</p></div></div>
          <div class="px-card tier ${l2open ? '' : 'locked'}">${px.sprite('chest', { size: 40 })}<div><div class="rk">TIER 02・${l2open ? '已解鎖' : `完成 ${l1done}/2 張 L1・平均 A 解鎖`}</div><div class="px px-22">企業挑戰</div><p>企業自己出題篩人，表現好直接邀面試</p></div></div>
          <div class="px-card tier locked">${px.sprite('star', { size: 40 })}<div><div class="rk">TIER 03・企業邀請制</div><div class="px px-22">正式錄用</div><p>面試或實習，接上市府既有的實習補助</p></div></div>
        </div>

        <div class="lobby-grid mt48">
          <div>
            <div class="row-between">
              <div class="tabs" role="tablist">${[['all', '全部委託'], ['gov', '市府局處'], ['co', '合作企業'], ['done', '已完成']].map(([k, n]) => `<button data-f="${k}" class="${k === 'all' ? 'on' : ''}">${n}</button>`).join('')}</div>
              <label class="search">${icon('search')}<input class="input" placeholder="搜尋委託、技能、出題單位" aria-label="搜尋"></label>
            </div>
            <div class="quests mt24">${APP.TASKS.map(quest).join('')}</div>
            <div class="empty hide" data-empty><div class="big-ico">${icon('search')}</div><b>沒有符合的委託</b></div>
          </div>
          <aside class="stack" style="--gap:28px">
            <div class="px-card px-panel"><h4 class="px px-22">${px.sprite('star', { size: 22 })}本週進步榜</h4>
              <p class="faint" style="font-size:12px;margin-top:4px">比的是自己第一張到最近一張的進步，不是誰分數高。</p>
              <div class="mt8">${board.slice(0, 6).map((b, i) => `<div class="rank ${b.me ? 'me' : ''}"><span class="no">${i + 1}</span><span class="ini">${px.avatar(b.alias, 30)}</span><div><b>${esc(b.alias)}</b><small>${esc(b.title)}</small></div><span class="xp">${b.gain >= 0 ? '+' : ''}${b.gain} 分</span></div>`).join('')}</div>
            </div>
            <a class="px-card px-panel" href="#/squad" style="text-decoration:none"><h4 class="px px-22">${px.sprite('shield', { size: 22 })}${sq ? esc(sq.name) : '組一支戰隊'}</h4>
              <p class="muted mt8" style="font-size:13.5px">${sq ? `本週戰隊目標 ${Math.min(sq.goal, APP.squad.progress())}/${sq.goal} 張工單` : '找 2–4 位朋友一起接單。好友完成第一張工單，你們都拿到「職人 1 對 1 回饋」。'}</p>
              <span class="px-btn sm mt12" style="align-self:flex-start">${sq ? '查看戰隊' : '建立戰隊'} ▶</span></a>
            <div class="px-card px-panel"><h4 class="px px-22">${px.sprite('scroll', { size: 22 })}公會公告</h4>
              <div class="mt8">${APP.NEWS.map(n => `<div class="news"><b>${esc(n.t)}</b><span>${esc(n.m)}</span></div>`).join('')}</div>
            </div>
            <a class="px-card px-panel" href="#/learn" style="text-decoration:none"><h4 class="px px-22">${px.sprite('glass', { size: 22 })}學習成效榜</h4><p class="muted mt8" style="font-size:13.5px">哪些課程與資源，真的讓人把工單做得更好？</p></a>
          </aside>
        </div>
      </div>`,
      mount(root) {
        const cards = APP.ui.$$('.quests > *', root);
        const apply = () => {
          let n = 0;
          cards.forEach(c => {
            const okF = filter === 'all' || (filter === 'done' ? c.dataset.st === 'done' : c.dataset.type === filter);
            const okQ = !q || c.dataset.q.toLowerCase().includes(q);
            c.classList.toggle('hide', !(okF && okQ)); if (okF && okQ) n++;
          });
          APP.ui.$('[data-empty]', root).classList.toggle('hide', n > 0);
        };
        root.addEventListener('click', e => {
          const f = e.target.closest('[data-f]');
          if (f) { filter = f.dataset.f; APP.ui.$$('[data-f]', root).forEach(b => b.classList.toggle('on', b === f)); apply(); }
          if (e.target.closest('[data-onboard]')) APP.onboard(() => APP.render());
        });
        APP.ui.$('.search input', root).addEventListener('input', e => { q = e.target.value.trim().toLowerCase(); apply(); });
      }
    };
  };

  /* ======================================================== 工單詳情 */
  V.task = (id) => {
    const t = H.task(id);
    if (!t || t.status !== 'open') return V.notFound();
    const st = H.stateOf(t);
    const cta = st.k === 'done' ? `<a class="px-btn lg" style="width:calc(100% - 6px)" href="#/result/${t.id}">查看結果 ▶</a><button class="btn btn-text mt8" style="width:100%" data-redo>${icon('refresh')}重新挑戰（變體工單）</button>`
      : st.k === 'working' ? `<a class="px-btn lg" style="width:calc(100% - 6px)" href="#/work/${t.id}">繼續工作 ▶</a>`
      : `<label class="check" style="margin-bottom:12px;font-size:13px"><input type="checkbox" data-practice ${APP.store.completed().length ? '' : 'checked'}><div><b>練習模式</b><div class="faint" style="font-size:12px">不計入工單履歷、不公開，只拿回饋。第一次建議先練習。</div></div></label><button class="px-btn lg" style="width:calc(100% - 6px)" data-start>${px.sprite('sword', { size: 20 })}接下這張工單</button>`;
    return {
      title: t.title,
      html: `<div class="wrap page">
        <a class="btn btn-text" href="#/tasks">${icon('arrowLeft')}回公會大廳</a>
        <div class="detail-grid mt16">
          <div class="stack" style="--gap:20px">
            <div class="card card-pad">
              <div class="row"><span class="ticket-id">${t.code}</span>${H.orgTag(t)}<span class="lvl lvl-${t.level}">L${t.level}</span></div>
              <h1 class="mt12" style="font-size:clamp(22px,3vw,30px)">${esc(t.title)}</h1>
              <p class="muted mt8">${esc(t.org)}・${esc(t.industry)}・${esc(t.role)}</p>
              <div class="prose mt24">
                <h4>情境</h4><p>${esc(t.story)}</p>
                <h4>主管交辦</h4>
                <div class="mail"><div class="mail-h"><span><b>${esc(t.boss.name)}</b>（${esc(t.boss.title)}）</span><span>週一 09:12</span></div><div>${nl(t.brief)}</div></div>
                <h4>你要交出</h4><ul>${t.deliverables.map(d => `<li>${esc(d.label)}</li>`).join('')}</ul>
                <h4>附件資料</h4><ul>${t.materials.map(m => `<li>${icon(m.type === 'table' ? 'table' : 'doc', 'sr-only')}${esc(m.title)}${m.type === 'table' ? `（${m.rows.length} 筆）` : ''}</li>`).join('')}<li>AI 助手（模擬）</li></ul>
                <p class="faint" style="font-size:12.5px">${esc(t.source)}</p>
              </div>
            </div>
            <div class="card card-pad">
              <h3 style="font-size:16px">接單前你要知道</h3>
              <div class="mt8">
                ${[
                  ['spark', '可以使用 AI', '任何 AI 工具都可以用，但要揭露怎麼用、怎麼驗證。用得好會加分。'],
                  ['bolt', '過程中會有突發事件', '資料裡埋了錯誤，AI 也會出錯；做到一半，主管可能改需求。'],
                  ['mic', '最後要答辯', '職人答辯官會針對你的決定追問。答辯是確認「這是你本人的判斷」的關鍵；超時不扣分，成績公開與否由你決定。'],
                  ['shield', '不是免費勞動', '只使用已結案或模擬的工單，成果不作任何商業使用，著作權歸你。']
                ].map(r => `<div class="rule"><div class="ri">${P(r[0])}</div><div><b>${r[1]}</b><span>${r[2]}</span></div></div>`).join('')}
              </div>
            </div>
          </div>
          <aside class="sticky stack" style="--gap:20px">
            <div class="px-card" style="padding:20px">
              <dl class="kv">
                <dt>出題單位</dt><dd>${esc(t.org)}</dd>
                <dt>職能</dt><dd>${esc(t.role)}</dd>
                <dt>預估時間</dt><dd>${t.hours} 小時</dd>
                <dt>難度</dt><dd>L${t.level} 見習委託</dd>
                <dt>獎勵</dt><dd>+${H.xpFor(t)} XP・工單履歷</dd>
                <dt>已完成</dt><dd>${t.done.toLocaleString()} 人</dd>
              </dl>
              <div class="mt16">${cta}</div>
            </div>
            <div class="card card-pad">
              <h3 style="font-size:15px">評分五力</h3>
              <div class="mt12 stack" style="--gap:10px">${APP.DIMS.map(d => `<div style="font-size:13.5px"><b>${d.n}</b><div class="faint" style="font-size:12.5px">${d.d}</div></div>`).join('')}</div>
            </div>
          </aside>
        </div>
      </div>`,
      mount(root) {
        root.addEventListener('click', e => {
          if (e.target.closest('[data-start]')) { const pr = APP.ui.$('[data-practice]', root); startTask(t.id, pr && pr.checked); }
          if (e.target.closest('[data-redo]')) APP.ui.modal({
            title: '重新挑戰？', body: '<p>正式版會發給你一份「變體工單」：情境相同，但錯誤位置與需求變更不同。原型中會清除這張工單的作答紀錄（工單履歷保留最佳成績）。</p>',
            actions: [{ label: '取消' }, { label: '重新挑戰', cls: 'btn-primary', onClick: c => { APP.redo(t.id); c(); } }]
          });
        });
      }
    };
  };
  function P(name) { const map = { spark: 'gem', bolt: 'bolt', mic: 'bubble', shield: 'shield' }; return px.sprite(map[name] || 'star', { size: 18 }); }

  /* ======================================================== 學習成效榜 */
  V.learn = () => {
    const rows = APP.LEARN.slice().sort((a, b) => b.aRate - a.aRate);
    return {
      title: '學習資源成效榜',
      html: `<div class="wrap wrap-narrow page">
        <div class="eyebrow">學習資源成效榜（示範）</div>
        <h1 class="section-title mt8">貴的課，不一定有用。</h1>
        <p class="section-sub">青年完成工單時，可以選填「我準備時用了哪些學習資源」。平台彙整後公開：用過這項資源的人，工單達到 A 級以上的比例是多少。課程好不好，交給成果說話。</p>
        <div class="card mt32">
          <div class="learn-row head"><span>學習資源</span><span>費用</span><span>使用人數</span><span>工單 A 級以上比例</span></div>
          ${rows.map(l => `<div class="learn-row"><div><b>${esc(l.n)}</b><div class="faint" style="font-size:12px">${esc(l.type)}${l.small ? '・<span style="color:var(--red)">樣本不足，僅供參考</span>' : ''}</div></div>
            <span>${l.price ? 'NT$' + l.price.toLocaleString() : '<span class="tag tag-ok">免費</span>'}</span><span class="tnum">${l.users.toLocaleString()}</span>
            <div class="meter"><div class="tr"><div class="fi" style="width:${l.aRate * 2}%;${l.small ? 'opacity:.45' : ''}"></div></div><b>${l.aRate}%</b></div></div>`).join('')}
        </div>
        <p class="faint mt12" style="font-size:12.5px">示範數據，課程名稱皆為虛構。比例為相關性而非因果，正式版會以入門工單作為前測，比較「前後進步幅度」，並對樣本少於 100 人的資源標示「樣本不足」。</p>
        <div class="grid g2 mt48">
          <div class="card card-pad"><div class="big-ico" style="background:var(--accent-soft)">${px.sprite('scroll', { size: 24 })}</div><h3 class="mt12" style="font-size:17px">對青年：先看成效再付錢</h3><p class="muted mt8" style="font-size:14px">分辨不出課程好壞的人，最容易被高價速成班吸引。成效榜讓選課有依據。</p></div>
          <div class="card card-pad"><div class="big-ico" style="background:var(--blue-soft)">${px.sprite('shield', { size: 24 })}</div><h3 class="mt12" style="font-size:17px">對市府：補助依成效核銷</h3><p class="muted mt8" style="font-size:14px">市府的職涯進修補助，可以逐步改成「學員工單表現有提升才全額核銷」，讓公帑流向真正有效的課程。</p></div>
        </div>
      </div>`
    };
  };

  /* ======================================================== 計畫說明 */
  V.about = () => ({
    title: '計畫說明',
    html: `<div class="wrap wrap-narrow page">
      <div class="eyebrow">臺北影子工單計畫</div>
      <h1 class="section-title mt8">用「做過的工作」取代「待過的年資」。</h1>
      <p class="section-sub">這是 2026 臺北市政府青年局公共政策創意提案競賽的提案原型，用來展示政策的實際運作方式。</p>

      <div class="card card-pad mt32 prose">
        <h4 style="margin-top:0">三階段</h4>
        <div class="ladder mt12">
          <div class="cur"><span class="lvl lvl-1">L1</span><b>見習委託</b><p>市府「出題工作室」製作的去機密化歷史工單，開放申請，通過答辯即核發工單履歷。</p></div>
          <div><span class="lvl lvl-2">L2</span><b>企業挑戰</b><p>企業以已結案業務出題篩選人才，限 3 小時並由企業支付參與津貼；優異者直接邀面試。</p></div>
          <div><span class="lvl lvl-3">L3</span><b>銜接聘用</b><p>面試、實習或試用。企業導師只在這一階段投入，並接上市府既有實習補助。</p></div>
        </div>
        <h4>為什麼要由市府來做</h4>
        <ul>
          <li><b>公信力：</b>私人平台的證書跟「AI 證照」一樣難以被企業信任；市府核發、可查驗的工單履歷才有分量。</li>
          <li><b>規則制定：</b>去識別化標準、營業秘密保護、無薪勞動的界線，都需要公部門訂規則。</li>
          <li><b>冷啟動：</b>市府本身就是最大的出題方。局處的已結案業務，就是第一批影子工單。</li>
          <li><b>整合既有計畫：</b>作為青年局「以戰代訓」的評量模組，工單履歷併入既有的數位職能護照；L3 接上實習補助與就業服務站。</li>
        </ul>
        <h4>防弊與權益保障</h4>
        <ul>
          <li><b>不是免費勞動：</b>只用已結案（6 個月以上）或模擬的工單，成果不得商用，著作權歸青年。</li>
          <li><b>防代做：</b>第一張計分工單必答辯、之後抽審；每張工單 5 組變體隨機指派、每月替換一組；完整保留作答過程紀錄。</li>
          <li><b>不增加焦慮：</b>第一張可用練習模式；答辯超時不扣分；成績只有本人看得到，公開哪幾張由自己決定。</li>
          <li><b>個資與營業秘密：</b>企業上架前須通過去識別化檢核，由市府審查後才公開。</li>
          <li><b>公平：</b>預設「盲審模式」，企業看不到學校，只看工單表現。</li>
        </ul>
        <h4>常見問題</h4>
        <p><b>用 AI 不就是作弊？</b><br>不是。職場本來就會用 AI。我們評的是你能不能發現 AI 的錯、能不能為結果負責。完全不揭露 AI 使用才會扣分。</p>
        <p><b>企業為什麼要出題？</b><br>企業只要交出已結案文件、接受 1 小時訪談，市府出題工作室負責其餘工作。換到的是一群做過自家業務、能直接比較的候選人：L1 工單履歷取代電話初篩，L2 取代作業測驗，省下一輪面試。</p>
        <p><b>AI 不是一下就能抓到錯誤嗎？</b><br>每張工單上架前會先用主流 AI 實測，AI 自己能發現的錯誤不計分；計分的錯誤必須跨文件比對、或依主管給的情境判斷才看得出來。</p>
        <p><b>沒有自主學習習慣的人會參加嗎？</b><br>這正是遊戲化與戰隊機制的目的；另外會和臺北市立大學等學校合作，把工單變成課程作業。</p>
      </div>
      <div class="row mt24"><a class="px-btn" href="#/tasks">進入公會大廳 ▶</a><a class="btn btn-ghost" href="#/gov">${icon('chart')}看市府儀表板</a></div>
    </div>`
  });

  V.notFound = () => ({ title: '找不到頁面', html: `<div class="wrap page"><div class="empty"><div class="big-ico">${px.sprite('glass', { size: 30 })}</div><h2>找不到這個頁面</h2><a class="btn btn-primary mt24" href="#/">回首頁</a></div></div>` });
})();
