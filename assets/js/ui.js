/* UI 工具：escape、圖示、modal、toast、圖表 */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nl = s => esc(s).replace(/\n/g, '<br>');
  const len = s => (s || '').replace(/\s/g, '').length;
  const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const P = {
    arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    arrowLeft: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    flag: '<path d="M5 21V4"/><path d="M5 4h12l-2.5 4.5L17 13H5"/>',
    spark: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/>',
    doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    building: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1M10 21v-3h4v3"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 13.5a7 7 0 0 1 4 6.5"/>',
    chart: '<path d="M3 3v18h18"/><path d="M8 17v-6M13 17V7M18 17v-4"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    shuffle: '<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
    chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V4h6v3"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
    mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v4"/>',
    alert: '<path d="M12 3 2 21h20z"/><path d="M12 10v4M12 18h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
    print: '<path d="M6 9V2h12v7"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v8H6z"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.5-1.5"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
    cap: '<path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5M22 9v6"/>',
    send: '<path d="m22 2-11 11M22 2l-7 20-4-9-9-4z"/>',
    ticket: '<path d="M3 8V6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2a2 2 0 0 0 0 4v2 2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4a2 2 0 0 0 0-4z"/><path d="M14 5v2M14 11v2M14 17v2"/>',
    loop: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
    scale: '<path d="M12 3v18M5 21h14M3 7h18M6 7l-3 7a3 3 0 0 0 6 0zM18 7l-3 7a3 3 0 0 0 6 0z"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v9H5v-9M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6z"/>'
  };
  function icon(name, cls) {
    return `<svg class="${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
  }

  const LOGO = `<svg class="brand-mark" viewBox="0 0 40 40" aria-hidden="true">
    <rect x="3" y="7" width="30" height="24" rx="5" fill="var(--ink)" transform="rotate(-6 18 19)" opacity=".18"/>
    <path d="M7 9h26a2 2 0 0 1 2 2v4a3 3 0 0 0 0 6v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-4a3 3 0 0 0 0-6v-4a2 2 0 0 1 2-2z" fill="var(--accent)"/>
    <path d="M26 9v18" stroke="var(--accent-ink)" stroke-width="1.6" stroke-dasharray="2.4 2.4"/>
    <path d="m11 18 3.2 3.2L21 14.5" fill="none" stroke="var(--accent-ink)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

  /* ---------- toast & modal ---------- */
  function toast(msg, type = 'ok', ms = 2800) {
    let box = $('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); document.body.appendChild(box); }
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = icon(type === 'ok' ? 'check' : type === 'warn' ? 'alert' : type === 'bad' ? 'x' : 'info') + `<span>${esc(msg)}</span>`;
    box.appendChild(el);
    while (box.children.length > 3) box.firstElementChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 260); }, ms);
  }

  function modal({ title, body, actions = [], wide = false, dismissible = true, onOpen }) {
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="modal-h"><h3>${esc(title)}</h3>${dismissible ? `<button class="icon-btn" data-x aria-label="關閉">${icon('x')}</button>` : ''}</div>
      <div class="modal-b">${body}</div>
      ${actions.length ? `<div class="modal-f">${actions.map((a, i) => `<button class="btn ${a.cls || 'btn-ghost'}" data-a="${i}">${a.label}</button>`).join('')}</div>` : ''}
    </div>`;
    const prevFocus = document.activeElement;
    const close = () => { bg.remove(); document.removeEventListener('keydown', onKey); prevFocus && prevFocus.focus && prevFocus.focus(); };
    const onKey = e => {
      if (e.key === 'Escape' && dismissible) return close();
      if (e.key === 'Tab') {
        const f = Array.from(bg.querySelectorAll('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])')).filter(x => !x.disabled && x.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        else if (!bg.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      }
    };
    bg.addEventListener('click', e => {
      if (e.target === bg && dismissible) return close();
      if (e.target.closest('[data-x]')) return close();
      const b = e.target.closest('[data-a]');
      if (b) { const a = actions[+b.dataset.a]; a.onClick ? a.onClick(close, bg) : close(); }
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(bg);
    const first = bg.querySelector('input, textarea, select, .modal-f .btn');
    first && first.focus();
    onOpen && onOpen(bg, close);
    return { close, el: bg };
  }

  /* ---------- 格式 ---------- */
  const pad = n => String(n).padStart(2, '0');
  function fmtClock(ms) { const s = Math.max(0, Math.floor(ms / 1000)); return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; }
  function fmtDur(ms) { const m = Math.round(ms / 60000); return m < 60 ? `${m} 分鐘` : `${Math.floor(m / 60)} 小時 ${m % 60} 分`; }
  function fmtDate(ts) { const d = new Date(ts); return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`; }
  function fmtTime(ts) { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
  function hash(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).toUpperCase().padStart(8, '0'); }
  function level(xp) {
    const L = APP.LEVELS; let i = 0;
    for (let k = 0; k < L.length; k++) if (xp >= L[k].min) i = k;
    const next = L[i + 1];
    return { lv: i + 1, n: L[i].n, next: next ? next.min : null, cur: L[i].min, pct: next ? (xp - L[i].min) / (next.min - L[i].min) : 1 };
  }

  /* 內容指紋（非 QR，僅視覺化驗證碼） */
  function fingerprint(seed) {
    const h = hash(seed) + hash(seed + '#') + hash('#' + seed);
    let bits = ''; for (const ch of h) bits += parseInt(ch, 16).toString(2).padStart(4, '0');
    let cells = '';
    const n = 7, s = 10;
    for (let y = 0; y < n; y++) for (let x = 0; x < 4; x++) {
      if (bits[y * 4 + x] === '1') {
        cells += `<rect x="${x * s}" y="${y * s}" width="${s}" height="${s}" rx="2"/>`;
        if (x < 3) cells += `<rect x="${(n - 1 - x) * s}" y="${y * s}" width="${s}" height="${s}" rx="2"/>`;
      }
    }
    return `<svg viewBox="0 0 70 70" fill="var(--ink)" aria-hidden="true">${cells}</svg>`;
  }

  /* ---------- 圖表 ---------- */
  // 一端圓角（資料端 4px），基準端方角
  function barPath(x, y, w, h, r, dir) {
    r = Math.min(r, w / 2, h / 2);
    if (h <= 0 || w <= 0) return '';
    if (dir === 'up') return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
    return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`;
  }

  function radar(values, { size = 300, compare = null, labels = APP.DIMS.map(d => d.n) } = {}) {
    const W = size + 90, cx = W / 2, cy = size / 2 + 6, R = size / 2 - 52, n = values.length;
    const pt = (i, v) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * R * v / 100, cy + Math.sin(a) * R * v / 100]; };
    let g = '';
    [25, 50, 75, 100].forEach(v => { g += `<polygon points="${labels.map((_, i) => pt(i, v).join(',')).join(' ')}" fill="none" stroke="var(--grid)" stroke-width="1"/>`; });
    labels.forEach((_, i) => { const [x, y] = pt(i, 100); g += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="var(--grid)" stroke-width="1"/>`; });
    const poly = (vals, color, name) => {
      const pts = vals.map((v, i) => pt(i, v));
      return `<polygon points="${pts.map(p => p.join(',')).join(' ')}" fill="${color}" fill-opacity=".1" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>` +
        pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="4.5" fill="${color}" stroke="var(--card)" stroke-width="2" data-tip="${esc(name)}・${esc(labels[i])}：${vals[i]}"/><circle cx="${p[0]}" cy="${p[1]}" r="12" fill="transparent" data-tip="${esc(name)}・${esc(labels[i])}：${vals[i]}"/>`).join('');
    };
    if (compare) g += poly(compare, 'var(--series-2)', '平台平均');
    g += poly(values, 'var(--series-1)', compare ? '你' : '分數');
    labels.forEach((l, i) => {
      const [x, y] = pt(i, 122);
      const anchor = Math.abs(x - cx) < 8 ? 'middle' : x > cx ? 'start' : 'end';
      g += `<text x="${x}" y="${y + 4}" text-anchor="${anchor}" font-size="12.5" font-weight="600" fill="var(--ink-2)">${esc(l)}</text>`;
      g += `<text x="${x}" y="${y + 20}" text-anchor="${anchor}" font-size="12" fill="var(--muted)" class="tnum">${values[i]}</text>`;
    });
    const leg = compare ? `<div class="legend" style="justify-content:center"><span><i style="background:var(--series-1)"></i>你</span><span><i style="background:var(--series-2)"></i>平台平均</span></div>` : '';
    return `<div class="chart-box"><svg viewBox="0 0 ${W} ${size + 12}" role="img" aria-label="五力雷達圖：${labels.map((l, i) => l + ' ' + values[i]).join('、')}">${g}</svg><div class="tip"></div>${leg}</div>`;
  }

  function columns(data, { h = 220, unit = '' } = {}) {
    const W = 560, padL = 44, padB = 28, padT = 22, max = Math.max(...data.map(d => d.v)) * 1.12;
    const step = (W - padL - 8) / data.length, bw = Math.min(24, step * .5);
    const nice = niceTicks(max);
    let g = '';
    nice.forEach(t => {
      const y = padT + (h - padT - padB) * (1 - t / nice[nice.length - 1]);
      g += `<line x1="${padL}" x2="${W}" y1="${y}" y2="${y}" stroke="var(--grid)" stroke-width="1"/><text x="${padL - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="var(--muted)" class="tnum">${t.toLocaleString()}</text>`;
    });
    const top = nice[nice.length - 1];
    data.forEach((d, i) => {
      const bh = (h - padT - padB) * d.v / top, x = padL + step * i + (step - bw) / 2, y = h - padB - bh;
      g += `<path d="${barPath(x, y, bw, bh, 4, 'up')}" fill="${i === data.length - 1 ? 'var(--teal)' : 'var(--ink)'}"/>`;
      g += `<rect x="${padL + step * i}" y="${padT}" width="${step}" height="${h - padT - padB}" fill="transparent" data-tip="${esc(d.n)}：${d.v.toLocaleString()}${unit}"/>`;
      g += `<text x="${x + bw / 2}" y="${h - 8}" text-anchor="middle" font-size="11.5" fill="var(--muted)">${esc(d.n)}</text>`;
      if (i === data.length - 1) g += `<text x="${x + bw / 2}" y="${y - 7}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)" class="tnum">${d.v.toLocaleString()}</text>`;
    });
    g += `<line x1="${padL}" x2="${W}" y1="${h - padB}" y2="${h - padB}" stroke="var(--axis)" stroke-width="1"/>`;
    return `<div class="chart-box"><svg viewBox="0 0 ${W} ${h}" role="img" aria-label="${data.map(d => d.n + ' ' + d.v).join('、')}">${g}</svg><div class="tip"></div></div>`;
  }

  function hbars(data, { unit = '' } = {}) {
    const max = Math.max(...data.map(d => d.v));
    return `<div class="chart-box">${data.map(d => `<div class="funnel-row" data-tip="${esc(d.n)}：${d.v.toLocaleString()}${unit}">
      <span>${esc(d.n)}</span><div><svg viewBox="0 0 100 24" preserveAspectRatio="none" style="width:100%;height:24px"><path d="${barPath(0, 0, Math.max(1.5, 100 * d.v / max), 24, 4, 'right')}" fill="var(--series-1)" vector-effect="non-scaling-stroke"/></svg></div><b>${d.v.toLocaleString()}</b></div>`).join('')}<div class="tip"></div></div>`;
  }

  function niceTicks(max) {
    const raw = max / 4, mag = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / mag;
    const st = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
    const out = []; for (let v = 0; v <= max + st * .01; v += st) out.push(Math.round(v));
    if (out[out.length - 1] < max) out.push(Math.round(out[out.length - 1] + st));
    return out;
  }

  function mountTips(root) {
    $$('.chart-box', root).forEach(box => {
      const tip = $('.tip', box); if (!tip) return;
      box.addEventListener('mousemove', e => {
        const t = e.target.closest('[data-tip]');
        if (!t || !box.contains(t)) { tip.classList.remove('show'); return; }
        const b = box.getBoundingClientRect();
        tip.textContent = t.dataset.tip;
        tip.style.left = (e.clientX - b.left) + 'px';
        tip.style.top = (e.clientY - b.top) + 'px';
        tip.classList.add('show');
      });
      box.addEventListener('mouseleave', () => tip.classList.remove('show'));
    });
  }

  function qrSVG(text) {
    if (typeof qrcode !== 'function') return '';
    const q = qrcode(0, 'M'); q.addData(text); q.make();
    const n = q.getModuleCount(); let d = '';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) d += `M${x + 4},${y + 4}h1v1h-1z`;
    return `<svg viewBox="0 0 ${n + 8} ${n + 8}" shape-rendering="crispEdges" role="img" aria-label="驗證 QR code"><rect width="${n + 8}" height="${n + 8}" fill="#fff"/><path d="${d}" fill="#15171c"/></svg>`;
  }
  const verifyURL = (vid, online = false) => (online || location.protocol === 'file:' ? 'https://a96020183.github.io/shadow-task/' : location.href.split('#')[0]) + '#/verify/' + encodeURIComponent(vid);

  APP.ui = { qrSVG, verifyURL, esc, nl, len, clamp, $, $$, icon, LOGO, toast, modal, fmtClock, fmtDur, fmtDate, fmtTime, hash, level, fingerprint, radar, columns, hbars, mountTips };
})();
