/* 本機儲存：只存在這台裝置的瀏覽器，不上傳任何伺服器 */
(function () {
  const KEY = 'shadowtask.v1';
  let mem = null;

  function fresh() {
    return {
      user: { name: '', school: '', who: '', visible: true, blind: true, createdAt: Date.now() },
      onboarded: false,
      anxiety: { pre: null, post: null },
      attempts: {},
      xp: 0,
      invites: [],
      postedTasks: [],
      tips: [],
      learn: {}
    };
  }

  function load() {
    if (mem) return mem;
    try { mem = JSON.parse(localStorage.getItem(KEY)); } catch (e) { mem = null; }
    if (!mem || typeof mem !== 'object' || Array.isArray(mem)) mem = fresh();
    mem = sanitize(mem);
    return mem;
  }

  // 載入時修正資料結構，避免舊版或損毀資料讓頁面出錯
  function sanitize(m) {
    const f = fresh();
    const obj = v => v && typeof v === 'object' && !Array.isArray(v);
    const out = Object.assign(f, m);
    out.user = Object.assign(fresh().user, obj(m.user) ? m.user : {});
    out.anxiety = Object.assign({ pre: null, post: null }, obj(m.anxiety) ? m.anxiety : {});
    ['invites', 'postedTasks', 'tips', 'referrals', 'issued'].forEach(k => { if (!Array.isArray(out[k])) out[k] = []; });
    ['learn', 'pubHidden', 'reviews', 'best'].forEach(k => { if (!obj(out[k])) out[k] = {}; });
    out.xp = Number.isFinite(out.xp) ? out.xp : 0;
    const ok = id => (APP.TASKS || []).some(t => t.id === id && t.status === 'open');
    const att = obj(m.attempts) ? m.attempts : {};
    out.attempts = {};
    Object.keys(att).forEach(id => {
      const a = att[id];
      if (!ok(id) || !obj(a) || !obj(a.understanding) || !obj(a.answers) || !obj(a.flags) || !Array.isArray(a.plan) || !Array.isArray(a.events) || !Array.isArray(a.aiLog) || !obj(a.review) || !obj(a.disclosure)) return;
      if (a.result && (!obj(a.result) || !Array.isArray(a.result.dims) || !Array.isArray(a.result.found) || !Array.isArray(a.result.badges))) return;
      out.attempts[id] = a;
    });
    Object.keys(out.best).forEach(id => { const b = out.best[id]; if (!ok(id) || !obj(b) || !obj(b.result) || !Array.isArray(b.result.dims)) delete out.best[id]; });
    if (out.squad && (!obj(out.squad) || !Array.isArray(out.squad.members))) out.squad = null;
    return out;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* 私密模式等情況：只保留在記憶體 */ }
  }

  if (typeof addEventListener === 'function') {
    // 補存工作台尚在 350ms debounce 內的輸入。唯讀頁與短體驗不改寫舊存檔。
    const flushWork = () => { if (mem && /^#\/(work|defense)\//.test(location.hash)) save(); };
    addEventListener('pagehide', flushWork);
    addEventListener('beforeunload', flushWork);
  }

  APP.store = {
    get: load,
    save,
    reset(persist = true) { mem = fresh(); if (persist) save(); },
    attempt(id) { return load().attempts[id] || null; },
    ensureAttempt(id) {
      const s = load();
      if (!s.attempts[id]) {
        s.attempts[id] = {
          status: 'working', step: 1, startedAt: Date.now(), events: [],
          understanding: { restate: '', questions: '' }, clarified: false,
          plan: [{ t: '', ai: false }, { t: '', ai: false }, { t: '', ai: false }],
          answers: {}, flags: {}, aiLog: [], changeAt: null, changeSeen: false,
          review: { verify: '', change: '', other: '' }, disclosure: { used: '', how: '' },
          defense: null, result: null
        };
        save();
      }
      return s.attempts[id];
    },
    resetAttempt(id) { const s = load(); delete s.attempts[id]; save(); },
    log(a, type, msg) { a.events.push({ t: Date.now(), type, msg }); },
    completed() {
      const s = load();
      return Object.entries(s.attempts).filter(([, a]) => a.result).map(([id, a]) => ({ id, a }))
        .sort((x, y) => y.a.result.at - x.a.result.at);
    }
  };

  /* 主題 */
  APP.theme = {
    get() { try { return localStorage.getItem('shadowtask.theme') || ''; } catch (e) { return ''; } },
    set(v) {
      try { v ? localStorage.setItem('shadowtask.theme', v) : localStorage.removeItem('shadowtask.theme'); } catch (e) {}
      if (v) document.documentElement.setAttribute('data-theme', v); else document.documentElement.removeAttribute('data-theme');
    },
    effective() {
      const v = document.documentElement.getAttribute('data-theme') || this.get();
      if (v) return v;
      return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
  };
  const t = APP.theme.get();
  if (t) document.documentElement.setAttribute('data-theme', t);
})();
