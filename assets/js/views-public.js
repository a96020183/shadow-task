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
  V.landing = () => ({
    title: '沒有年資，也有證明',
    html: `<div class="final-home wrap">
      <section class="home-intro">
        <div class="home-copy"><h1>沒有年資，<br>也有證明。</h1><p class="home-lead">市府出題、職人把關，做完拿到市府可以查驗的工單履歷。</p></div>
        <div class="home-preview"><div class="home-sky" aria-hidden="true">${px.skyline()}</div><div class="home-ticket"><h2>青年市集：AI 算了 7 人，對嗎？</h2><p>接下主管的工單，親手核對一次。</p></div></div>
        <div class="home-action"><a class="btn btn-accent" href="#/try">開始 60 秒體驗 ${icon('arrowRight')}</a><p>不用註冊，不用輸入資料。</p></div>
      </section>
      <section class="home-evidence"><div><h2>把「我會」變成做過的證據。</h2><p>留下怎麼抓錯、怎麼調整、為什麼這樣做。<br>完整工單經職人複核，再交給企業看。</p></div><a class="btn btn-ghost" href="#/verify/TPE-PW-2026-BA58C8">看一張查驗範例 ${icon('arrowRight')}</a></section>
      <nav class="home-roles" aria-label="依身分進入"><a href="#/tasks"><b>青年</b><span>接工單、組戰隊</span>${icon('arrowRight')}</a><a href="#/company"><b>企業</b><span>看成果、找人才</span>${icon('arrowRight')}</a><a href="#/gov"><b>市府</b><span>追蹤就業成果</span>${icon('arrowRight')}</a><a href="#/mentor"><b>答辯官</b><span>追問決策、複核成果</span>${icon('arrowRight')}</a></nav>
      <div class="home-team"><span>職影未來提案團隊</span><a href="#/about">計畫說明與資料出處 ${icon('arrowRight')}</a></div>
    </div>`
  });

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
        <div class="q-foot"><div class="q-reward"><span>${px.sprite('coin', { size: 14 })}<b>+${H.xpFor(t)}</b> XP</span><span>${icon('clock')}${t.hours} 小時</span>${t.done ? `<span>${icon('users')}${t.done.toLocaleString()}（示範）</span>` : ''}</div>${stateTxt}</div>
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
            <div class="lobby-title"><div class="eyebrow">TAIPEI SHADOW-TASK GUILD</div><h1 class="px px-44">公會大廳</h1><p>挑一張模擬工單，留下你做事的證據。</p></div>
            ${me.s.onboarded ? `<a class="player" href="#/portfolio">${px.avatar(me.name, 60)}<div style="flex:1"><div class="pn px">${esc(me.name)}</div><div class="pl">LV.${me.lv.lv} ${esc(me.lv.n)}・${me.xp} XP</div>${px.xpBar(me.lv.pct, 18)}<div class="ps"><span>已驗證 <b>${verified.length}</b></span><span>徽章 <b>${pm.badges.length}</b></span><span>戰隊 <b>${sq ? esc(sq.name) : '—'}</b></span></div></div></a>`
              : `<div class="player">${px.avatar('guest', 60)}<div style="flex:1"><div class="pn px">訪客</div><div class="pl">建立角色後開始累積經驗</div><button class="px-btn sm" data-onboard>建立角色</button></div></div>`}
          </div>
        </div>

        <details class="lobby-tiers mt24"><summary>三個階段與解鎖進度</summary><div class="tiers mt16">
          <div class="px-card tier cur">${px.sprite('scroll', { size: 40 })}<div><div class="rk">TIER 01・開放中</div><div class="px px-22">見習委託</div><p>市府與企業的歷史工單，完成即核發工單履歷</p></div></div>
          <div class="px-card tier ${l2open ? '' : 'locked'}">${px.sprite('chest', { size: 40 })}<div><div class="rk">TIER 02・${l2open ? '已解鎖' : `完成 ${l1done}/2 張 L1・平均 A 解鎖`}</div><div class="px px-22">企業挑戰</div><p>企業自己出題篩人，表現好直接邀面試</p></div></div>
          <div class="px-card tier locked">${px.sprite('star', { size: 40 })}<div><div class="rk">TIER 03・企業邀請制</div><div class="px px-22">正式錄用</div><p>面試或實習，接上市府既有的實習補助</p></div></div>
        </div>

        </details><div class="lobby-grid mt24">
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
                <dt>已完成</dt><dd>${t.done.toLocaleString()} 人（示範）</dd>
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

      <details class="proposal-evidence mt24"><summary>為什麼需要影子工單？查看提案數據</summary><div class="prose">
        <ul><li>51.8% 新鮮人最擔心缺乏相關工作經驗。出處：1111 人力銀行，2026。</li>
        <li>34.4% 企業認為新人面試說的和實際表現有落差。出處：yes123，2025。</li>
        <li>「年資」預測工作表現的效度為 .07。出處：Sackett et al., 2022。</li>
        <li>22–25 歲在高 AI 暴露職業的就業，相對同儕為 −13% → −19%。出處：Stanford Digital Economy Lab，2025 初版 → 2026 修訂。</li>
        <li>大學程度失業率 4.56%，全體為 3.41%。出處：主計總處，2026 年 8 月。</li>
        <li>臺北市 25–29 歲失業率 7.8%，全國為 5.77%；2024 年起回升。出處：主計總處，2025 年。</li></ul>
        <p>以上保留原提案引用的數值與出處，與平台中的虛構示範資料分開呈現。</p>
      </div></details>
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
