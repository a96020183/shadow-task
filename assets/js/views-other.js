/* 工單履歷、企業專區、市府儀表板、戰隊 */
(function () {
  const { esc, nl, icon, len, $, $$, toast, modal, fmtDate, fmtDur, level } = APP.ui;
  const px = APP.px;
  const V = APP.views;
  const H = APP.h;
  const DAY = 86400000;

  function behaviorsOf(r, a, t) {
    const b = [`抓出埋設錯誤 ${r.found.length}/${t.errors.length}${r.found.some(k => k.startsWith('ai:')) ? '（含 AI 的錯）' : ''}`];
    if (r.qn >= 2) b.push(`開工前提出 ${r.qn} 個確認問題`);
    if (r.changeHits >= 2) b.push('需求變更後完整調整成果');
    if (a.disclosure && a.disclosure.used && a.disclosure.used !== 'none') b.push('揭露 AI 使用與驗證方式');
    return b;
  }
  const candBeh = g => g === 'S' ? ['抓出埋設錯誤 3/3（含 AI 的錯）', '需求變更後完整調整成果', '開工前提出 3 個確認問題'] : g === 'A' ? ['抓出埋設錯誤 2/3', '需求變更後完整調整成果'] : ['抓出埋設錯誤 1/3', '開工前提出確認問題'];
  const avgDims = list => list.length ? [0, 1, 2, 3, 4].map(i => Math.round(list.reduce((s, d) => s + d[i], 0) / list.length)) : [0, 0, 0, 0, 0];
  const platformAvg = () => avgDims(APP.CANDIDATES.map(c => c.dims)).map(v => Math.round(v * .92));

  function mine() {
    const s = APP.store.get();
    const byId = {};
    APP.store.completed().filter(d => d.a.result.grade !== 'C' && !d.a.practice).forEach(d => { byId[d.id] = d; });
    Object.entries(s.best || {}).forEach(([id, a]) => { if (!byId[id] || byId[id].a.result.total < a.result.total) byId[id] = { id, a }; });
    const done = Object.values(byId).sort((x, y) => y.a.result.at - x.a.result.at);
    return {
      id: 'me', own: true, name: s.user.name || '我', who: s.user.who || '', school: s.user.school || '', verified: !!s.user.schoolVerified,
      blind: s.user.blind !== false, visible: s.user.visible !== false, xp: s.xp,
      dims: avgDims(done.map(d => d.a.result.dims)),
      badges: [...new Set(done.flatMap(d => d.a.result.badges))],
      lead: (s.referrals || []).filter(r => r.status === 'passed').length, tips: (s.tips || []).length,
      entries: done.map(({ id, a }) => {
        const t = H.task(id); const r = a.result;
        return { id, t, grade: r.grade, total: r.total, at: r.at, dur: r.duration, vid: r.vid, dims: r.dims, excerpt: a.answers[t.deliverables[0].id] || '', def: a.defense ? a.defense.answers[0] : '', q: a.defense ? a.defense.qs[0] : '', found: r.found.length, errs: t.errors.length, hidden: !!(s.pubHidden || {})[id], beh: behaviorsOf(r, a, t) };
      })
    };
  }
  function cand(c) {
    return {
      id: c.id, own: false, name: c.alias, who: c.who, school: c.school, verified: true, blind: true, visible: true, xp: c.xp, dims: c.dims, badges: c.badges,
      lead: c.xp > 400 ? 2 : c.xp > 250 ? 1 : 0, tips: c.badges.length > 2 ? 2 : 1,
      entries: c.tasks.map((tid, i) => {
        const t = H.task(tid); const g = c.grades[i] || 'A'; const total = { S: 93, A: 82, B: 68, C: 55 }[g] - i * 2;
        return { id: tid, t, grade: g, beh: candBeh(g), total, at: Date.now() - (i * 9 + 4) * DAY, verification: c.verification, dur: t.hours * 3600000 * (c.id === 'y0507' ? 0.9 + i * .15 : 0.8 + i * .15), vid: 'TPE-PW-2026-' + APP.ui.hash(c.id + tid).slice(0, 6), dims: c.dims.map(v => Math.max(40, Math.min(100, v + (i - 1) * 3))), excerpt: '（示範人才：成果全文需經本人同意後由企業調閱）', def: c.id === 'y0412' || c.id === 'y0507' ? (APP.DEMO_EVIDENCE[tid]?.answer || '') : '「' + c.quote + '。」', q: APP.DEMO_EVIDENCE[tid]?.question || '', found: g === 'S' ? 3 : g === 'A' ? 2 : 1, errs: 3 };
      }).filter(e => e.grade !== 'C')
    };
  }

  function portfolioHTML(p) {
    const avgTotal = p.entries.length ? Math.round(p.entries.reduce((s, e) => s + e.total, 0) / p.entries.length) : 0;
    const hours = p.entries.reduce((s, e) => s + e.dur, 0);
    const lv = level(p.xp);
    const schoolLine = p.own
      ? (p.school ? `${p.blind ? icon('eyeOff', 'sr-only') : ''}${esc(p.school)}${p.verified ? ' <span class="tag tag-ok">' + icon('check') + '學校信箱已驗證</span>' : ''}${p.blind ? ' <span class="tag">對企業隱藏</span>' : ''}` : '')
      : `<span class="tag">${icon('eyeOff')}盲審模式：學校已隱藏</span>`;
    return `
      <div class="card mt24"><div class="card-head"><h3>工單與驗證層級</h3><span class="faint" style="font-size:12.5px">點開查看成果與答辯節錄</span></div>
        ${p.entries.map(e => `<details class="wo-d"><summary class="wo"><span class="grade grade-${e.grade}">${e.grade}</span><div><h4>${esc(e.t.title)}</h4>${e.verification ? `<span class="verification-level">${esc(e.verification)}</span>` : ""}${e.def ? `<p class="portfolio-quote">${esc(e.def.slice(0, 90))}${e.def.length > 90 ? "…" : ""}</p>` : ""}<div class="sub"><span>${esc(e.t.org)}</span><span>${fmtDate(e.at)}</span><span>用時 ${fmtDur(e.dur)}</span><span>抓到埋設錯誤 ${e.found}/${e.errs}</span></div></div><div style="text-align:right"><b class="tnum" style="font-size:20px">${e.total}</b><div class="faint" style="font-size:11.5px">評量分數（示範）</div><div class="vid">${e.vid}</div>${p.own ? `<label class="tag" style="margin-top:4px;cursor:pointer" data-stop><input class="styled-switch" role="switch" type="checkbox" data-pub="${e.id}" ${e.hidden ? '' : 'checked'} style="margin:0 4px 0 0">對企業公開</label>` : ''}</div></summary>
          <div class="wo-more"><div class="row" style="gap:6px;margin-bottom:12px">${(e.beh || []).map(x => `<span class="tag tag-ok">${icon('check')}${esc(x)}</span>`).join('')}</div><div class="mini-dims">${APP.DIMS.map((d, i) => `<div><b>${e.dims[i]}</b><span>${d.n}</span></div>`).join('')}</div>
            <div class="grid g2 mt16"><div><b style="font-size:13px">成果摘要</b><p class="muted mt8" style="font-size:13.5px">${nl(e.excerpt.slice(0, 220))}${e.excerpt.length > 220 ? '…' : ''}</p></div>
            ${e.def ? `<div><b style="font-size:13px">${e.verification === "AI 初評" ? "作答節錄（尚未答辯）" : "答辯節錄"}</b><p class="faint mt8" style="font-size:12.5px">Q：${esc(e.q)}</p><p class="muted mt8" style="font-size:13.5px">A：${esc(e.def)}</p></div>` : '<div></div>'}</div></div></details>`).join('')}
      </div>
      <div class="card card-pad mt24">
        <div class="pf-head">
          <div style="background:var(--night);padding:10px;width:96px;height:96px;display:grid;place-items:center">${p.own ? px.avatar(p.name, 72) : px.blindAvatar()}</div>
          <div>
            <div class="row" style="gap:10px"><span class="pf-name">${esc(p.name)}</span>${p.who ? `<span class="tag">${esc(p.who)}</span>` : ''}</div>
            <div class="muted mt8" style="font-size:13.5px">${schoolLine}</div>
            <div class="pf-stats">
              <div><b>${p.entries.length}</b><span>完成工單</span></div>
              <div><b>${p.entries.length ? H.gradeOf(avgTotal) : '—'}</b><span>平均等級</span></div>
              <div><b>${(hours / 3600000).toFixed(1)}</b><span>累計實作時數</span></div>
              <div><b>${p.lead + p.tips}</b><span>帶人紀錄（推薦＋心得）</span></div>
            </div>
          </div>
          ${p.own ? `<div class="stack no-print" style="--gap:8px">
            <a class="btn btn-primary btn-sm" href="#/onepage">${icon('doc')}一頁式工單履歷（可附在求職網站的履歷）</a>
            <button class="btn btn-ghost btn-sm" data-copy>${icon('link')}複製驗證碼</button>
            <label class="check" style="font-size:13px;padding:8px 10px"><input class="styled-switch" role="switch" type="checkbox" data-vis ${p.visible ? 'checked' : ''}>企業可搜尋到我</label>
            <label class="check" style="font-size:13px;padding:8px 10px"><input class="styled-switch" role="switch" type="checkbox" data-blind ${p.blind ? 'checked' : ''}>盲審：對企業隱藏學校</label>
          </div>` : `<div class="stack no-print" style="--gap:8px"><button class="btn btn-primary" data-invite="${p.id}">${icon('send')}邀請面試</button><a class="btn btn-ghost btn-sm" href="#/company">${icon('arrowLeft')}回人才搜尋</a></div>`}
        </div>
      </div>
<details class="portfolio-growth mt24"><summary>查看五力、徽章與成長紀錄</summary><p class="try-note">${p.own ? `LV.${lv.lv} ${esc(lv.n)}` : "示範五力評量"}</p>      <div class="grid g2 mt24" style="align-items:start">
        <div class="card card-pad"><div class="row-between"><h3 style="font-size:17px">五力平均</h3><span class="faint" style="font-size:12.5px">${p.entries.length} 張工單</span></div><div class="mt12" style="max-width:380px;margin:12px auto 0">${APP.ui.radar(p.dims, { compare: platformAvg() })}</div></div>
        <div class="card card-pad"><h3 style="font-size:17px">徽章</h3><p class="faint mt8" style="font-size:12.5px">每枚徽章都對應工單中被驗證過的具體行為。</p>
          <div class="pbadge-row mt16">${Object.entries(APP.BADGES).map(([k, b]) => `<div class="px-card pbadge ${p.badges.includes(k) ? '' : 'off'}">${px.sprite(APP.px.BADGE_SPRITE[k], { size: 34 })}<b>${b.n}</b><span>${b.d}</span></div>`).join('')}</div></div>
      </div>
</details>
      <div class="verify-box mt24"><div class="qr">${APP.ui.fingerprint(p.name + p.entries.map(e => e.vid).join(''))}</div><div><b>如何驗證這份工單履歷</b><p class="muted" style="font-size:13px">每張工單都有驗證碼，企業可在平台查核成果全文、作答過程紀錄與答辯內容（需本人同意）。本提案規劃由市府平台核發，作為學經歷以外的能力證據。</p></div></div>`;
  }

  APP.portfolioMine = () => mine();
  APP.portfolioCand = c => cand(c);

  /* ======================================================== 我的工單履歷 */
  V.portfolio = () => {
    const s = APP.store.get();
    const p = mine();
    if (!p.entries.length) return {
      title: '我的工單履歷',
      html: `<div class="wrap wrap-narrow page"><div class="card empty">${px.sprite('scroll', { size: 64 })}<h2 class="mt16" style="font-size:22px">你的工單履歷還是空的</h2><p class="muted mt8">完成第一張工單並通過答辯，就會出現在這裡。</p>
        <div class="row mt24" style="justify-content:center"><a class="px-btn" href="#/tasks">去公會大廳接單 ▶</a><a class="btn btn-ghost" href="#/p/y0507">看範例履歷</a></div></div></div>`
    };
    return {
      title: '我的工單履歷',
      html: `<div class="wrap page"><div class="row-between no-print"><div><div class="eyebrow">工單履歷</div><h1 class="section-title mt8">${s.demo ? '示範帳號・' : ''}${esc(p.name)} 的工單履歷</h1></div></div><div class="mt24">${portfolioHTML(p)}</div></div>`,
      mount(root) {
        APP.ui.mountTips(root);
        root.addEventListener('click', e => {
          const stop = e.target.closest('[data-stop]');
          if (stop) { if (e.target.tagName === 'INPUT') return; e.preventDefault(); const c = stop.querySelector('input'); c.checked = !c.checked; c.dispatchEvent(new Event('change', { bubbles: true })); return; }
          if (e.target.closest('[data-print]')) window.print();
          if (e.target.closest('[data-copy]')) {
            const vis = p.entries.filter(x => !x.hidden);
            if (!vis.length) { toast('目前沒有對企業公開的工單', 'warn'); return; }
            const txt = vis.map(x => x.vid).join(', ');
            const done = () => toast('已複製驗證碼：' + txt, 'ok');
            try { navigator.clipboard.writeText(txt).then(done, () => toast(txt, 'info', 5000)); } catch (err) { toast(txt, 'info', 5000); }
          }
        });
        root.addEventListener('change', e => {
          if (e.target.dataset.vis !== undefined) { s.user.visible = e.target.checked; APP.store.save(); toast(e.target.checked ? '企業可以搜尋到你' : '已對企業隱藏', 'info'); }
          if (e.target.dataset.blind !== undefined) { s.user.blind = e.target.checked; APP.store.save(); APP.render(); }
          if (e.target.dataset.pub) { s.pubHidden = s.pubHidden || {}; s.pubHidden[e.target.dataset.pub] = !e.target.checked; APP.store.save(); toast(e.target.checked ? '這張工單會出現在企業端' : '這張工單已對企業隱藏', 'info'); }
        });
      }
    };
  };

  /* ======================================================== 公開履歷 */
  V.publicPortfolio = (id) => {
    const c = APP.CANDIDATES.find(x => x.id === id);
    if (!c) return V.notFound();
    return {
      title: c.alias + ' 的工單履歷',
      html: `<div class="wrap page"><div class="callout info no-print">${icon('info')}<div>這是企業端看到的工單履歷（示範人才）。盲審模式下只顯示代號，企業送出面試邀請、對方同意後才會揭露姓名與聯絡方式。</div></div><div class="mt24">${portfolioHTML(cand(c))}</div></div>`,
      mount(root) {
        APP.ui.mountTips(root);
        root.addEventListener('click', e => { const b = e.target.closest('[data-invite]'); if (b) inviteModal(b.dataset.invite); });
      }
    };
  };

  function inviteModal(cid, onSent) {
    const c = APP.CANDIDATES.find(x => x.id === cid) || { alias: '你（預覽）' };
    modal({
      title: `邀請 ${c.alias}`,
      body: `<div class="stack" style="--gap:10px">
        <label class="check"><input type="radio" name="itype" value="interview" checked><div><b>面試邀約</b><div class="faint" style="font-size:12.5px">對方同意後揭露聯絡方式</div></div></label>
        <label class="check"><input type="radio" name="itype" value="l2"><div><b>邀請參加 L2 企業挑戰</b><div class="faint" style="font-size:12.5px">用貴公司自己的歷史題目再確認一次</div></div></label>
        <label class="check"><input type="radio" name="itype" value="intern"><div><b>實習（L3 銜接）</b><div class="faint" style="font-size:12.5px">符合資格者可申請青年局「青年創新職場實習補助」：實習指導費每人每月 1 萬元、最長 6 個月（依現行要點，以公告為準）</div></div></label>
        <label class="field"><span>給對方的話</span><textarea class="textarea" style="min-height:80px" data-imsg>看了你的工單履歷，想邀請你來聊聊。</textarea></label></div>`,
      actions: [{ label: '取消' }, {
        label: '送出邀請', cls: 'btn-primary', onClick: (close, bg) => {
          const s = APP.store.get();
          s.invites = s.invites || [];
          s.invites.unshift({ cand: cid, type: bg.querySelector('[name=itype]:checked').value, msg: bg.querySelector('[data-imsg]').value, at: Date.now() });
          APP.store.save(); close(); toast(`已送出邀請給 ${c.alias}`, 'ok');
          if (onSent) onSent();
        }
      }]
    });
  }

  /* ======================================================== 企業專區 */
  V.company = (tab0) => {
    const s = APP.store.get();
    let tab = tab0 || 'talent', minG = 'all', sortBy = -1, functionFilter = '全部';
    const shortlist = new Set(s.shortlist || []);
    const pool = () => {
      let list = APP.CANDIDATES.slice();
      if (functionFilter !== '全部') list = list.filter(c => c.function === functionFilter);
      if (minG !== 'all') list = list.filter(c => c.grades.some(g => minG === 'S' ? g === 'S' : g === 'S' || g === 'A'));
      if (sortBy >= 0) list.sort((a, b) => b.dims[sortBy] - a.dims[sortBy]);
      return list;
    };
    const ITYPE = { interview: '面試邀約', l2: 'L2 企業挑戰', intern: '實習（L3）' };
    const talent = () => `
      <div class="function-filters" role="group" aria-label="職能篩選">${['全部', '數據', '客服', '企劃'].map(n => `<button class="chip ${functionFilter === n ? 'on' : ''}" data-function="${n}" aria-pressed="${functionFilter === n}">${n}</button>`).join('')}</div>
      <details class="talent-more"><summary>等級與五力排序</summary><div class="talent-filters">
        <label class="field"><span>工單等級</span><select class="select" data-grade-filter>${[['all','全部等級'],['A','A 級以上'],['S','有 S 級']].map(([k,n]) => `<option value="${k}" ${minG === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label class="field"><span>排序依據</span><select class="select" data-sort-filter><option value="-1">預設順序</option>${APP.DIMS.map((d,i) => `<option value="${i}" ${sortBy === i ? 'selected' : ''}>${d.n}</option>`).join('')}</select></label>
      </div></details>
      <p class="grade-legend">試作示範：S ≥90・A 75–89・B 60–74・C &lt;60</p>
      <div class="talent-list">${pool().map(c => `<article class="candidate-row">
        <div class="candidate-main"><a href="#/p/${c.id}" class="candidate-title">${px.blindAvatar()}<b>${esc(c.alias)}・${esc(c.focus)}</b><span class="grade sm">${c.grades[0]}</span><span class="verification-level">${esc(c.verification)}</span></a><p class="candidate-quote">${{S:93,A:82,B:68,C:55}[c.grades[0]]} 分・抓錯 ${{S:3,A:2,B:1,C:1}[c.grades[0]]}/3｜「${esc(c.quote)}」</p></div>
        <div class="candidate-actions"><button class="btn btn-ghost btn-sm" data-shortlist="${c.id}" aria-pressed="${shortlist.has(c.id)}">${shortlist.has(c.id) ? '已加入' : '加入候選'}</button><button class="btn btn-primary btn-sm" data-invite="${c.id}">邀請</button></div>
      </article>`).join('') || '<p class="empty">此條件沒有示範人才，請調整篩選。</p>'}</div>`;
    const post = () => `
      <div class="grid g2 mt24" style="align-items:start">
        <form class="card card-pad stack" style="--gap:14px" data-post>
          <h3 style="font-size:17px">上架一張影子工單</h3>
          <label class="field"><span>工單名稱</span><input class="input" name="title" required placeholder="例：電商退貨原因分析與改善"></label>
          <div class="grid g2" style="gap:12px"><label class="field"><span>職能</span><select class="select" name="role"><option>行銷企劃</option><option>營運分析</option><option>產品企劃</option><option>資料分析</option><option>客服營運</option><option>人資行政</option></select></label>
          <label class="field"><span>預估時數</span><select class="select" name="hours"><option>2</option><option selected>3</option><option>4</option><option>6</option></select></label></div>
          <label class="field"><span>情境與交付物</span><textarea class="textarea" name="desc" placeholder="這是一個什麼情境？新人要交出什麼？"></textarea></label>
          <div class="field"><span>去機密化檢核（全部勾選才能送審）</span>
            <div class="stack" style="--gap:8px">${['已移除所有個人資料（姓名、電話、地址、身分證字號等）', '不含營業秘密與未公開財務資訊，數據已比例調整', '為已結案 6 個月以上的歷史業務，或為模擬情境', '承諾成果不作任何商業使用，著作權歸參與者', '同意平台注入錯誤資料與需求變更，並產生變體題'].map((x, i) => `<label class="check"><input type="checkbox" name="c${i}" required>${x}</label>`).join('')}</div></div>
          <button class="btn btn-primary" type="submit">${icon('shield')}送出審查</button>
          <p class="faint" style="font-size:12px">送出後由青年局與資訊局進行去識別化審查，通過後才會上架。</p>
        </form>
        <div class="stack" style="--gap:20px">
          <div class="card card-pad"><h3 style="font-size:17px">為什麼企業願意出題</h3>
            <div class="mt12">${[['一次出題，長期篩人', '同一張工單可以篩上百位候選人，比一場場面試省力。'], ['比只看年資準', '工作樣本 .33、結構化面試 .42、年資只有 .07（Sackett et al., 2022）。工單分數本身的效度會在試辦中驗證。'], ['先看工作樣本', '用已結案或模擬工單看能力，成果不得商用。'], ['雇主品牌', '出題企業在公會大廳曝光，觸及正在找方向的青年。']].map(r => `<div class="rule"><div class="ri">${icon('check')}</div><div><b>${r[0]}</b><span>${r[1]}</span></div></div>`).join('')}</div></div>
          <div class="card card-pad"><h3 style="font-size:17px">已送出的工單</h3>
            <div class="mt12">${(s.postedTasks || []).length ? s.postedTasks.map(p => `<div class="rule"><div class="ri">${icon('doc')}</div><div style="flex:1"><b>${esc(p.title)}</b><span>${esc(p.role)}・${p.hours} 小時・${fmtDate(p.at)}</span></div><span class="tag tag-warn" style="align-self:center">${esc(p.status)}</span></div>`).join('') : '<p class="faint" style="font-size:13px">還沒有送出的工單</p>'}</div></div>
        </div>
      </div>`;
    const invites = () => `<div class="card mt24">${(s.invites || []).length ? s.invites.map(iv => { const c = APP.CANDIDATES.find(x => x.id === iv.cand) || { alias: iv.cand }; return `<div class="wo"><span style="background:var(--night);width:44px;height:44px;display:grid;place-items:center">${px.blindAvatar()}</span><div><h4>${esc(c.alias)}</h4><div class="sub"><span>${ITYPE[iv.type] || iv.type}</span><span>${fmtDate(iv.at)}</span><span>${esc(iv.msg)}</span></div></div><span class="tag tag-warn">等待回覆</span></div>`; }).join('') : `<div class="empty"><p class="muted">還沒有送出任何邀請</p></div>`}</div>`;
    const body = () => tab === 'talent' ? talent() : tab === 'post' ? post() : invites();
    return {
      title: '企業專區',
      html: `<div class="wrap page">

        <h1 class="section-title">依工作成果找人才</h1><p class="company-intro">虛構示範人才・盲審隱藏姓名與學校。能力判定以答辯驗證為準；面試前須答辯。</p>
        <div class="company-tabs"><div class="tabs" role="tablist">${[['talent', '人才搜尋'], ['post', '上架工單'], ['inv', `我的邀約（${(s.invites || []).length}）`]].map(([k, n]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${n}</button>`).join('')}</div></div>
        <div data-body>${body()}</div>
        <details class="proposal-evidence mt24"><summary>企業招募現況與資料出處</summary>        <div class="grid g3 mt24">
          <div class="card kpi"><div class="label">補一個職缺平均花費</div><div class="value">60.3 天</div><div class="delta muted" style="font-weight:400">104 人資調查，2025</div></div>
          <div class="card kpi"><div class="label">新人 6 個月留任率</div><div class="value">65.4%</div><div class="delta muted" style="font-weight:400">104 人資調查，2025</div></div>
          <div class="card kpi"><div class="label">企業：面試說的和實際做的有落差</div><div class="value">34.4%</div><div class="delta muted" style="font-weight:400">yes123，2025</div></div>
        </div>
</details>
      </div>`,
      mount(root) {
        const re = () => { $('[data-body]', root).innerHTML = body(); $$('[data-tab]', root).forEach(b => b.classList.toggle('on', b.dataset.tab === tab)); };
        root.addEventListener('click', e => {
          const el = e.target.closest('[data-tab],[data-g],[data-sort],[data-invite],[data-function],[data-shortlist]'); if (!el) return;
          if (el.dataset.function) { functionFilter = el.dataset.function; re(); $(`[data-function="${functionFilter}"]`, root).focus(); }
          if (el.dataset.shortlist) {
            const id = el.dataset.shortlist;
            shortlist.has(id) ? shortlist.delete(id) : shortlist.add(id);
            s.shortlist = [...shortlist]; APP.store.save();
            el.textContent = shortlist.has(id) ? '已加入' : '加入候選';
            el.setAttribute('aria-pressed', String(shortlist.has(id)));
          }
          if (el.dataset.tab) { tab = el.dataset.tab; re(); }
          if (el.dataset.g) { minG = el.dataset.g; re(); }
          if (el.dataset.sort) { sortBy = sortBy === +el.dataset.sort ? -1 : +el.dataset.sort; re(); }
          if (el.dataset.invite) inviteModal(el.dataset.invite, () => { const b = $('[data-tab="inv"]', root); if (b) b.textContent = `我的邀約（${(s.invites || []).length}）`; if (tab === 'inv') re(); });
        });
        root.addEventListener('change', e => {
          if (e.target.matches('[data-grade-filter]')) { minG = e.target.value; re(); $('[data-grade-filter]', root).focus(); }
          if (e.target.matches('[data-sort-filter]')) { sortBy = +e.target.value; re(); $('[data-sort-filter]', root).focus(); }
        });
        root.addEventListener('submit', e => {
          e.preventDefault();
          const f = e.target, title = f.title.value.trim();
          if (!title) { toast('請填寫工單名稱', 'warn'); return; }
          s.postedTasks = s.postedTasks || [];
          s.postedTasks.unshift({ title, role: f.role.value, hours: +f.hours.value, at: Date.now(), status: '去識別化審查中' });
          APP.store.save(); toast('已送出審查', 'ok'); re();
        });
      }
    };
  };

  /* ======================================================== 市府儀表板 */
  V.gov = () => {
    const G = APP.GOV, s = APP.store.get();
    return {
      title: '市府儀表板',
      html: `<div class="wrap page gov-page">
        <h1 class="section-title">市府儀表板</h1>
        <p class="gov-notice">以下數字皆為模擬，用來展示指標設計</p>
        <div class="grid g2 gov-evidence">${G.evidence.map(k => `<section class="card evidence-card"><h2>${esc(k.label)}</h2><div class="evidence-result"><strong>${esc(k.value)}</strong><span>${esc(k.target)}</span></div><p class="evidence-interval">${esc(k.interval)}</p><p class="try-note">${esc(k.note)}</p></section>`).join('')}</div>
        <p class="try-note gov-schedule">企畫書期程：第一梯 116 年 7 月開放、4 個月追蹤；第二梯 116 年 11 月開放。試辦以 HR 情境實驗為主要因果證據；分梯比較先報效果量與信賴區間，顯著性留待階段 3。</p>
        <section class="mt32"><h2 class="gov-heading">福祉與評量品質</h2><div class="grid g3">${G.outcomes.map(k => `<div class="kpi"><h3 class="label">${esc(k.label)}</h3><div class="value">${esc(k.value)}</div><p class="kpi-target">${esc(k.target)}</p>${k.note ? `<p class="try-note">${esc(k.note)}</p>` : ''}</div>`).join('')}</div></section>
        <section class="card card-pad mt24 gov-fairness"><h2 class="gov-heading">公平性指標</h2>${APP.ui.hbars(G.fairness, { unit: '%', max: 100 })}<p class="try-note">上述背景合計去除重複計數；長條以 0–100% 呈現。</p><p class="mt16">各背景族群通過率差距：<b>12 個百分點</b> <span class="kpi-target">目標 ≤ 10 個百分點</span></p></section>
        <section class="mt32 gov-secondary"><h2 class="gov-heading">次要指標：參與及產出</h2><p class="try-note">兩梯試辦累計至 117 年第 1 季；不能把完成量當成就業效果，也不等於上方分梯分析的母體。</p>
          <div class="grid g2 mt16"><div class="card card-pad"><h3>從參與到錄取</h3><table class="gov-funnel"><thead><tr><th scope="col">指標</th><th scope="col">人數</th><th scope="col">目標</th></tr></thead><tbody>${G.funnel.map(d => `<tr><th scope="row">${esc(d.n)}</th><td>${d.v.toLocaleString()}</td><td>${d.target.toLocaleString()}</td></tr>`).join('')}</tbody></table><p class="try-note">錄取者 6 個月留任率於 117 年追蹤，屬探索性結果；目標為公開追蹤結果。全體新人參考值 65.4%（104 人力銀行，2025），非對照組。</p></div>
          <div class="card card-pad"><h3>累計完成計分工單</h3><div class="evidence-result"><strong>${G.completedTasks} 張</strong><span>目標規模推估 ${G.taskEstimate} 張</span></div><p class="try-note">754 ÷ 580 位完成者＝平均 1.3 張。企畫書預算假設為每人約 1.3 張，依 600 位完成者目標推估 780 張；不是另訂的成效門檻。</p></div></div>
        </section>
        <p class="gov-source mt24">指標設計回應監察院對青年職涯發展中心偏重人次等產出指標的糾正。<a href="https://multimedia.cy.gov.tw/DocFiles/IFDEWebBBS_CY/Docs/114/3RD/00/76/1144330233.pdf" target="_blank" rel="noopener">監察院，2025 年 6 月 6 日糾正案</a></p>
        <section class="card card-pad mt24"><h2 class="gov-heading">建議分工</h2><div>${G.depts.map(d => `<div class="dept"><b>${esc(d.n)}</b><span>${esc(d.r)}</span></div>`).join('')}</div></section>
        <section class="card card-pad mt24 gov-local"><h2 class="gov-heading">本機紀錄（僅示範，非統計）</h2><p class="try-note">以下取自這個瀏覽器的操作與示範帳號，不納入上方指標；無政策目標值。</p><dl class="kv mt16"><dt>完成工單</dt><dd>${APP.store.completed().length}</dd><dt>個人焦慮填答</dt><dd>${s.anxiety.pre || '—'} → ${s.anxiety.post || '—'}（僅個人紀錄）</dd><dt>企業邀約操作</dt><dd>${(s.invites || []).length}</dd><dt>推薦好友通過</dt><dd>${(s.referrals || []).filter(r => r.status === 'passed').length}</dd></dl></section>
      </div>`,
      mount(root) { APP.ui.mountTips(root); }
    };
  };

  /* ======================================================== 戰隊 */
  V.squad = () => {
    const s = APP.store.get();
    if (!s.onboarded) return {
      title: '戰隊', html: `<div class="wrap wrap-narrow page"><div class="px-card empty">${px.sprite('shield', { size: 64 })}<h2 class="mt16 px px-33">組一支戰隊</h2><p class="muted mt8">先建立角色，才能組隊或接受邀請。</p><button class="px-btn mt24" data-onboard>建立角色 ▶</button></div></div>`,
      mount(root) { root.addEventListener('click', e => { if (e.target.closest('[data-onboard]')) APP.onboard(() => APP.render()); }); }
    };
    const q = APP.squad.get();
    const refs = APP.squad.referrals();
    const passed = refs.filter(r => r.status === 'passed').length;
    const code = APP.squad.myCode();
    const link = location.href.split('#')[0] + '#/join/' + code;
    const prog = q ? APP.squad.progress() : 0;
    const schools = APP.SCHOOLS.slice();
    if (s.user.school && !schools.some(x => x.n === s.user.school)) schools.push({ n: s.user.school, type: '你的學校', members: 1, done: 100, gain: 0, mine: true });
    schools.sort((a, b) => b.gain - a.gain);
    const stepState = k => k === 'joined' ? refs.length > 0 : k === 'passed' ? passed > 0 : passed >= 3;
    return {
      title: '戰隊與邀請',
      html: `<div class="wrap page">
        <div class="eyebrow">戰隊與邀請</div>
        <h1 class="section-title mt8">一個人接單容易放棄，一隊人會互相催。</h1>
        <p class="section-sub">2–5 人一隊，每週一起完成戰隊目標；沒有隊友也能加入系統配對的練習小組。用邀請碼拉朋友，好友<b>通過第一張工單的答辯</b>後雙方才得到回饋券；不發現金、獎勵設上限，沒有灌人頭的誘因。</p>
        <div class="grid g2 mt32" style="align-items:start">
          ${q ? `<div class="px-card px-panel" style="padding:22px">
            <div class="row" style="gap:16px"><div class="squad-crest">${px.sprite('shield', { size: 56 })}</div><div><div class="rk mono faint" style="font-size:11.5px">SQUAD・${esc(q.code)}</div><div class="px px-33">${esc(q.name)}</div><div class="faint" style="font-size:12.5px">成立於 ${fmtDate(q.createdAt)}・${q.members.length}/5 人</div></div></div>
            <div class="mt24"><div class="row-between" style="font-size:13.5px"><b>本週戰隊目標：全隊完成 ${q.goal} 張工單</b><span class="mono">${Math.min(prog, q.goal)}/${q.goal}</span></div><div class="quest-bar mt8"><i style="width:${Math.min(100, prog / q.goal * 100)}%"></i></div>
              <p class="faint mt8" style="font-size:12.5px">${prog >= q.goal ? '目標達成！全隊獲得本週戰隊徽章' : `再 ${q.goal - prog} 張達成，全隊獲得本週戰隊徽章`}</p></div>
            <div class="mt16">${q.members.map(m => `<div class="member"><span class="mav">${px.avatar(m.alias, 32)}</span><div><b>${esc(m.alias)}${m.me ? '（你）' : ''}</b><small>${m.status === 'invited' ? '已加入，尚未完成第一張工單' : `本週完成 ${m.me ? prog - q.members.filter(x => !x.me).reduce((n, x) => n + x.done, 0) : m.done} 張`}</small></div>${m.status === 'invited' ? '<span class="tag tag-warn">新成員</span>' : '<span class="tag tag-ok">活躍</span>'}</div>`).join('')}
              ${Array.from({ length: 5 - q.members.length }, () => `<div class="member"><span class="slot-empty">+</span><div><b class="faint">空位</b><small>用下方邀請碼拉朋友加入</small></div><span></span></div>`).join('')}</div>
          </div>` : `<form class="px-card px-panel stack" style="--gap:14px;padding:22px" data-create>
            <div class="row" style="gap:16px"><div class="squad-crest">${px.sprite('shield', { size: 56 })}</div><div><div class="px px-33">建立戰隊</div><div class="faint" style="font-size:12.5px">同學、同事、轉職的朋友都可以</div></div></div>
            <label class="field"><span>戰隊名稱</span><input class="input" name="name" maxlength="12" required placeholder="例：夜貓接案隊"></label>
            <button class="px-btn" type="submit">建立戰隊 ▶</button>
            <div class="callout info">${icon('users')}<div>沒有認識的人也沒關係：<button type="button" class="btn btn-text btn-sm" data-match style="padding:0 4px">加入系統配對的練習小組</button>，和同職能、同時段的人一起練。</div></div></form>`}
          <div class="px-card px-panel" style="padding:22px">
            <h4 class="px px-22">${px.sprite('scroll', { size: 22 })}我的邀請碼</h4>
            <div class="invite-code mt16">${code}</div>
            <div class="row mt12"><input class="input" readonly value="${esc(link)}" style="flex:1;font-size:12.5px" aria-label="邀請連結"><button class="btn btn-ghost btn-sm" data-copylink>${icon('link')}複製連結</button></div>
            <div class="reward-steps mt24">${APP.REF_STEPS.map(r => `<div class="px-card rstep ${stepState(r.k) ? 'done' : ''}">${px.sprite(r.i, { size: 28 })}<b>${esc(r.n)}</b><span>${esc(r.r)}</span></div>`).join('')}</div>
            <div class="mt24"><div class="row-between"><b style="font-size:14px">已邀請（${refs.length}）</b><span class="faint" style="font-size:12.5px">回饋券 ${s.coupons || 0} 張</span></div>
              <div class="mt8">${refs.length ? refs.map(r => `<div class="member"><span class="mav">${px.avatar(r.name, 32)}</span><div><b>${esc(r.name)}</b><small>${fmtDate(r.at)}</small></div>${r.status === 'passed' ? '<span class="tag tag-ok">已通過答辯</span>' : '<span class="tag tag-warn">已驗證身分</span>'}</div>`).join('') : '<p class="faint" style="font-size:13px">還沒有邀請任何人</p>'}</div>
              <button class="btn btn-text btn-sm mt12" data-simfriend>${icon('users')}示範：模擬好友用邀請碼加入／完成工單</button></div>
            <p class="faint mt12" style="font-size:12px">防刷設計：一人一帳號（臺北通或學校信箱驗證）、獎勵只在好友通過答辯後發放、每月獎勵設上限、不發現金。</p>
          </div>
        </div>

        <div class="mt48"><div class="row-between"><div><div class="eyebrow">校際與社群榜</div><h2 class="section-title mt8" style="font-size:26px">比的是進步，不是誰的學校比較好。</h2></div></div>
          <p class="section-sub">學校信箱驗證後自動加入學校隊伍，非在學者可加入轉職、接案等社群。排名依「平均進步分數」（第一張到最近一張工單的分數差），讓每所學校都有機會贏。</p>
          <div class="card mt24">
            <div class="learn-row school-row head"><span>#</span><span>學校／社群</span><span>參與人數</span><span>完成率</span><span>平均進步分數</span></div>
            ${schools.map((x, i) => `<div class="learn-row school-row" style="${x.n === s.user.school ? 'background:var(--accent-soft)' : ''}"><span class="mono" style="font-weight:800">${i + 1}</span><div><b>${esc(x.n)}</b>${x.n === s.user.school ? ' <span class="tag tag-warn">你的學校</span>' : ''}<div class="faint" style="font-size:12px">${esc(x.type)}</div></div><span class="tnum"><i class="m-lab">參與 </i>${x.members.toLocaleString()}<i class="m-lab"> 人</i></span><span class="tnum"><i class="m-lab">完成率 </i>${x.done}%</span><div class="meter"><div class="tr"><div class="fi" style="width:${x.gain * 4}%"></div></div><b>+${x.gain}</b></div></div>`).join('')}
          </div>
          <p class="faint mt12" style="font-size:12.5px">示範數據，校名為虛構。正式版提供各校職涯中心專屬儀表板。</p>
        </div>
      </div>`,
      mount(root) {
        root.addEventListener('submit', e => { e.preventDefault(); const n = e.target.name.value.trim(); if (!n) return; APP.squad.create(n); toast(`戰隊「${n}」成立！`, 'ok'); APP.render(); });
        root.addEventListener('click', e => {
          if (e.target.closest('[data-copylink]')) { const inp = $('input[readonly]', root); inp.select(); try { navigator.clipboard.writeText(inp.value).then(() => toast('已複製邀請連結', 'ok'), () => toast('請手動複製連結', 'info')); } catch (err) { toast('請手動複製連結', 'info'); } }
          if (e.target.closest('[data-simfriend]')) { toast(APP.squad.simulateFriend(), 'ok', 3600); APP.render(); }
          if (e.target.closest('[data-match]')) { const q = APP.squad.create('配對練習小組'); q.members.push({ alias: 'Y-1102', done: 1, status: 'active' }, { alias: 'Y-0958', done: 0, status: 'active' }); APP.store.save(); toast('已為你配對 2 位同職能的夥伴', 'ok'); APP.render(); }
        });
      }
    };
  };

  /* ======================================================== 邀請連結落地頁 */
  V.join = (code) => {
    const s = APP.store.get();
    const own = s.refCode === code;
    return {
      title: '戰隊邀請',
      html: `<div class="wrap wrap-narrow page"><div class="lobby-banner px-edge">${px.skyline()}<div class="lobby-in" style="align-items:center;justify-content:center;text-align:center"><div class="lobby-title"><div class="eyebrow">INVITE・${esc(code)}</div><h1 class="px px-44">你被邀請加入公會</h1><p style="margin:10px auto 0">朋友邀請你一起接影子工單。你完成第一張工單並通過答辯後，你們各得一張「職人 1 對 1 回饋券」。</p>
        ${own ? '<p class="mt16" style="color:#ffc93c">（這是你自己的邀請碼）</p>' : `<button class="px-btn lg mt24" data-accept>${s.onboarded ? '接受邀請 ▶' : '建立角色並接受邀請 ▶'}</button>`}</div></div></div></div>`,
      mount(root) {
        root.addEventListener('click', e => {
          if (!e.target.closest('[data-accept]')) return;
          const go = () => { const st = APP.store.get(); st.invitedBy = code; APP.store.save(); toast('已接受邀請！先去接第一張工單吧', 'ok'); location.hash = '#/tasks'; };
          s.onboarded ? go() : APP.onboard(go);
        });
      }
    };
  };
})();

/* ======================================================== 職人答辯官 */
(function () {
  const { esc, nl, icon, $, $$, toast } = APP.ui;
  const px = APP.px;
  const QUEUE = [
    { id: 'q1', alias: 'Y-0915', task: 'co-coffee-retention', ai: [84, 70, 67, 82, 76], excerpt: '下滑主因是新會員占比上升：舊會員回購率維持在 39–43%，新會員從 20% 掉到 9%。建議在外送包裝放官方 LINE 加入卡，把平台客人導流成自有會員……', q: '如果老闆堅持「就是舊客流失」，你會拿哪一個數字說服他？', a: '我會給他看拆分表：舊會員回購率只從 43% 掉到 39%，但新會員占比從 18% 變 39%。問題是新客留不住。' },
    { id: 'q2', alias: 'Y-1022', task: 'gov-youth-fair', ai: [72, 64, 34, 70, 58], excerpt: '建議下季 KOL 合作 15 萬、IG 12 萬、校園 8 萬。KOL 每位到場成本約 NT$210，效益最高，因此加碼……', q: '你的分配裡哪一筆錢最沒把握？', a: 'KOL 吧，因為 AI 說它成本最低，所以我比較放心。' },
    { id: 'q3', alias: 'Y-0877', task: 'co-logistics-cs', ai: [90, 86, 100, 88, 80], excerpt: '清理後共 10 筆有效客訴（刪除測試單與重複單號）。重複扣款 3 件、平均等待 54 小時，列為第一優先；SOP 第一步：2 小時內以首次回覆模板回覆……', q: '24 小時首次回覆，3 個人真的做得到嗎？', a: '首次回覆用模板，每人每小時可處理 6–8 筆；本週有效客訴 10 筆，3 人一天可處理超過 100 筆，人力足夠。' }
  ];
  APP.views.mentor = () => {
    const s = APP.store.get();
    s.reviews = s.reviews || {};
    let cur = null;
    const list = () => QUEUE.map(q => { const t = APP.h.task(q.task); const done = s.reviews[q.id]; return `<button class="card cand" style="text-align:left;cursor:pointer;width:100%;border:${cur === q.id ? '2px solid var(--ink)' : '1px solid var(--line)'}" data-open="${q.id}">
      <div class="cand-top"><span style="background:var(--night);width:42px;height:42px;display:grid;place-items:center">${px.avatar(q.alias, 30)}</span><div><b>${q.alias}</b><span>${esc(t.title)}</span></div>${done ? '<span class="tag tag-ok" style="margin-left:auto">已複核</span>' : '<span class="tag tag-warn" style="margin-left:auto">待複核</span>'}</div></button>`; }).join('');
    const panel = () => {
      if (!cur) return `<div class="card empty">${px.sprite('bubble', { size: 52 })}<p class="muted mt12">選一份待複核的成果開始</p></div>`;
      const q = QUEUE.find(x => x.id === cur), t = APP.h.task(q.task), r = s.reviews[cur];
      const vals = r ? r.dims : q.ai;
      return `<div class="card card-pad">
        <div class="row-between"><div><div class="eyebrow">${t.code}・${q.alias}</div><h3 class="mt8" style="font-size:18px">${esc(t.title)}</h3></div><span class="tag">${icon('eyeOff')}匿名複核</span></div>
        <div class="mail mt16"><div class="mail-subj">成果摘要</div><div style="font-size:13.5px">${esc(q.excerpt)}</div></div>
        <div class="mail mt12"><div class="mail-subj">答辯節錄</div><div class="faint" style="font-size:12.5px">Q：${esc(q.q)}</div><div style="font-size:13.5px;margin-top:4px">A：${esc(q.a)}</div></div>
        <h4 class="mt24" style="font-size:15px">五力複核 <span class="faint" style="font-weight:400;font-size:12.5px">預設為 AI 初評分數，請依你的專業判斷調整</span></h4>
        <div class="mt12">${APP.DIMS.map((d, i) => `<div class="dimbar" style="grid-template-columns:96px 1fr 70px"><span>${d.n}</span><input type="range" min="0" max="100" value="${vals[i]}" data-dim="${i}" aria-label="${d.n}" ${r ? 'disabled' : ''}><b><span data-v="${i}">${vals[i]}</span><span class="faint" style="font-weight:400;font-size:11.5px"> / AI ${q.ai[i]}</span></b></div>`).join('')}</div>
        <label class="field mt16"><span>給青年的一句話回饋</span><textarea class="textarea" style="min-height:80px" data-cmt ${r ? 'readonly' : ''} placeholder="例：你抓到了 AI 的錯，但沒有說明怎麼驗證，下次把驗算過程寫出來。">${esc(r ? r.cmt : '')}</textarea></label>
        ${r ? `<div class="callout ok mt16">${icon('check')}<div>已送出複核，酬勞 NT$500 將於月底撥付（示範）。</div></div>` : `<div class="row mt16"><button class="btn btn-primary" data-submit>${icon('check')}送出複核</button><button class="btn btn-ghost" data-flagcheat>${icon('flag')}疑似代做，提報覆查</button></div>`}
      </div>`;
    };
    return {
      title: '職人答辯官',
      html: `<div class="wrap page">
        <div class="grid g2" style="align-items:center;gap:32px">
          <div><h1 class="section-title mt8">職人答辯與複核</h1>
            <p class="section-sub">招募資深與退休職人擔任答辯官：用 15 分鐘視訊追問青年的決策，再複核 AI 初評的分數。每場酬勞 NT$500（規劃），時間自己排。</p></div>
          <div class="grid g3" style="gap:12px">
            <div class="card kpi"><div class="label">每場時間</div><div class="value">30 分</div><div class="delta muted" style="font-weight:400">答辯 15＋複核 15</div></div>
            <div class="card kpi"><div class="label">每場酬勞</div><div class="value">$500</div><div class="delta muted" style="font-weight:400">規劃金額</div></div>
            <div class="card kpi"><div class="label">試辦目標</div><div class="value">100 位</div><div class="delta muted" style="font-weight:400">50 歲以上 ≥ 50%</div></div>
          </div>
        </div>
        <div class="callout info mt32">${icon('info')}<div>以下是複核介面的示範。AI 初評先依公開規準給分，答辯官依答辯表現調整；兩者差距過大的案件會自動送第二位答辯官。</div></div>
        <div class="detail-grid mentor-grid mt24">
          <div class="stack" style="--gap:12px" data-list>${list()}</div>
          <div data-panel>${panel()}</div>
        </div>
      </div>`,
      mount(root) {
        const re = () => { $('[data-list]', root).innerHTML = list(); $('[data-panel]', root).innerHTML = panel(); };
        root.addEventListener('click', e => {
          const o = e.target.closest('[data-open]'); if (o) { cur = o.dataset.open; re(); return; }
          if (e.target.closest('[data-submit]')) {
            const dims = $$('[data-dim]', root).map(x => +x.value);
            s.reviews[cur] = { dims, cmt: $('[data-cmt]', root).value.trim(), at: Date.now() }; APP.store.save();
            toast('已送出複核，感謝你的經驗分享', 'ok'); re();
          }
          if (e.target.closest('[data-flagcheat]')) toast('已提報覆查：將比對過程紀錄並安排第二次答辯', 'warn', 3200);
        });
        root.addEventListener('input', e => { const d = e.target.dataset.dim; if (d !== undefined) $(`[data-v="${d}"]`, root).textContent = e.target.value; });
      }
    };
  };
})();


/* ======================================================== 一頁式工單履歷、驗證頁 */
(function () {
  const { esc, icon, fmtDate } = APP.ui;
  const V = APP.views;
  V.onepage = () => {
    const all = APP.portfolioMine();
    const list = all.entries.filter(e => !e.hidden);
    if (!list.length) return { title: '一頁式工單履歷', html: `<div class="wrap wrap-narrow page"><div class="card empty"><p class="muted">還沒有可公開的已驗證工單。</p><a class="btn btn-primary mt16" href="#/portfolio">回工單履歷</a></div></div>` };
    const name = all.blind ? '盲審代號 Y-' + APP.ui.hash(all.name).slice(0, 4) : all.name;
    const dims = APP.DIMS.map((d, i) => Math.round(list.reduce((n, e) => n + e.dims[i], 0) / list.length));
    const vid = list[0].vid;
    return {
      title: '一頁式工單履歷',
      html: `<div class="wrap wrap-narrow page">
        <div class="row-between no-print"><a class="btn btn-text" href="#/portfolio">${icon('arrowLeft')}回工單履歷</a><button class="btn btn-primary" data-print>${icon('print')}列印／存成 PDF</button></div>
        <div class="card onepage mt16">
          <div class="op-head"><div><div class="eyebrow">工單履歷・學習與評量紀錄</div><h1>${esc(name)}</h1><div class="muted" style="font-size:13px">${esc(all.who || '')}${all.blind ? '・學校已隱藏（盲審）' : (all.school ? '・' + esc(all.school) : '')}</div></div>
            <div class="op-qr">${APP.ui.qrSVG(APP.ui.verifyURL(vid))}<span>掃描查驗</span></div></div>
          <div class="op-dims">${APP.DIMS.map((d, i) => `<div><span>${d.n}</span><div class="track"><div class="fill" style="width:${dims[i]}%"></div></div><b>${dims[i]}</b></div>`).join('')}</div>
          <div class="op-list">${list.map(e => `<div class="op-item"><span class="grade grade-${e.grade} sm">${e.grade}</span><div><b>${esc(e.t.title)}</b><div class="faint" style="font-size:12px">${esc(e.t.org)}・${fmtDate(e.at)}・評量分數 ${e.total}（示範）</div><div class="op-beh">${(e.beh || []).map(x => '✓ ' + esc(x)).join('　')}</div></div><span class="mono faint" style="font-size:11px">${e.vid}</span></div>`).join('')}</div>
          <p class="faint" style="font-size:11.5px;margin-top:14px">正式版規劃經 AI 初評與職人答辯驗證。企業可掃描 QR code 或輸入驗證碼查驗；成果全文需本人同意後調閱。本頁為競賽提案原型示範，非市府正式文件。</p>
        </div></div>`,
      mount(root) { root.addEventListener('click', e => { if (e.target.closest('[data-print]')) window.print(); }); }
    };
  };
  V.verify = (vid) => {
    const pm = APP.portfolioMine();
    let mine = pm.entries.find(e => e.vid === vid);
    if (!mine) {
      const iss = (APP.store.get().issued || []).find(x => x.vid === vid);
      const t = iss && APP.h.task(iss.id);
      if (t) mine = { t, grade: iss.grade, at: iss.at, vid, hidden: !!(APP.store.get().pubHidden || {})[iss.id], beh: [`抓出埋設錯誤 ${(iss.found || []).length}/${t.errors.length}`].concat(iss.qn >= 2 ? [`開工前提出 ${iss.qn} 個確認問題`] : [], iss.changeHits >= 2 ? ['需求變更後完整調整成果'] : []) };
    }
    if (mine && mine.hidden) return { title: '工單履歷查驗', html: `<div class="wrap wrap-narrow page"><div class="card card-pad">${APP.ui.verifyNotice()}<h2 class="mt16" style="font-size:22px">此本機紀錄已設定不公開</h2><p class="muted mt8">請直接向持有人索取授權。驗證碼：<span class="mono">${esc(vid)}</span></p></div></div>` };
    let hit = mine, who = mine ? '本機使用者' : '';
    if (!hit) for (const c of APP.CANDIDATES) { const e = APP.portfolioCand(c).entries.find(x => x.vid === vid); if (e) { hit = e; who = c.alias; break; } }
    if (!hit) return { title: '工單履歷查驗', html: `<div class="wrap wrap-narrow page">${APP.ui.verifyNotice()}<h1 class="section-title mt16">查無此驗證碼</h1><p class="mt16">請確認驗證碼是否正確：<span class="mono">${esc(vid)}</span></p></div>` };
    const evidence = APP.DEMO_EVIDENCE[hit.t.id] || {};
    const aiOnly = hit.verification === 'AI 初評';
    const alias = mine ? 'Y-' + APP.ui.hash(pm.name).slice(0, 4) : who;
    return {
      title: '面試決策卡・工單履歷查驗',
      html: `<div class="wrap wrap-narrow page"><article class="decision-card">
        ${APP.ui.verifyNotice()}
        <h1 class="section-title mt16">${esc(hit.t.title)}</h1><p class="decision-role">適合職缺：${esc(evidence.role || hit.t.role)}</p>

        <section class="review-dialogue"><h2>他怎麼說</h2><blockquote>${esc(hit.def || evidence.answer || '此紀錄尚無可公開的答辯節錄。')}</blockquote>
        <h2>${aiOnly ? "驗證狀態" : "職人評語"}</h2><p>${esc(aiOnly ? "此工單僅完成 AI 初評，尚無職人答辯評語；能力判定須待答辯驗證。" : mine ? '本機紀錄尚無真人職人評語；此處呈現提案示範：' + (evidence.comment || '需由職人複核。') : hit.grade === 'B' || hit.grade === 'C' ? '能說出處理方向，但資料核對與效果檢查還需要練習。' : evidence.comment || '')}</p><p class="try-note">${esc(aiOnly ? '企業邀約面試前須完成答辯。' : (evidence.reviewer || '職人答辯官').replace(/[，・]示範/g, ''))}</p></section>
        <div class="review-points"><div><b>${aiOnly ? "AI 初評：做得好" : "做得好"}</b><p>${esc(evidence.good || '有留下工作過程紀錄。')}</p></div><div><b>${aiOnly ? "AI 初評：待加強" : "待加強"}</b><p>${esc(evidence.improve || '需補充驗證方法。')}</p></div></div>
        <p class="decision-meta">所用時間：${hit.dur ? APP.ui.fmtDur(hit.dur) : '未記錄'}・難度 L${hit.t.level}</p>
        <section class="decision-dims"><h2>五力</h2><dl>${APP.DIMS.map((d,i) => `<div><dt>${d.n}</dt><dd>${hit.dims ? hit.dims[i] : '未記錄'}</dd></div>`).join('')}</dl></section>
        <div class="verify-bottom"><div><dl class="kv"><dt>驗證碼</dt><dd class="mono">${esc(vid)} <small>DEMO</small></dd><dt>持有人</dt><dd>${esc(alias)}（盲審）</dd><dt>驗證方式</dt><dd>${esc(hit.verification || "AI 初評＋模擬答辯")}</dd></dl><p class="try-note">成果全文與過程紀錄需本人同意後調閱。此處人物、評語與分數為虛構或本機練習資料。</p></div><div class="op-qr">${APP.ui.qrSVG(APP.ui.verifyURL(vid, true))}<span>線上查驗</span></div></div>
        <a class="try-text-link" href="#/company">回企業專區 ${icon('arrowRight')}</a>
      </article></div>`
    };
  };
})();
