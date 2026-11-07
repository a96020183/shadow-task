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
      // 示範作答直接取自工單的範例作答（data.js 的 sample），避免兩份文字不同步。
      const fromSample = (task, aiSteps) => {
        const x = task.sample;
        return {
          u: { restate: x.restate, questions: x.questions },
          plan: x.plan.map((t, i) => ({ t, ai: aiSteps.includes(i) })),
          answers: Object.assign({}, x.answers, x.answersAfter),
          review: { verify: x.verify, change: x.change, other: '' },
          disc: { used: 'some', how: x.how },
          def: x.def.slice()
        };
      };
      s.attempts['gov-youth-fair'] = demoAttempt(fair, Object.assign(fromSample(fair, [1, 4]), {
        mins: 164,
        flags: { 'row:reg:r8': true, 'claim:c2': true, 'ai:p2': true }, ai: ['p1', 'p2'],
        qs: [fair.defense[0], '你標記了「第 3 場校園社團合作報名數 3,900」有問題。如果主管說「那個沒錯，照用就好」，你會怎麼回應？', '這份成果裡，哪些部分是 AI 產生的？如果那部分錯了，誰要負責？你做了什麼確保它是對的？']
      }), now - 1 * DAY);
      // 第一張做得比較生疏：只問一題、計畫三步，「我的進步」才看得出哪一項變強。
      const firstTry = fromSample(coffee, [0]);
      firstTry.u.questions = coffee.sample.questions.split('\n')[0];
      firstTry.plan = firstTry.plan.slice(0, 3);
      firstTry.review.verify = '用拆分表核對過整體續訂率。';
      s.attempts['co-coffee-retention'] = demoAttempt(coffee, Object.assign(firstTry, {
        mins: 188,
        flags: { 'row:m:r5': true, 'claim:b1': true }, ai: ['q2', 'q1'],
        qs: [coffee.defense[0], '你標記了「舊會員續訂率三個月掉了 10 個百分點」有問題。如果主管說「那個沒錯，照用就好」，你會怎麼回應？', '這份成果裡，哪些部分是 AI 產生的？如果那部分錯了，誰要負責？你做了什麼確保它是對的？']
      }), now - 3 * DAY);
      s.xp = Object.values(s.attempts).reduce((n, a) => n + a.result.xp, 0) + 20 + 50 * 2;
      s.tips = [{ task: 'gov-youth-fair', text: '先檢查每一列數字的合理範圍，再讓 AI 計算；AI 給的成本數字一定要自己驗算。', at: now - 3 * DAY }];
      s.refCode = 'AN7K2Q';
      s.squad = {
        name: '夜貓接案隊', code: 'NIGHT7', goal: 6, createdAt: now - 6 * DAY,
        members: [{ alias: '小安', me: true, done: 0, status: 'active' }, { alias: '阿哲', done: 2, status: 'active' }, { alias: 'Mia', done: 1, status: 'active' }, { alias: '小芸', done: 0, status: 'invited' }]
      };
      s.referrals = [{ name: '阿哲', status: 'passed', at: now - 5 * DAY }, { name: 'Mia', status: 'passed', at: now - 2 * DAY }, { name: '小芸', status: 'joined', at: now - DAY }];
      s.coupons = 2;
      // seed：示範帳號自帶的邀約，不算進成效追蹤的「本機示範操作」。
      s.invites = [{ cand: 'y0388', type: 'interview', msg: '想邀請您來聊聊營運助理職缺。', at: now - DAY, seed: true }];
      // 戰友互問：一筆隊友問你（已回答），一筆你要問隊友（待辦）。
      s.peer = [
        { id: 'pq1', dir: 'in', mate: '阿哲', task: 'gov-youth-fair', q: '你為什麼不把 KOL 全砍，還留 5 萬？', a: '第 2 場改平日晚上，對象變成上班族，我們沒有這群人的資料。留 5 萬試一次，第 2 場結束就知道值不值得。', at: now - 2 * DAY },
        { id: 'pq2', dir: 'out', mate: 'Mia', task: 'co-logistics-cs', excerpt: '重複扣款列第一優先；SOP 第一步，先在 2 小時內用模板回覆客人。', q: '', at: now - DAY }
      ];
      s.postedTasks = [{ title: '電商退貨原因分析與改善', role: '營運分析', hours: 3, at: now - 2 * DAY, status: '去識別化審查中' }];
      if (persist) APP.store.save();
    },
    fresh() { APP.store.reset(); const s = APP.store.get(); s.demo = false; s.user.createdAt = Date.now(); APP.store.save(); }
  };
})();
