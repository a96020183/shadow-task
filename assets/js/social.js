/* 戰隊、邀請（推薦）、校際榜、示範資料 */
(function () {
  const { hash, toast } = APP.ui;
  const DAY = 86400000;

  APP.SCHOOLS = [
    { n: '城南科技大學', type: '大學', members: 356, done: 71, gain: 18 },
    { n: '士林護理專科學校', type: '專科', members: 120, done: 73, gain: 21 },
    { n: '臺北示範大學', type: '大學', members: 412, done: 68, gain: 14 },
    { n: '東區設計學院', type: '大學', members: 187, done: 64, gain: 16 },
    { n: '轉職者社群', type: '社群', members: 264, done: 62, gain: 15 },
    { n: '北城商業大學', type: '大學', members: 298, done: 59, gain: 11 },
    { n: '接案者公會', type: '社群', members: 143, done: 57, gain: 12 }
  ];

  APP.REF_STEPS = [
    { k: 'joined', n: '好友完成身分驗證', r: '尚無獎勵（防止灌人頭）', i: 'scroll' },
    { k: 'passed', n: '好友完成第一張工單並通過答辯', r: '雙方各得「職人 1 對 1 回饋券」＋50 XP', i: 'gem' },
    { k: 'three', n: '累計 3 位好友通過答辯', r: '「領航員」帶人紀錄寫入工單履歷（獎勵上限 3 位）', i: 'chest' }
  ];

  const codeOf = seed => hash(seed + '-ref').replace(/[^A-Z0-9]/g, '').slice(0, 6).padEnd(6, '7');

  APP.squad = {
    get() { return APP.store.get().squad || null; },
    myCode() { const s = APP.store.get(); if (!s.refCode) { s.refCode = codeOf((s.user.name || 'guest') + s.user.createdAt); APP.store.save(); } return s.refCode; },
    create(name) {
      const s = APP.store.get();
      s.squad = { name, code: codeOf(name + Date.now()), goal: 5, createdAt: Date.now(), members: [{ alias: s.user.name || '你', me: true, done: 0, status: 'active' }] };
      APP.store.save(); return s.squad;
    },
    progress() { const q = this.get(); return q ? q.members.reduce((n, m) => n + (m.me ? APP.store.completed().filter(c => c.a.result.at > q.createdAt).length + (m.base || 0) : m.done), 0) : 0; },
    onComplete() {
      const q = this.get(); if (!q) return;
      const p = this.progress();
      if (p >= q.goal && !q.cleared) { q.cleared = Date.now(); setTimeout(() => toast(`戰隊「${q.name}」達成本週目標！全隊獲得戰隊徽章`, 'ok', 4200), 900); }
    },
    referrals() { return APP.store.get().referrals || []; },
    simulateFriend() {
      const s = APP.store.get();
      s.referrals = s.referrals || [];
      const names = ['阿哲', 'Mia', '小芸', '品妤', '柏翰', 'Ken'];
      const pending = s.referrals.find(r => r.status === 'joined');
      const rewarded = s.referrals.filter(r => r.status === 'passed').length;
      if (pending) {
        pending.status = 'passed'; pending.at = Date.now();
        if (rewarded >= 3) { APP.store.save(); return `${pending.name} 通過了第一張工單答辯！你的推薦獎勵已達上限（3 位），這次不再發放回饋券`; }
        s.xp += 50; s.coupons = (s.coupons || 0) + 1;
        const m = s.squad && s.squad.members.find(x => x.alias === pending.name); if (m) { m.done += 1; m.status = 'active'; }
        APP.store.save();
        return `${pending.name} 通過第一張工單答辯！你們各得一張「職人 1 對 1 回饋券」＋50 XP`;
      }
      const name = names.find(n => !s.referrals.some(r => r.name === n));
      if (!name) return '示範名單已用完（6 位）';
      s.referrals.push({ name, status: 'joined', at: Date.now() });
      if (s.squad && s.squad.members.length < 5) s.squad.members.push({ alias: name, done: 0, status: 'invited' });
      APP.store.save();
      return `${name} 用你的邀請碼完成了身分驗證，加入戰隊`;
    }
  };

  /* ---------------- 示範帳號 ---------------- */
  function demoAttempt(task, spec, endAt) {
    const start = endAt - spec.mins * 60000;
    const a = {
      status: 'done', step: 6, startedAt: start, events: [],
      understanding: spec.u, clarified: true, plan: spec.plan, answers: spec.answers, flags: spec.flags,
      aiLog: spec.ai.map((id, i) => ({ id, at: start + (30 + i * 12) * 60000 })),
      changeAt: start + 70 * 60000, changeSeen: true, review: spec.review, disclosure: spec.disc,
      defense: { qs: spec.qs, answers: spec.def, over: [false, false, false], idx: 2, qStart: endAt - 6e5, startedAt: endAt - 9e5, endAt },
      result: null
    };
    const ev = (m, type, msg) => a.events.push({ t: start + m * 60000, type, msg });
    ev(2, 'ask', '向主管提出確認問題'); ev(9, 'step', '進入步驟：拆解計畫'); ev(18, 'step', '進入步驟：實作產出');
    ev(31, 'ai', '詢問 AI：' + task.ai.find(q => q.id === spec.ai[0]).q);
    Object.keys(spec.flags).forEach((k, i) => ev(40 + i * 9, 'flag', '標記可疑：' + APP.flagLabel(task, k)));
    ev(70, 'change', '收到需求變更：' + task.change.subject); ev(spec.mins - 18, 'submit', '送出成果，進入答辯'); ev(spec.mins - 15, 'defense', '開始答辯');
    a.result = APP.scoring.compute(task, a);
    a.result.at = endAt; a.result.duration = spec.mins * 60000;
    a.result.vid = 'TPE-PW-2026-' + hash(task.id + 'demo').slice(0, 6);
    ev(spec.mins, 'done', `完成答辯，總分 ${a.result.total}（${a.result.grade}）`);
    return a;
  }

  APP.demo = {
    load(persist = true) {
      const now = Date.now();
      APP.store.reset(persist);
      const s = APP.store.get();
      Object.assign(s.user, { name: '小安', who: '應屆畢業', school: '臺北示範大學', schoolVerified: true, email: 'an@demo.edu.tw', visible: true, blind: true, createdAt: now - 9 * DAY });
      s.onboarded = true; s.demo = true;
      s.anxiety = { pre: 4, post: 3 };
      const fair = APP.h.task('gov-youth-fair'), coffee = APP.h.task('co-coffee-retention');
      s.attempts['gov-youth-fair'] = demoAttempt(fair, {
        mins: 164,
        u: { restate: '用上半年四場的報名與到場資料，決定下季三場、50 萬推廣預算怎麼分給 IG、校園、KOL，並估算預期報名與到場人數，週五前交一頁建議。', questions: '目標是看報名數還是實際到場數？\n校園合作有沒有數量或經費上限？\n報告要給誰看、需要幾頁？' },
        plan: [{ t: '清點資料：檢查每列數字是否合理、有無重複或異常', ai: false }, { t: '計算各管道每位到場者成本與到場率', ai: true }, { t: '交叉比對 AI 的計算和自己手算的結果', ai: false }, { t: '依成本效益與「首次參加者過半」目標分配預算', ai: false }, { t: '用 AI 潤飾一頁式報告，再核對一次數字', ai: true }],
        answers: {
          d1: '下季總預算 35 萬（已依刪減調整），三場平均每場約 11.7 萬：\n・校園社團合作：每場 3 萬（已達飽和上限）＝9 萬。每位到場成本約 NT$80，最低，且多為首次參加的學生，符合新面孔目標。\n・IG 廣告：每場 7 萬＝21 萬，每位到場成本約 NT$226；第 2 場平日晚上改投放附近上班族。\n・KOL 合作貼文：只在第 2 場保留 5 萬試一次上班族向 KOL。KOL 每位到場成本約 NT$567、到場率僅 39%，大幅縮減。',
          d2: '以上半年各管道「每 1 元帶來的到場數」估算：校園 9 萬約 1,100 人到場、IG 21 萬約 930 人、KOL 5 萬約 90 人，合計約 2,100 人到場、報名約 3,100 人（到場率約 68%）。第 2 場平日晚上缺乏歷史資料，保守下修 15%。',
          d3: '1. 第 3 場校園報名 3,900 人應為誤植（推測為 390），已排除後重算，需向前任同事確認。\n2. 目前沒有「首次參加者」資料，建議報名表加一題「是否第一次參加」。\n3. 平日晚上上班族對 IG 廣告的反應沒有歷史數據，第 2 場結束後要檢討。'
        },
        flags: { 'row:reg:r8': true, 'claim:c2': true, 'ai:p2': true }, ai: ['p1', 'p2'],
        review: { verify: '每個管道的花費、報名、到場都用試算表重新加總，再和 AI 的計算比對；AI 說 KOL 每位到場成本 NT$210 是錯的，實際約 NT$567。', change: '預算從 50 萬降到 35 萬：KOL 從 15 萬砍到 5 萬，校園維持上限 9 萬；第 2 場改平日晚上，IG 改投放上班族並保留一筆 KOL 試水溫。', other: '' },
        disc: { used: 'some', how: '用 AI 計算各管道到場率與成本、潤飾文字。所有數字都用試算表自己驗算過，AI 給的 KOL 成本是錯的，已更正。' },
        qs: [fair.defense[0], '你標記了「第 3 場校園社團合作報名數 3,900」有問題。如果主管說「那個沒錯，照用就好」，你會怎麼回應？', '這份成果裡，哪些部分是 AI 產生的？如果那部分錯了，誰要負責？你做了什麼確保它是對的？'],
        def: ['每位到場者成本。局長在意的是錢花出去有多少人真的來，校園約 NT$80、KOL 約 NT$567，差 7 倍，一眼就知道為什麼要調整。', '我會請主管提供報名系統的原始名單。每場最多 3 校、每校社團最多 150 人，上限約 450 人；照 3,900 算，到場率會變成 7%，和其他場的 7 成差太多。', 'AI 幫我算到場率、潤飾報告。它算錯 KOL 成本，我用試算表重算才發現。交出去的數字由我負責，所以每個數字我都驗算過。']
      }, now - 1 * DAY);
      s.attempts['co-coffee-retention'] = demoAttempt(coffee, {
        mins: 188,
        u: { restate: '回購率從 38% 掉到 27%，要用資料找出真正原因，並提出 2–3 個改善方案給老闆。', questions: '老闆有沒有不能用的手段，例如折扣？\n外送平台的客人我們聯絡得到嗎？' },
        plan: [{ t: '先看整體回購率的趨勢', ai: true }, { t: '拆新舊會員，確認是誰在掉', ai: false }, { t: '核對會議記錄的說法和數據是否一致', ai: false }, { t: '設計不靠打折的改善方案', ai: true }],
        answers: {
          d1: '下滑主因是會員結構改變，不是舊客流失。舊會員回購率 43% → 39%，只小幅下滑；新會員回購率 20% → 9%，而新會員占比從 18% 升到 39%（3 月上架外送平台後）。低回購的新會員變多，把整體回購率拉低。另外 5 月回購率「0.29」單位錯誤，應為 29%。',
          d2: '1. 外送包裝附「加入官方 LINE 領會員點數」卡片，把平台客人導流成自有會員（成本：印刷約 2 萬）。\n2. 門市新會員首購後 7 天內，透過官方 LINE 推播「第二次來店集點加倍」，不打折、改用集點（成本：LINE 推播費）。\n3. 門市店員對新會員介紹集點與會員日（成本：教育訓練半天）。',
          d3: '30 天內看三個數字：官方 LINE 新增好友數（目標 +800）、新會員 30 天回購率（目標從 9% 回到 13%）、門市新會員占比。第 14 天先檢查一次，沒起色就調整卡片文案。'
        },
        flags: { 'row:m:r5': true, 'claim:b1': true }, ai: ['q2', 'q1'],
        review: { verify: '用拆分表的新舊會員回購率和占比，反推整體回購率，確認和月報大致吻合；發現 5 月的 0.29 單位不一致。', change: '滿額折停掉後，方案只用門市和官方 LINE 兩個管道，而且全部改成 30 天內看得到成效的做法。', other: '' },
        disc: { used: 'some', how: '用 AI 整理新舊會員的趨勢、發想方案初稿；拆分表的數字我自己核對過，折扣類方案因為老闆不同意，已經刪掉。' },
        qs: [coffee.defense[0], '你標記了「舊會員回購率三個月掉了 10 個百分點」有問題。如果主管說「那個沒錯，照用就好」，你會怎麼回應？', '這份成果裡，哪些部分是 AI 產生的？如果那部分錯了，誰要負責？你做了什麼確保它是對的？'],
        def: ['我會給他看拆分表：舊會員回購率三個月只從 43% 掉到 39%，新會員從 20% 掉到 9%，而且新會員占比翻倍。問題在新客留不住，不是老客跑掉。', '我會先問這個數字的來源。拆分表上舊會員只掉約 4 個百分點，如果會議記錄用的是另一份資料，兩份都要拿出來對。', '方案初稿是 AI 發想的，我刪掉了打折的方案，因為老闆不同意。數字是我自己對過的，成果由我負責。']
      }, now - 3 * DAY);
      s.xp = Object.values(s.attempts).reduce((n, a) => n + a.result.xp, 0) + 20 + 50 * 2;
      s.tips = [{ task: 'gov-youth-fair', text: '先檢查每一列數字的合理範圍，再讓 AI 計算；AI 給的成本數字一定要自己驗算。', at: now - 3 * DAY }];
      s.refCode = 'AN7K2Q';
      s.squad = {
        name: '夜貓接案隊', code: 'NIGHT7', goal: 6, createdAt: now - 6 * DAY,
        members: [{ alias: '小安', me: true, done: 0, status: 'active' }, { alias: '阿哲', done: 2, status: 'active' }, { alias: 'Mia', done: 1, status: 'active' }, { alias: '小芸', done: 0, status: 'invited' }]
      };
      s.referrals = [{ name: '阿哲', status: 'passed', at: now - 5 * DAY }, { name: 'Mia', status: 'passed', at: now - 2 * DAY }, { name: '小芸', status: 'joined', at: now - DAY }];
      s.coupons = 2;
      s.invites = [{ cand: 'y0388', type: 'interview', msg: '想邀請您來聊聊營運助理職缺。', at: now - DAY }];
      s.postedTasks = [{ title: '電商退貨原因分析與改善', role: '營運分析', hours: 3, at: now - 2 * DAY, status: '去識別化審查中' }];
      if (persist) APP.store.save();
    },
    fresh() { APP.store.reset(); const s = APP.store.get(); s.demo = false; s.user.createdAt = Date.now(); APP.store.save(); }
  };
})();
