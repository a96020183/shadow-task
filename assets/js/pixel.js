/* 像素素材：sprite 轉 SVG（合併水平像素以減少節點）、臺北天際線產生器 */
(function () {
  const PAL = {
    k: '#1b1b22', y: '#ffc93c', o: '#f08a24', w: '#ffffff', s: '#f5c9a0', h: '#3b2a20',
    b: '#2a78d6', t: '#1baf7a', r: '#e34948', g: '#9aa0a6', p: '#f4e6c4', n: '#8a5a2b',
    v: '#1c3f7a', d: '#1c3f7a', l: '#86b6ef', m: '#d9d4c7'
  };

  const S = {
    hero: [
      '................',
      '....kkkkkkkk....',
      '...khhhhhhhhk...',
      '...khhhhhhhhk...',
      '...khsssssshk...',
      '...kskssssksk...',
      '...kssssssssk...',
      '...ksssrrsssk...',
      '....kssssssk....',
      '...kyyyyyyyyk...',
      '..kbbbyybbbbbk..',
      '.ksbbbbbbbbbbsk.',
      '.kskbbbbbbbbksk.',
      '...kddddddddk...',
      '...kddk..kddk...',
      '...kkkk..kkkk...'
    ],
    coin: [
      '..kkkkkk..',
      '.kyyyyyyk.',
      'kyywyyyyok',
      'kywyyyyyok',
      'kyyyyyyyok',
      'kyyyyyyyok',
      'kyyyyyyook',
      '.kyoooook.',
      '..kkkkkk..'
    ],
    scroll: [
      '.kkkkkkkkkk.',
      'knppppppppnk',
      '.kppppppppk.',
      '.kpkkkkkkpk.',
      '.kppppppppk.',
      '.kpkkkkkppk.',
      '.kppppppppk.',
      '.kpkkkkkkpk.',
      '.kppppppppk.',
      '.kpppppprrk.',
      'knpppppprrnk',
      '.kkkkkkkkkk.'
    ],
    glass: [
      '...kkkkk....',
      '..kwlllllk..',
      '.kwllllllk..',
      '.klllllllk..',
      '.klllllllk..',
      '.klllllllk..',
      '..klllllk...',
      '...kkkkkkk..',
      '........knk.',
      '.........knk',
      '..........kk'
    ],
    bolt: [
      '.....kkkk.',
      '....kyyyk.',
      '...kyyyk..',
      '..kyyyk...',
      '.kyyyykkk.',
      'kyyyyyyyk.',
      'kkkkyyyk..',
      '...kyyk...',
      '..kyyk....',
      '.kyyk.....',
      '.kkk......'
    ],
    bubble: [
      '.kkkkkkkkk.',
      'kwwwwwwwwwk',
      'kwwwwwwwwwk',
      'kwkkwkkwwwk',
      'kwwwwwwwwwk',
      '.kkkwkkkkk.',
      '...kwk.....',
      '...kk......'
    ],
    gem: [
      '..kkkkk..',
      '.kbwlbbk.',
      'kbwllbbbk',
      'klllbbbdk',
      '.kbbbbdk.',
      '..kbbdk..',
      '...kdk...',
      '....k....'
    ],
    glassHour: [
      'kkkkkkkk',
      'knnnnnnk',
      '.kyyyyk.',
      '..kyyk..',
      '...kk...',
      '..kwwk..',
      '.kwyywk.',
      'knnnnnnk',
      'kkkkkkkk'
    ],
    star: [
      '.....k.....',
      '....kyk....',
      '....kyk....',
      'kkkkyyykkkk',
      '.kyyyyyyyk.',
      '..kyyyyyk..',
      '..kyykyyk..',
      '.kyyk.kyyk.',
      '.kkk...kkk.'
    ],
    lock: [
      '..kkkk..',
      '.kgggk..',
      '.kk..kk.',
      '.k....k.',
      'kkkkkkkk',
      'kyyyyyyk',
      'kyyykyyk',
      'kyyykyyk',
      'kyyyyyyk',
      'kkkkkkkk'
    ],
    chest: [
      '.kkkkkkkkkk.',
      'knnnnnnnnnnk',
      'knyyyyyyyynk',
      'kkkkkyykkkkk',
      'knnnnkknnnnk',
      'knnnnnnnnnnk',
      'knyyyyyyyynk',
      'kkkkkkkkkkkk'
    ],
    shield: [
      'kkkkkkkkkk',
      'kttttttttk',
      'kttttttwtk',
      'ktttttwttk',
      'ktwttwtttk',
      'kttwwttttk',
      '.kttwtttk.',
      '.kttttttk.',
      '..kttttk..',
      '...kttk...',
      '....kk....'
    ],
    sword: [
      '.........kk',
      '........kwk',
      '.......kwgk',
      '......kwgk.',
      '.....kwgk..',
      '..k.kwgk...',
      '..kkwgk....',
      '...kkk.....',
      '..kyk.k....',
      '.kyk...k...',
      'kkk........'
    ],
    flagp: [
      'kk........',
      'krrrrrk...',
      'krrrrrrk..',
      'krrrrrk...',
      'krrrk.....',
      'kk........',
      'kk........',
      'kk........',
      'kk........',
      'kk........'
    ]
  };

  const HAIR = ['#3b2a20', '#1d1d24', '#7a4a1e', '#5a3a8a', '#b5532c', '#2f4a6b'];
  const CLOTH = ['#2a78d6', '#1baf7a', '#e34948', '#6b55d6', '#f08a24', '#1c3f7a'];

  function sprite(name, opts = {}) {
    const rows = S[name] || S.star;
    const pal = Object.assign({}, PAL, opts.pal || {});
    const w = Math.max(...rows.map(r => r.length)), h = rows.length;
    let out = '';
    rows.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        const c = row[x];
        if (c === '.' || !pal[c]) { x++; continue; }
        let e = x; while (e < row.length && row[e] === c) e++;
        out += `<rect x="${x}" y="${y}" width="${e - x}" height="1" fill="${pal[c]}"/>`;
        x = e;
      }
    });
    const size = opts.size || w * 3;
    return `<svg class="px-sprite ${opts.cls || ''}" viewBox="0 0 ${w} ${h}" width="${size}" height="${Math.round(size * h / w)}" shape-rendering="crispEdges" aria-hidden="true">${out}</svg>`;
  }

  function avatar(seed, size = 64) {
    const hsh = parseInt(APP.ui.hash(seed || 'guest').slice(0, 6), 16);
    return sprite('hero', { size, pal: { h: HAIR[hsh % HAIR.length], b: CLOTH[(hsh >> 4) % CLOTH.length] } });
  }

  const BADGE_SPRITE = { bug: 'glass', pivot: 'bolt', ask: 'bubble', open: 'gem', calm: 'glassHour' };

  /* 臺北天際線：夜空、象山、樓群、臺北 101（像素） */
  function skyline() {
    const W = 240, H = 64;
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const R = (x, y, w, h, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
    let g = '';
    const sky = Array.from({ length: 6 }, (_, i) => `var(--sky-${i + 1})`);
    sky.forEach((c, i) => { g += R(0, i * 9, W, 10, c); });
    for (let i = 0; i < 46; i++) { const x = Math.floor(rnd() * W), y = Math.floor(rnd() * 30); g += R(x, y, 1, 1, rnd() > .8 ? 'var(--sky-orb)' : 'var(--sky-star)'); }
    g += R(28, 8, 6, 6, 'var(--sky-orb)') + R(27, 9, 8, 4, 'var(--sky-orb)') + R(29, 7, 4, 8, 'var(--sky-orb)');
    // 象山
    for (let x = 0; x < W; x++) {
      const hgt = Math.max(0, Math.round(16 + 7 * Math.sin(x / 19) + 4 * Math.sin(x / 7.3 + 1)));
      g += R(x, H - hgt - 14, 1, hgt + 14, 'var(--sky-mountain)');
    }
    // 樓群
    let x = 0;
    while (x < W) {
      const bw = 6 + Math.floor(rnd() * 10), bh = 10 + Math.floor(rnd() * 22);
      if (x > 137 && x < 164) { x += bw; continue; }
      const col = rnd() > .5 ? 'var(--sky-building)' : 'var(--sky-building-alt)';
      g += R(x, H - bh, bw, bh, col);
      for (let wy = H - bh + 2; wy < H - 2; wy += 3) for (let wx = x + 1; wx < x + bw - 1; wx += 2) if (rnd() > .62) g += R(wx, wy, 1, 1, rnd() > .25 ? 'var(--sky-window)' : 'var(--sky-window-alt)');
      x += bw + (rnd() > .7 ? 1 : 0);
    }
    // 臺北 101
    const cx = 150, ink = 'var(--sky-tower)', glass = 'var(--sky-glass)', lit = 'var(--sky-lit)';
    g += R(cx - 9, H - 8, 19, 8, ink);
    let y = H - 8;
    for (let seg = 0; seg < 8; seg++) {
      for (let j = 0; j < 4; j++) {
        const w = 7 + (j >= 2 ? 2 : 0) + (j === 3 ? 1 : 0);
        y -= 1; g += R(cx - Math.floor(w / 2), y, w, 1, j === 3 ? glass : ink);
        if (j === 1) g += R(cx - 2, y, 1, 1, lit) + R(cx + 2, y, 1, 1, lit);
      }
    }
    g += R(cx - 3, y - 4, 7, 4, ink) + R(cx - 1, y - 7, 3, 3, ink) + R(cx, y - 15, 1, 8, '#9fb0d8') + R(cx, y - 16, 1, 1, '#e34948');
    g += R(0, H - 2, W, 2, 'var(--sky-tower)');
    [[148,29],[152,37],[148,45],[42,53]].forEach(([wx,wy],i) => { g += `<rect class="sky-window" style="--window-delay:${i * 700}ms" x="${wx}" y="${wy}" width="1" height="1" fill="#ffc93c"/>`; });
    return `<svg class="px-skyline" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" shape-rendering="crispEdges" aria-hidden="true">${g}</svg>`;
  }

  function xpBar(pct, blocks = 20) {
    const on = Math.round(Math.max(0, Math.min(1, pct)) * blocks);
    return `<div class="px-xp" role="progressbar" aria-valuenow="${Math.round(pct * 100)}" aria-valuemin="0" aria-valuemax="100">${Array.from({ length: blocks }, (_, i) => `<i class="${i < on ? 'on' : ''}"></i>`).join('')}</div>`;
  }

  const blindAvatar = () => '<svg class="px-sprite blind-avatar" viewBox="0 0 16 16" width="32" height="32" shape-rendering="crispEdges" aria-hidden="true"><path fill="var(--ink)" d="M5 1h6v2h2v7h-2v2h3v3H2v-3h3v-2H3V3h2z"/><path fill="var(--paper)" d="M6 3h4v1h1v3H9v2H7V6h2V5H7v1H5V4h1zM7 10h2v2H7z"/></svg>';
  APP.px = { blindAvatar, sprite, avatar, skyline, xpBar, BADGE_SPRITE };
})();
