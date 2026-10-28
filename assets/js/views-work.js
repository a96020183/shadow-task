/* 工作台、答辯、結果 */
(function () {
  const { esc, nl, icon, len, $, $$, toast, modal, fmtClock, fmtTime, level } = APP.ui;
  const px = APP.px;
  const V = APP.views;
  const H = APP.h;
  const STEPS = ['理解需求', '拆解計畫', '實作產出', '驗證修正', '送出答辯'];
  const CHANGE_AFTER_MS = 40000;

  function flagLabel(task, key) {
    const [type, a, b] = key.split(':');
    if (type === 'row') {
      const m = task.materials.find(x => x.id === a); const r = m && m.rows.find(x => x.id === b);
      return r ? `${m.title}：${r.c.slice(0, 4).join('｜')}` : key;
    }
    if (type === 'claim') {
      for (const m of task.materials) if (m.paras) for (const p of m.paras) for (const seg of p) if (seg.c === a) return `${m.title}：「${seg.t}」`;
    }
    if (type === 'ai') { const x = task.ai.find(q => q.id === a); return x ? `AI 回答：「${x.q}」` : key; }
    return key;
  }
  APP.flagLabel = flagLabel;

  /* ======================================================== 工作台 */
  V.work = (id) => {
    const t = H.task(id);
    if (!t || t.status !== 'open') return V.notFound();
    const a = APP.store.attempt(id);
    if (!a) { setTimeout(() => location.replace('#/task/' + id)); return { html: '' }; }
    if (a.result) { setTimeout(() => location.replace('#/result/' + id)); return { html: '' }; }
    if (a.step >= 6) { setTimeout(() => location.replace('#/defense/' + id)); return { html: '' }; }
    let tab = a.step >= 3 ? 'table' : 'mail';
    let timers = [];
    const save = () => APP.store.save();
    let saveT;
    const autosave = () => { clearTimeout(saveT); saveT = setTimeout(() => { save(); const s = $('[data-saved]'); if (s) { s.textContent = '已自動儲存 ' + fmtTime(Date.now()); } }, 350); };

    /* ---------- 左：資料面板 ---------- */
    function mails() {
      const list = [];
      if (a.changeAt) list.push(`<div class="mail urgent ${a._newChange ? 'new' : ''}"><div class="mail-h"><span><b>${esc(t.boss.name)}</b>（${esc(t.boss.title)}）</span><span>${fmtTime(a.changeAt)}</span></div><div class="mail-subj">${esc(t.change.subject)}</div><div>${nl(t.change.body)}</div></div>`);
      if (a.clarified) list.push(`<div class="mail"><div class="mail-h"><span><b>${esc(t.boss.name)}</b>（${esc(t.boss.title)}）</span><span>回覆你的問題</span></div><div class="mail-subj">RE：開工前確認</div><div>${nl(t.clarify.reply)}</div></div>`);
      list.push(`<div class="mail"><div class="mail-h"><span><b>${esc(t.boss.name)}</b>（${esc(t.boss.title)}）</span><span>${fmtTime(a.startedAt)}</span></div><div class="mail-subj">交辦：${esc(t.title)}</div><div>${nl(t.brief)}</div></div>`);
      return list.join('');
    }
    function tables() {
      return t.materials.filter(m => m.type === 'table').map(m => `<div class="mt16"><div class="row-between"><b style="font-size:14px">${icon('table', 'sr-only')}${esc(m.title)}</b><span class="faint" style="font-size:12px">${m.rows.length} 筆</span></div>
        <div class="table-scroll mt8"><table class="dtable"><thead><tr><th style="width:34px"><span class="sr-only">標記</span></th>${m.cols.map(c => `<th class="${c.num ? 'num' : ''}">${esc(c.n)}</th>`).join('')}</tr></thead><tbody>
        ${m.rows.map(r => { const k = `row:${m.id}:${r.id}`; return `<tr class="${a.flags[k] ? 'flagged' : ''}" data-row="${k}"><td><button class="flag-btn ${a.flags[k] ? 'on' : ''}" data-flag="${k}" aria-pressed="${!!a.flags[k]}" aria-label="標記此列為可疑">${icon('flag')}</button></td>${r.c.map((c, i) => `<td class="${m.cols[i].num ? 'num' : ''}">${esc(c)}</td>`).join('')}</tr>`; }).join('')}
        </tbody></table></div></div>`).join('');
    }
    function docs() {
      return t.materials.filter(m => m.type === 'doc').map(m => `<div class="doc mt16"><div class="doc-src">${esc(m.src)}</div><h5>${esc(m.title)}</h5>
        ${m.paras.map(p => `<p>${p.map(seg => typeof seg === 'string' ? esc(seg) : `<span class="claim ${a.flags['claim:' + seg.c] ? 'on' : ''}" role="button" tabindex="0" data-flag="claim:${seg.c}" aria-pressed="${!!a.flags['claim:' + seg.c]}">${esc(seg.t)}</span>`).join('')}</p>`).join('')}</div>`).join('');
    }
    function chat() {
      const asked = a.aiLog.map(l => l.id);
      const bubbles = a.aiLog.map(l => { const x = t.ai.find(q => q.id === l.id); const k = 'ai:' + x.id; return `<div class="bubble q">${esc(x.q)}</div><div class="bubble a ${a.flags[k] ? 'on' : ''}">${nl(x.a)}<div class="bmeta"><span>模擬 AI・${fmtTime(l.at)}</span><button class="bflag ${a.flags[k] ? 'on' : ''}" data-flag="${k}" aria-pressed="${!!a.flags[k]}">${icon('flag')}${a.flags[k] ? '已標記可疑' : '標記可疑'}</button></div></div>`; }).join('');
      const left = t.ai.filter(q => !asked.includes(q.id));
      return `<div class="ai-head">${icon('info')}<span>模擬 AI 助手：回答<b>可能有錯</b>，請自行驗證。正式版串接市府授權的 AI 服務，並保留對話紀錄供答辯參考。</span></div>
        <div class="chat">${bubbles || '<p class="faint center" style="font-size:13px;padding:20px 0">點下方的問題開始對話</p>'}</div>
        ${left.length ? `<div class="prompt-chips">${left.map(q => `<button class="chip" data-ask="${q.id}">${icon('spark')}${esc(q.q)}</button>`).join('')}</div>` : ''}`;
    }
    const flagCount = () => Object.values(a.flags).filter(Boolean).length;
    function panel() {
      const tabs = [['mail', 'mail', `信件${a.changeAt && !a.changeSeen ? ' <span class="dot"></span>' : ''}`], ['table', 'table', '資料表'], ['doc', 'doc', '文件'], ['ai', 'spark', 'AI 助手']];
      const body = tab === 'mail' ? mails() : tab === 'table' ? `<p class="faint" style="font-size:12.5px">點列首的 ⚑ 標記你認為有問題的資料。</p>${tables()}` : tab === 'doc' ? `<p class="faint" style="font-size:12.5px">點虛線文字，可標記為可疑的陳述。</p>${docs()}` : chat();
      return `<div class="panel panel-sticky"><div class="panel-tabs" role="tablist">${tabs.map(([k, ic, n]) => `<button role="tab" aria-selected="${tab === k}" class="${tab === k ? 'on' : ''}" data-tab="${k}">${icon(ic)}${n}</button>`).join('')}<span style="margin-left:auto;align-self:center;font-size:12px;color:var(--muted);padding-right:8px;white-space:nowrap">已標記 <b data-fc>${flagCount()}</b> 處</span></div><div class="panel-body">${body}</div></div>`;
    }

    /* ---------- 右：步驟 ---------- */
    function stepForm() {
      const s = a.step;
      if (s === 1) return `<div class="card card-pad">
        <div class="eyebrow">STEP 01・理解需求</div><h2 class="mt8" style="font-size:20px">先別急著做，確認你真的懂要做什麼。</h2>
        <label class="field mt16"><span>用你自己的話重述這個任務<em>1–3 句</em></span><textarea class="textarea" data-bind="understanding.restate" placeholder="例：要在什麼限制下，交出什麼，給誰看…">${esc(a.understanding.restate)}</textarea></label>
        <label class="field mt16"><span>開工前，你想向主管確認哪些問題？<em>一行一題</em></span><textarea class="textarea" data-bind="understanding.questions" ${a.clarified ? 'readonly' : ''} placeholder="例：預算有沒有彈性？報告要給誰看？">${esc(a.understanding.questions)}</textarea></label>
        ${a.clarified ? `<div class="callout ok mt12">${icon('check')}<div>主管已回覆你的問題，請到資料區的「信件」查看。</div></div>` : `<button class="btn btn-ghost mt12" data-clarify>${icon('send')}送出確認問題給主管</button>`}
        <div class="ws-actions"><span></span><button class="btn btn-primary" data-next>下一步：拆解計畫 ${icon('arrowRight')}</button></div></div>`;
      if (s === 2) return `<div class="card card-pad">
        <div class="eyebrow">STEP 02・拆解計畫</div><h2 class="mt8" style="font-size:20px">把任務拆成可以檢查的步驟。</h2>
        <p class="muted mt8" style="font-size:13.5px">勾選你打算交給 AI 做的步驟。好的計畫會留一步給「驗證」。</p>
        <div class="plan-list mt16">${a.plan.map((p, i) => `<div class="plan-item"><span class="n">${i + 1}</span><input class="input" data-plan="${i}" value="${esc(p.t)}" placeholder="步驟 ${i + 1}"><label><input type="checkbox" data-planai="${i}" ${p.ai ? 'checked' : ''}>用 AI</label><button class="flag-btn" data-del="${i}" aria-label="刪除步驟">${icon('trash')}</button></div>`).join('')}</div>
        ${a.plan.length < 8 ? `<button class="btn btn-text mt8" data-add>${icon('plus')}新增步驟</button>` : ''}
        <div class="ws-actions"><button class="btn btn-text" data-prev>${icon('arrowLeft')}上一步</button><button class="btn btn-primary" data-next>下一步：開始實作 ${icon('arrowRight')}</button></div></div>`;
      if (s === 3) return `<div class="card card-pad">
        <div class="eyebrow">STEP 03・實作產出</div><h2 class="mt8" style="font-size:20px">查過資料，再完成你的成果。</h2>
        ${a.changeAt ? `<div class="callout bad mt12">${px.sprite('bolt', { size: 18 })}<div><b>需求已變更：</b>${esc(t.change.subject.replace(/【.*?】/, ''))}。請把成果調整成新版本。</div></div>` : `<div class="callout info mt12">${icon('info')}<div>發現可疑的資料或 AI 回答，記得在資料區標記 ⚑。</div></div>`}
        ${t.deliverables.map(d => `<label class="field deliv mt16"><span>${esc(d.label)}</span><textarea class="textarea" style="min-height:130px" data-ans="${d.id}" placeholder="${esc(d.hint)}">${esc(a.answers[d.id] || '')}</textarea><div class="hint"><span>${esc(d.hint)}</span><span data-cnt="${d.id}">${cnt(d)}</span></div></label>`).join('')}
        <div class="ws-actions"><button class="btn btn-text" data-prev>${icon('arrowLeft')}上一步</button><button class="btn btn-primary" data-next>下一步：驗證修正 ${icon('arrowRight')}</button></div></div>`;
      if (s === 4) {
        const flagged = Object.keys(a.flags).filter(k => a.flags[k]);
        return `<div class="card card-pad">
        <div class="eyebrow">STEP 04・驗證修正</div><h2 class="mt8" style="font-size:20px">交出去之前，再檢查一次。</h2>
        <div class="mt16"><b style="font-size:14px">你標記的可疑之處（${flagged.length}）</b>
          <div class="flag-summary mt8">${flagged.length ? flagged.map(k => `<div class="fs">${icon('flag')}<span style="flex:1">${esc(flagLabel(t, k))}</span><button class="btn btn-text btn-sm" data-unflag="${k}">取消</button></div>`).join('') : '<div class="callout warn">' + icon('alert') + '<div>你還沒有標記任何可疑之處。確定資料、文件和 AI 的回答都沒問題嗎？</div></div>'}</div></div>
        <label class="field mt16"><span>你怎麼驗證關鍵數字？</span><textarea class="textarea" data-bind="review.verify" placeholder="例：用試算表重算各管道成本，和 AI 的結果比對…">${esc(a.review.verify)}</textarea></label>
        <label class="field mt16"><span>需求變更後，你調整了什麼？</span><textarea class="textarea" data-bind="review.change" placeholder="具體寫出改了哪些內容、為什麼">${esc(a.review.change)}</textarea></label>
        <label class="field mt16"><span>其他發現的問題<em>選填</em></span><textarea class="textarea" style="min-height:80px" data-bind="review.other">${esc(a.review.other)}</textarea></label>
        <div class="field mt16"><span>AI 使用揭露</span>
          <div class="grid g3" style="gap:8px">${[['none', '沒有使用'], ['some', '部分步驟'], ['heavy', '大量使用']].map(([k, n]) => `<label class="check"><input type="radio" name="aiu" value="${k}" ${a.disclosure.used === k ? 'checked' : ''}>${n}</label>`).join('')}</div>
          <textarea class="textarea mt8" style="min-height:80px" data-bind="disclosure.how" placeholder="用在哪些步驟？你怎麼確認它是對的？">${esc(a.disclosure.how)}</textarea></div>
        <div class="ws-actions"><button class="btn btn-text" data-prev>${icon('arrowLeft')}上一步</button><button class="btn btn-primary" data-next>下一步：確認送出 ${icon('arrowRight')}</button></div></div>`;
      }
      return `<div class="card card-pad">
        <div class="eyebrow">STEP 05・送出答辯</div><h2 class="mt8" style="font-size:20px">成果確認</h2>
        <div class="mt16 stack" style="--gap:12px">${t.deliverables.map(d => `<div class="mail"><div class="mail-subj">${esc(d.label)}</div><div style="font-size:13.5px">${nl(a.answers[d.id] || '')}</div></div>`).join('')}</div>
        <div class="grid g3 mt16" style="gap:10px">
          <div class="card kpi" style="box-shadow:none"><div class="label">標記可疑</div><div class="value">${flagCount()}</div></div>
          <div class="card kpi" style="box-shadow:none"><div class="label">計畫步驟</div><div class="value">${a.plan.filter(p => len(p.t) >= 4).length}</div></div>
          <div class="card kpi" style="box-shadow:none"><div class="label">AI 對話</div><div class="value">${a.aiLog.length}</div></div>
        </div>
        <div class="callout warn mt16">${px.sprite('bubble', { size: 18 })}<div>送出後會進入<b>答辯</b>：職人答辯官會問你 3 個問題，每題建議 3 分鐘內作答（超時不扣分）。送出後成果無法再修改；成績只有你看得到，要不要公開由你決定。</div></div>
        <div class="ws-actions"><button class="btn btn-text" data-prev>${icon('arrowLeft')}上一步</button><button class="px-btn" data-submit>${px.sprite('sword', { size: 18 })}送出，進入答辯</button></div></div>`;
    }
    function cnt(d) { const n = len(a.answers[d.id]); return n >= d.minLen ? `<span class="ok">${n} 字 ✓</span>` : `${n} / ${d.minLen} 字`; }

    function html() {
      return `<div class="wrap page" style="padding-top:24px">
        <div class="ws-head">
          <div><div class="row" style="gap:8px"><a class="btn btn-text btn-sm" href="#/task/${t.id}">${icon('arrowLeft')}工單說明</a><span class="ticket-id">${t.code}</span>${H.orgTag(t)}${a.practice ? '<span class="tag tag-warn">練習模式</span>' : ''}</div><h1 class="mt8">${esc(t.title)}</h1></div>
          <div class="row"><span class="faint" style="font-size:12px" data-saved>已自動儲存</span><span class="timer">${icon('clock')}<span data-clock>${fmtClock(Date.now() - a.startedAt)}</span></span><button class="btn btn-text btn-sm" data-abandon>放棄重來</button></div>
        </div>
        <div class="stepper" role="list">${STEPS.map((n, i) => `<div role="listitem" class="st ${i + 1 < a.step ? 'done' : ''} ${i + 1 === a.step ? 'cur' : ''}" ${i + 1 < a.step ? `data-goto="${i + 1}"` : ''}><i>${i + 1 < a.step ? '✓' : i + 1}</i>${n}</div>`).join('')}</div>
        <div class="ws-grid"><div data-panel>${panel()}</div><div data-form>${stepForm()}</div></div>
      </div>`;
    }

    function triggerChange(root) {
      if (a.changeAt) return;
      a.changeAt = Date.now(); a._newChange = true; a.changeSeen = false;
      APP.store.log(a, 'change', '收到需求變更：' + t.change.subject);
      save();
      modal({
        title: '突發事件', dismissible: false,
        body: `<div class="px-event-h" style="margin:-16px -24px 16px">${px.sprite('bolt', { size: 44, cls: 'bolt-in' })}<div><div class="px px-33">突發事件！</div><small>${esc(t.boss.name)}（${esc(t.boss.title)}）剛剛來信</small></div></div>
          <div class="mail urgent"><div class="mail-subj">${esc(t.change.subject)}</div><div>${nl(t.change.body)}</div></div>
          <p class="muted mt12" style="font-size:13px">真實職場中，需求常常做到一半就改。調整的速度和品質，也是評分的一部分。</p>`,
        actions: [{ label: '收到，我會調整', cls: 'btn-primary', onClick: c => { a.changeSeen = true; save(); c(); rerender(root); } }],
        onOpen(bg) { bg.querySelector('.modal').classList.add('px-modal'); }
      });
    }

    function rerender(root) {
      $('[data-panel]', root).innerHTML = panel();
      $('[data-form]', root).innerHTML = stepForm();
      APP.ui.$$('.stepper', root)[0].outerHTML = `<div class="stepper" role="list">${STEPS.map((n, i) => `<div role="listitem" class="st ${i + 1 < a.step ? 'done' : ''} ${i + 1 === a.step ? 'cur' : ''}" ${i + 1 < a.step ? `data-goto="${i + 1}"` : ''}><i>${i + 1 < a.step ? '✓' : i + 1}</i>${n}</div>`).join('')}</div>`;
      a._newChange = false;
      armChange(root);
    }
    function armChange(root) {
      if (a.step === 3 && !a.changeAt && !timers.armed) {
        timers.armed = true;
        timers.push(setTimeout(() => triggerChange(root), CHANGE_AFTER_MS));
      }
    }
    function goStep(root, n) { a.step = n; APP.store.log(a, 'step', '進入步驟：' + STEPS[n - 1]); save(); rerender(root); window.scrollTo({ top: 0, behavior: window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }

    function validate() {
      const s = a.step;
      if (s === 1 && len(a.understanding.restate) < 6) return '請先用自己的話重述任務（至少一句）。';
      if (s === 2 && a.plan.filter(p => len(p.t) >= 4).length < 2) return '請至少寫出 2 個步驟。';
      if (s === 3) { const d = t.deliverables.find(d => len(a.answers[d.id]) < d.minLen); if (d) return `「${d.label}」還太短（至少 ${d.minLen} 字）。`; }
      if (s === 4) { if (len(a.review.change) < 6) return '請說明需求變更後你調整了什麼。'; if (!a.disclosure.used) return '請選擇 AI 使用揭露。'; }
      return '';
    }

    return {
      title: t.title,
      html: html(),
      mount(root) {
        timers.push(setInterval(() => { const c = $('[data-clock]', root); if (c) c.textContent = fmtClock(Date.now() - a.startedAt); }, 1000));
        armChange(root);
        root.addEventListener('click', e => {
          const el = e.target.closest('[data-tab],[data-flag],[data-ask],[data-clarify],[data-next],[data-prev],[data-goto],[data-add],[data-del],[data-unflag],[data-submit],[data-abandon]');
          if (!el) return;
          const d = el.dataset;
          const refocus = sel => { const n = root.querySelector(sel); if (n) n.focus({ preventScroll: true }); };
          if (d.tab) { tab = d.tab; if (tab === 'mail') a.changeSeen = true; $('[data-panel]', root).innerHTML = panel(); refocus(`[data-tab="${d.tab}"]`); return; }
          if (d.flag || d.unflag) {
            const k = d.flag || d.unflag; a.flags[k] = !a.flags[k];
            APP.store.log(a, 'flag', (a.flags[k] ? '標記可疑：' : '取消標記：') + flagLabel(t, k)); save();
            if (d.unflag) { $('[data-form]', root).innerHTML = stepForm(); }
            $('[data-panel]', root).innerHTML = panel();
            refocus(`[data-flag="${k}"]`);
            toast(a.flags[k] ? '已標記為可疑' : '已取消標記', a.flags[k] ? 'warn' : 'info', 1100);
            return;
          }
          if (d.ask) { a.aiLog.push({ id: d.ask, at: Date.now() }); APP.store.log(a, 'ai', '詢問 AI：' + t.ai.find(q => q.id === d.ask).q); save(); $('[data-panel]', root).innerHTML = panel(); const b = $('.panel-body', root); b.scrollTop = b.scrollHeight; return; }
          if ('clarify' in d) {
            if (APP.scoring.countQuestions(a.understanding.questions) < 1) { toast('請先寫下至少一個問題', 'warn'); return; }
            a.clarified = true; APP.store.log(a, 'ask', '向主管提出確認問題'); save();
            tab = 'mail'; rerender(root); toast(t.boss.name + ' 回信了', 'ok'); return;
          }
          if ('next' in d) { const m = validate(); if (m) { toast(m, 'warn'); el.closest('.card').classList.add('shake'); setTimeout(() => el.closest('.card') && el.closest('.card').classList.remove('shake'), 500); return; } if (a.step === 3 && !a.changeAt) { triggerChange(root); return; } goStep(root, a.step + 1); if (a.step === 3) { tab = 'table'; rerender(root); } return; }
          if ('prev' in d) { goStep(root, a.step - 1); return; }
          if (d.goto) { goStep(root, +d.goto); return; }
          if ('add' in d) { a.plan.push({ t: '', ai: false }); save(); $('[data-form]', root).innerHTML = stepForm(); return; }
          if (d.del) { a.plan.splice(+d.del, 1); if (!a.plan.length) a.plan.push({ t: '', ai: false }); save(); $('[data-form]', root).innerHTML = stepForm(); return; }
          if ('submit' in d) { a.step = 6; APP.store.log(a, 'submit', '送出成果，進入答辯'); save(); location.replace('#/defense/' + t.id); return; }
          if ('abandon' in d) modal({ title: '放棄這張工單？', body: '<p>作答內容會清除，可以重新接單。</p>', actions: [{ label: '繼續作答' }, { label: '放棄重來', cls: 'btn-primary', onClick: c => { c(); APP.store.resetAttempt(t.id); location.replace('#/task/' + t.id); } }] });
        });
        root.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('claim')) { e.preventDefault(); e.target.click(); } });
        root.addEventListener('input', e => {
          const el = e.target, d = el.dataset;
          if (d.bind) { const [o, k] = d.bind.split('.'); a[o][k] = el.value; }
          else if (d.ans) {
            a.answers[d.ans] = el.value;
            const dd = t.deliverables.find(x => x.id === d.ans); const c = $(`[data-cnt="${d.ans}"]`, root); if (c) c.innerHTML = cnt(dd);
            if (!a.changeAt && Object.values(a.answers).join('').length > 90) triggerChange(root);
          }
          else if (d.plan) a.plan[+d.plan].t = el.value;
          else return;
          autosave();
        });
        root.addEventListener('change', e => {
          const el = e.target;
          if (el.dataset.planai) { a.plan[+el.dataset.planai].ai = el.checked; save(); }
          if (el.name === 'aiu') { a.disclosure.used = el.value; save(); }
        });
      },
      unmount() { clearTimeout(saveT); timers.forEach(x => { clearTimeout(x); clearInterval(x); }); save(); }
    };
  };

  /* ======================================================== 答辯 */
  const LIMIT = 180000;
  V.defense = (id) => {
    const t = H.task(id);
    const a = t && APP.store.attempt(id);
    if (!a) return V.notFound();
    if (a.result) { setTimeout(() => location.replace('#/result/' + id)); return { html: '' }; }
    if (a.step < 6) { setTimeout(() => location.replace('#/work/' + id)); return { html: '' }; }
    if (!a.defense) {
      const flagged = Object.keys(a.flags).filter(k => a.flags[k]);
      const pick = flagged.length ? flagged[Math.floor(Math.random() * flagged.length)] : null;
      a.defense = {
        qs: [
          t.defense[Math.floor(Math.random() * t.defense.length)],
          pick ? `你標記了「${flagLabel(t, pick).replace(/^.*?：/, '')}」有問題。如果主管說「那個沒錯，照用就好」，你會怎麼回應？` : '這份資料裡，你認為最可能出錯的地方在哪裡？你怎麼確認它沒問題？',
          '這份成果裡，哪些部分是 AI 產生的？如果那部分錯了，誰要負責？你做了什麼確保它是對的？'
        ],
        answers: ['', '', ''], over: [false, false, false], idx: 0, qStart: Date.now(), startedAt: Date.now()
      };
      APP.store.log(a, 'defense', '開始答辯'); APP.store.save();
    }
    const D = a.defense;
    let iv;
    const html = () => {
      const i = D.idx;
      return `<div class="wrap wrap-narrow page">
        <div class="row-between"><div><div class="eyebrow">${t.code}・成果答辯</div><h1 class="mt8" style="font-size:22px">${esc(t.title)}</h1></div><div class="dots">${D.qs.map((_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div></div>
        <div class="examiner mt24"><div class="avatar">職</div><div><b>職人答辯官・王經理</b>（模擬）<div class="faint" style="font-size:12.5px">原型以文字作答。正式版為 15 分鐘視訊答辯，由資深與退休職人依你的成果追問。</div></div></div>
        <div class="card card-pad mt16">
          <div class="def-meta"><span class="eyebrow">第 ${i + 1} 題 / 共 ${D.qs.length} 題</span><div class="ring" data-ring><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="27" fill="none" stroke="var(--paper-2)" stroke-width="6"/><circle data-arc cx="32" cy="32" r="27" fill="none" stroke="var(--ink)" stroke-width="6" stroke-linecap="round" stroke-dasharray="169.6" stroke-dashoffset="0"/></svg><span data-left>3:00</span></div></div>
          <div class="def-q">${esc(D.qs[i])}</div>
          <textarea class="textarea" style="min-height:170px" data-def placeholder="說明你的判斷依據。引用具體數字會更有說服力。">${esc(D.answers[i])}</textarea>
          <div class="hint"><span>建議 3 分鐘內作答；超時不扣分，只會記錄。</span><span data-dc>${len(D.answers[i])} 字</span></div>
          <div class="ws-actions"><span></span><button class="${i === D.qs.length - 1 ? 'px-btn' : 'btn btn-primary'}" data-dnext>${i === D.qs.length - 1 ? '完成答辯，查看結果 ▶' : '下一題 ' + icon('arrowRight')}</button></div>
        </div>
      </div>`;
    };
    const tick = root => {
      const used = Date.now() - D.qStart, left = LIMIT - used;
      const l = $('[data-left]', root), arc = $('[data-arc]', root), ring = $('[data-ring]', root);
      if (!l) return;
      const s = Math.ceil(Math.abs(left) / 1000);
      l.textContent = (left < 0 ? '+' : '') + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
      arc.setAttribute('stroke-dashoffset', String(169.6 * Math.min(1, used / LIMIT)));
      if (left < 0) { ring.classList.add('over'); arc.setAttribute('stroke', 'var(--red)'); D.over[D.idx] = true; }
    };
    return {
      title: '答辯',
      html: html(),
      mount(root) {
        tick(root); iv = setInterval(() => tick(root), 500);
        root.addEventListener('input', e => { if (e.target.dataset.def !== undefined) { D.answers[D.idx] = e.target.value; $('[data-dc]', root).textContent = len(e.target.value) + ' 字'; APP.store.save(); } });
        root.addEventListener('click', e => {
          const nb = e.target.closest('[data-dnext]');
          if (!nb || nb.disabled || a.result) return;
          if (len(D.answers[D.idx]) < 8) { toast('請至少回答一兩句', 'warn'); return; }
          APP.store.log(a, 'answer', `回答第 ${D.idx + 1} 題${D.over[D.idx] ? '（超時）' : ''}`);
          if (D.idx < D.qs.length - 1) { D.idx++; D.qStart = Date.now(); APP.store.save(); root.innerHTML = html(); tick(root); $('[data-def]', root).focus(); return; }
          nb.disabled = true;
          D.endAt = Date.now();
          finish(t, a);
          location.replace('#/result/' + t.id);
        });
      },
      unmount() { clearInterval(iv); }
    };
  };

  function finish(t, a) {
    if (a.result) return;
    const s = APP.store.get();
    const before = level(s.xp);
    const r = APP.scoring.compute(t, a);
    if (a.practice) { r.practice = true; r.xp = 20; }
    a.result = r; a.status = 'done';
    APP.store.log(a, 'done', `完成答辯，總分 ${r.total}（${r.grade}）`);
    s.xp += r.xp;
    r.levelUp = level(s.xp).lv > before.lv ? level(s.xp).n : null;
    if (r.grade !== 'C' && !a.practice) {
      s.issued = s.issued || [];
      s.issued.push({ vid: r.vid, id: t.id, grade: r.grade, total: r.total, at: r.at, dims: r.dims, found: r.found, qn: r.qn, changeHits: r.changeHits, ai: !!(a.disclosure.used && a.disclosure.used !== 'none') });
    }
    if (APP.squad) APP.squad.onComplete(t, r);
    APP.store.save();
  }
  APP.finishAttempt = finish;

  APP.redo = (id) => {
    const s = APP.store.get(); const prev = s.attempts[id];
    if (prev && prev.result && prev.result.grade !== 'C' && !prev.practice) {
      s.best = s.best || {};
      if (!s.best[id] || s.best[id].result.total < prev.result.total) s.best[id] = JSON.parse(JSON.stringify(prev));
    }
    APP.store.resetAttempt(id); APP.store.ensureAttempt(id).practice = false; APP.store.save(); location.replace('#/work/' + id);
  };

  /* ======================================================== 結果 */
  V.result = (id) => {
    const t = H.task(id);
    const a = t && APP.store.attempt(id);
    if (!a || !a.result) return V.notFound();
    const r = a.result, s = APP.store.get();
    const avg = APP.CANDIDATES.reduce((acc, c) => c.dims.map((v, i) => acc[i] + v), [0, 0, 0, 0, 0]).map(v => Math.round(v / APP.CANDIDATES.length * .92));
    const fb = APP.scoring.feedback(t, r);
    const stars = [[6, 18], [14, 70], [42, 12], [58, 76], [74, 22], [88, 64]];
    const evCls = { change: 'warn', flag: 'bad', done: 'ok', submit: 'ok', ask: 'ok' };
    const lv = level(s.xp);
    const showPost = s.anxiety.pre && !s.anxiety.post;
    const tipDone = (s.tips || []).some(x => x.task === id);
    const pass = r.grade !== 'C' && !a.practice;
    return {
      title: '工單完成',
      html: `<div class="wrap page">
        <div class="clear-banner px-edge">${px.skyline()}
          <div class="float-stars">${stars.map(([x, y], i) => `<span style="left:${x}%;top:${y}%;animation-delay:${i * .25}s">${px.sprite('star', { size: 16 + (i % 3) * 6 })}</span>`).join('')}</div>
          <div class="clear-in">
            <div><div class="eyebrow" style="color:#ffc93c">${t.code}・QUEST CLEAR</div><h1 class="px px-44 mt8">${a.practice ? '練習完成！' : pass ? '工單完成！' : '差一點！'}</h1><p>${esc(t.title)}</p>
              <div class="row mt16">${r.badges.map(b => `<span title="${esc(APP.BADGES[b].n)}">${px.sprite(APP.px.BADGE_SPRITE[b], { size: 30 })}</span>`).join('')}</div></div>
            <div class="clear-score"><span class="stamp stamp-in ${pass ? '' : 'red'}" style="color:${pass ? '#7fe0c9' : a.practice ? '#ffc93c' : '#ff8a8a'};margin-bottom:14px">${a.practice ? '練習' : r.grade === 'C' ? '再挑戰' : '已驗證'}<b>${r.grade} 級</b></span><div class="num">${r.total}</div><div class="xpg px px-22">+${r.xp} XP${r.levelUp ? ` <span class="lvup">LEVEL UP！</span>` : ''}</div></div>
          </div>
        </div>

        <div class="result-hero mt32">
          <div class="card card-pad">
            <div class="row-between"><h3 style="font-size:17px">五力表現</h3><span class="faint" style="font-size:12.5px">原型：透明規則自動評分｜正式版：AI 初評＋職人複核</span></div>
            <div class="grid g2 mt16" style="align-items:center">
              <div>${APP.ui.radar(r.dims, { compare: avg })}</div>
              <div>${APP.DIMS.map((d, i) => `<div class="dimbar"><span>${d.n}</span><div class="track"><div class="fill" style="width:${r.dims[i]}%"></div></div><b>${r.dims[i]}</b></div>`).join('')}</div>
            </div>
          </div>
          <div class="card card-pad">
            <h3 style="font-size:17px">${pass ? '已寫入你的工單履歷' : a.practice ? '練習模式：不寫入工單履歷' : '尚未達到核發標準'}</h3>
            ${pass ? '' : a.practice ? `<div class="callout info mt12">${icon('info')}<div>這次是練習，成績只有你看得到。準備好了，可以用正式模式挑戰同一情境的變體工單。</div></div>` : `<div class="callout warn mt12">${icon('info')}<div>B 級以上才會核發工單履歷。這次的紀錄只有你看得到；看完下方的錯誤解析後，可以挑戰同一情境的變體工單。</div></div>`}
            ${pass ? `<div class="verify-box mt16"><div class="qr">${APP.ui.fingerprint(r.vid)}</div><div><div class="mono" style="font-weight:700">${r.vid}</div><div class="faint" style="font-size:12.5px">完成於 ${APP.ui.fmtDate(r.at)}・用時 ${APP.ui.fmtDur(r.duration)}</div><div class="faint" style="font-size:12.5px">企業可用驗證碼查核成果與答辯紀錄</div></div></div>` : `<div class="verify-box mt16"><div><div class="faint" style="font-size:12.5px">完成於 ${APP.ui.fmtDate(r.at)}・用時 ${APP.ui.fmtDur(r.duration)}</div><div class="faint" style="font-size:12.5px">${a.practice ? '練習紀錄' : '未達核發標準'}，不核發驗證碼。</div></div></div>`}
            <div class="mt16"><div class="row-between" style="font-size:13px"><b>LV.${lv.lv} ${esc(lv.n)}</b><span class="mono faint">${s.xp}${lv.next ? ' / ' + lv.next : ''} XP</span></div><div class="mt8">${px.xpBar(lv.pct, 24).replace('px-xp', 'px-xp light')}</div></div>
            <div class="row mt24">${pass ? `<a class="btn btn-primary" href="#/portfolio">${icon('doc')}查看工單履歷</a>` : `<button class="btn btn-primary" data-redo>${icon('refresh')}${a.practice ? '正式挑戰變體工單' : '挑戰變體工單'}</button>`}<a class="btn btn-ghost" href="#/tasks">回公會大廳</a></div>
          </div>
        </div>

        ${showPost ? `<div class="card card-pad mt24" data-post><div class="row-between"><div><b>完成這張工單後，你現在對找工作的焦慮程度？</b><div class="faint" style="font-size:12.5px">1 = 幾乎不焦慮，5 = 非常焦慮。開始前你填的是 ${s.anxiety.pre}。這是市府評估政策成效的指標之一。</div></div>
          <div class="scale" style="min-width:260px">${[1, 2, 3, 4, 5].map(n => `<label><input type="radio" name="post" value="${n}"><span>${n}</span></label>`).join('')}</div></div></div>` : ''}

        <div class="grid g2 mt24" style="align-items:start">
          <div class="card card-pad">
            <h3 style="font-size:17px">埋設錯誤解析</h3>
            <p class="faint mt8" style="font-size:12.5px">正式版每人拿到的錯誤位置不同（變體工單），解析不會外流。</p>
            <div class="checklist mt16">${t.errors.map(e => { const ok = r.found.includes(e.key); return `<div class="ci ${ok ? 'ok' : 'no'}">${icon(ok ? 'check' : 'x')}<div><b>${esc(e.label)}</b><small>${esc(e.why)}</small></div></div>`; }).join('')}
            ${r.falses.length ? `<div class="ci mid">${icon('alert')}<div><b>誤報 ${r.falses.length} 處</b><small>${r.falses.map(k => esc(flagLabel(t, k))).join('、')}</small></div></div>` : ''}</div>
            <h3 class="mt24" style="font-size:17px">流程檢核</h3>
            <div class="checklist mt12">
              ${ci(r.qn >= 2, `開工前提出 ${r.qn} 個確認問題`, r.qn >= 2 ? '主管補充了沒寫在交辦裡的限制' : '問題太少，可能漏掉隱藏限制')}
              ${ci(r.hidden >= 1, '成果反映主管補充的限制', r.hidden >= 1 ? `命中 ${r.hidden} 項` : '沒有反映主管回覆中的限制')}
              ${ci(r.changeHits >= 2, '需求變更已反映在成果中', r.changeHits >= 2 ? '調整具體' : '成果調整不足')}
              ${ci(a.disclosure.used && a.disclosure.used !== 'none' && len(a.disclosure.how) >= 15, 'AI 使用揭露完整', a.disclosure.used === 'none' ? '自述未使用 AI' : '說明使用方式與驗證方法')}
              ${ci(!r.overtime, '答辯在時限內完成', r.overtime ? `${r.overtime} 題超時` : '三題皆在 3 分鐘內')}
            </div>
          </div>
          <div class="stack" style="--gap:24px">
            <div class="card card-pad"><h3 style="font-size:17px">職人答辯官回饋</h3><div class="mt16">${fb.map(f => `<div class="feedback"><b>${f.k}</b><p>${esc(f.t)}</p></div>`).join('')}</div></div>
            <div class="card card-pad"><h3 style="font-size:17px">過程紀錄</h3><p class="faint mt8" style="font-size:12.5px">完整保留作答歷程，是防代做的證據之一。</p>
              <div class="timeline mt12">${a.events.slice(-12).map(ev => `<div class="tl ${evCls[ev.type] || ''}"><time>${fmtTime(ev.t)}</time>${esc(ev.msg)}</div>`).join('')}</div></div>
          </div>
        </div>

        <div class="px-card px-panel mt32">
          <div class="row-between"><div><h4 class="px px-22">${px.sprite('scroll', { size: 22 })}留一則解題心得給後來的人</h4><p class="muted mt8" style="font-size:13.5px">工單輪替後，心得會匿名收進市府案例庫。被標為「有幫助」越多，你的「領航員」積分越高，也會顯示在工單履歷上，證明你能帶人。</p></div></div>
          ${tipDone ? `<div class="callout ok mt12">${icon('check')}<div>已送出，感謝你！+20 XP</div></div>` : `<textarea class="textarea mt12" data-tip placeholder="例：先檢查每一列數字的合理範圍，再讓 AI 計算；AI 給的成本數字一定要自己驗算。"></textarea><button class="px-btn sm mt12" data-tipsend>送出心得 +20 XP</button>`}
        </div>
      </div>`,
      mount(root) {
        APP.ui.mountTips(root);
        root.addEventListener('change', e => { if (e.target.name === 'post') { s.anxiety.post = +e.target.value; APP.store.save(); toast('謝謝你的回饋', 'ok'); const p = $('[data-post]', root); p && p.remove(); } });
        root.addEventListener('click', e => {
          if (e.target.closest('[data-redo]')) { APP.redo(id); return; }
          if (!e.target.closest('[data-tipsend]')) return;
          const v = $('[data-tip]', root).value.trim();
          if (len(v) < 10) { toast('多寫一點點吧（至少 10 字）', 'warn'); return; }
          s.tips = s.tips || []; s.tips.push({ task: id, text: v, at: Date.now() }); s.xp += 20; APP.store.save();
          toast('已送出心得 +20 XP', 'ok'); APP.render();
        });
      }
    };
  };
  function ci(ok, title, sub) { return `<div class="ci ${ok ? 'ok' : 'no'}">${icon(ok ? 'check' : 'x')}<div><b>${esc(title)}</b><small>${esc(sub)}</small></div></div>`; }
})();
