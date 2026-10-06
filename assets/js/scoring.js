/* 評分：原型以透明規則自動評分；正式版為「AI 初評 + 職人答辯官複核」 */
(function () {
  const { len, clamp } = APP.ui;
  const hits = (text, words) => (words || []).filter(w => text.includes(w)).length;
  const countQuestions = s => (s || '').split(/[\n？?]+/).map(x => x.trim()).filter(x => x.replace(/[\s\d.、)）(（-]/g, '').length >= 4).length;

  function deliverText(a) { return Object.values(a.answers || {}).join('\n'); }

  function compute(task, a) {
    const errKeys = task.errors.map(e => e.key);
    const neutral = task.neutral || [];
    const out = { checks: [], notes: {} };
    const dText = deliverText(a);

    /* 理解需求 */
    const restateLen = len(a.understanding.restate);
    const qn = countQuestions(a.understanding.questions);
    let u = restateLen >= 15 ? 35 : restateLen >= 6 ? 15 : 0;
    u += qn >= 2 ? 30 : qn === 1 ? 15 : 0;
    u += Math.min(15, hits(a.understanding.restate, task.keyTerms) * 5);
    const hidden = hits(dText, task.clarify.keywords);
    u += a.clarified ? (hidden >= 2 ? 20 : hidden === 1 ? 12 : 0) : 0;
    u = clamp(u);

    /* 拆解問題 */
    const steps = (a.plan || []).filter(p => len(p.t) >= 4);
    const n = steps.length;
    let d = n >= 5 ? 55 : n === 4 ? 48 : n === 3 ? 40 : n === 2 ? 22 : n === 1 ? 10 : 0;
    const avg = n ? steps.reduce((s, p) => s + len(p.t), 0) / n : 0;
    d += avg >= 10 ? 20 : avg >= 6 ? 10 : 0;
    const aiSteps = steps.filter(p => p.ai).length;
    d += aiSteps > 0 && aiSteps < n ? 12 : aiSteps > 0 ? 5 : 0;
    d += steps.some(p => /驗證|檢查|核對|確認|比對|交叉/.test(p.t)) ? 13 : 0;
    d = clamp(d);

    /* 發現錯誤 */
    const flagged = Object.keys(a.flags || {}).filter(k => a.flags[k]);
    const found = task.errors.filter(e => flagged.includes(e.key));
    const falses = flagged.filter(k => !errKeys.includes(k) && !neutral.includes(k));
    let e = Math.round(found.length / task.errors.length * 100) - falses.length * 12;
    if (len(a.review.other) >= 10 && found.length < task.errors.length) e += 6;
    e = clamp(e);

    /* 驗證修正 */
    const changeLen = len(a.review.change);
    let v = changeLen >= 15 ? 35 : changeLen >= 6 ? 15 : 0;
    const ch = hits(dText + '\n' + a.review.change, task.change.keywords);
    v += ch >= 2 ? 35 : ch === 1 ? 20 : 0;
    const verLen = len(a.review.verify);
    v += verLen >= 20 ? 30 : verLen >= 8 ? 15 : 0;
    v = clamp(v);

    /* 說明負責 */
    const def = a.defense || { answers: [], over: [] };
    let x = 0, overtime = 0, solid = 0;
    (def.answers || []).forEach((ans, i) => {
      const l = len(ans);
      x += l >= 40 ? 22 : l >= 15 ? 12 : 0;
      if (l >= 15) solid++;
      if (/\d/.test(ans)) x += 3;
      if (def.over && def.over[i]) overtime++;
    });
    const discGood = a.disclosure.used && (a.disclosure.used === 'none' || len(a.disclosure.how) >= 15);
    x += discGood ? 25 : a.disclosure.used ? 12 : 0;
    x = clamp(x);

    const dims = [u, d, e, v, x].map(Math.round);
    const total = Math.round(dims.reduce((s, k) => s + k, 0) / 5);
    const grade = total >= 90 ? 'S' : total >= 75 ? 'A' : total >= 60 ? 'B' : 'C';

    const badges = [];
    if (found.length === task.errors.length && !falses.length) badges.push('bug');
    if (v >= 85) badges.push('pivot');
    if (qn >= 2) badges.push('ask');
    if (discGood && a.disclosure.used !== 'none') badges.push('open');
    if (!overtime && solid === (def.answers || []).length && solid > 0) badges.push('calm');

    out.dims = dims; out.total = total; out.grade = grade; out.badges = badges;
    out.found = found.map(f => f.key); out.falses = falses; out.qn = qn; out.overtime = overtime;
    out.hidden = hidden; out.changeHits = ch;
    out.xp = total + badges.length * 15 + task.hours * 10;
    out.at = Date.now();
    out.duration = (a.defense && a.defense.endAt ? a.defense.endAt : Date.now()) - a.startedAt;
    out.vid = 'TPE-PW-' + new Date().getFullYear() + '-' + APP.ui.hash(task.id + JSON.stringify(a.answers) + out.at).slice(0, 6);
    return out;
  }

  function feedback(task, r) {
    const [u, d, e, v, x] = r.dims;
    const f = [];
    f.push({ k: '理解需求', t: u >= 80 ? '開工前先確認需求，也把主管補充的限制寫進成果，這是新人最少見、主管最放心的習慣。' : u >= 55 ? '有抓到主要需求，但主管回覆裡的隱藏限制沒有完整反映在成果中。' : '建議開工前先用自己的話重述需求，並提出確認問題；很多限制主管不會主動說。' });
    f.push({ k: '拆解問題', t: d >= 80 ? '步驟清楚，也安排了驗證環節，並區分哪些步驟交給 AI。' : d >= 55 ? '步驟大致合理，可以再加一個「驗證」步驟，並寫清楚每步的產出。' : '計畫太粗略。試著把任務拆成 4–5 個可以檢查的步驟。' });
    f.push({ k: '發現錯誤', t: e >= 90 ? '所有埋設的錯誤都抓到了，而且沒有誤報。這正是 AI 時代最稀缺的能力。' : e >= 50 ? `抓到 ${r.found.length}/${task.errors.length} 個錯誤。沒抓到的錯通常藏在「看起來合理」的數字裡，記得用另一份資料交叉比對。` : '大部分錯誤沒有被發現。AI 的回答和交接資料都可能出錯，下次每個關鍵數字都回到原始資料驗算一次。' });
    f.push({ k: '驗證修正', t: v >= 80 ? '需求變更後有實際調整成果，並說明了怎麼驗證，應變能力完整。' : v >= 50 ? '有回應需求變更，但成果本身的調整還不夠具體。' : '需求變更沒有反映在成果裡。真實職場中，這通常比一開始做錯更嚴重。' });
    f.push({ k: '說明負責', t: x >= 80 ? '答辯有理有據，也清楚交代 AI 的使用方式，展現了為成果負責的態度。' : x >= 50 ? '答辯有回答到重點，可以多引用具體數字支撐你的判斷。' : '答辯過於簡短。面試官最想聽的是「你為什麼這樣決定」。' });
    return f;
  }

  APP.scoring = { compute, feedback, countQuestions, deliverText };
})();
