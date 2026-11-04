"""本機驗收：python -X utf8 tests/finals_audit.py。
需要已安裝的 Python Playwright、Chrome、OpenCV 與 NumPy（實際解碼 QR）。
"""
import json
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'tests' / 'audit-output'
OUT.mkdir(parents=True, exist_ok=True)

# 像素字只負責英數（unicode-range）；中文標題用 Noto Sans TC Black，必須涵蓋全站用到的字。
source_chars = set(''.join(p.read_text(encoding='utf8') for p in [ROOT/'index.html', *(ROOT/'assets/js').glob('*.js'), *(ROOT/'assets/css').glob('*.css')]))
with TTFont(ROOT/'assets/fonts/Cubic_11-subset.woff2') as subset:
    assert set(range(0x20, 0x7f)) <= set(subset.getBestCmap()), 'Pixel subset lost ASCII; rerun tools/subset_font.py'
with TTFont(ROOT/'.font-cache/NotoSansTC-wght.ttf') if (ROOT/'.font-cache/NotoSansTC-wght.ttf').exists() else TTFont(ROOT/'assets/fonts/NotoSansTC-Black-subset.woff2') as original, TTFont(ROOT/'assets/fonts/NotoSansTC-Black-subset.woff2') as subset:
    expected = {ord(c) for c in source_chars} & set(original.getBestCmap())
    missing = expected - set(subset.getBestCmap())
    assert not missing, 'Noto Sans TC subset is stale; rerun tools/subset_font.py: ' + ''.join(map(chr, sorted(missing)))[:40]
assert not (set('▶►»') & source_chars), 'Use icon("arrowRight") instead of text triangles'
fonts_kb = sum((ROOT/'assets/fonts'/n).stat().st_size for n in ['Cubic_11-subset.woff2', 'NotoSansTC-Black-subset.woff2']) / 1024
assert fonts_kb <= 250, f'Home page fonts {fonts_kb:.0f} KB > 250 KB'

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()
base = 'http://127.0.0.1:%s/index.html' % server.server_port

SCAN = """() => {
  const visible = e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width && r.height && s.visibility !== 'hidden' && !e.closest('svg'); };
  const small = [...document.querySelectorAll('a,button,summary,input,select,textarea,[role=button]')].filter(visible).filter(e => !e.disabled && !e.closest('.sr-only') && !(['checkbox','radio'].includes(e.type) && e.closest('label'))).filter(e => {const r=e.getBoundingClientRect();return r.width < 43.9 || r.height < 43.9}).map(e => ({text:(e.innerText || e.ariaLabel || e.outerHTML).slice(0,75), cls:e.className, w:Math.round(e.getBoundingClientRect().width), h:Math.round(e.getBoundingClientRect().height)}));
  const tiny = [...document.querySelectorAll('body *')].filter(visible).filter(e => [...e.childNodes].some(n=>n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize)<13).map(e=>({text:e.textContent.slice(0,50),cls:e.className,size:getComputedStyle(e).fontSize}));
  const overflow = [...document.querySelectorAll('#view *')].filter(visible).filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+1 && !e.closest('.table-scroll,.stepper,.tabs,.panel-body')}).slice(0,12).map(e=>({tag:e.tagName,cls:e.className,w:e.getBoundingClientRect().width,text:e.textContent.slice(0,40)}));
  return {h:document.documentElement.scrollHeight, sw:document.documentElement.scrollWidth, cw:innerWidth, small, tiny, overflow};
}"""

def next_step(page, name):
    page.locator('[data-next]').click()
    page.wait_for_function('(name)=>document.querySelector(".try-progress b")?.textContent===name', arg=name)
    page.wait_for_timeout(500)

def restart(page):
    page.locator('[data-restart]').click()
    page.wait_for_function('document.querySelector(".try-progress b")?.textContent==="接工單"')
    page.wait_for_timeout(450)

def pick_errors(page, duplicate=3):
    page.locator(f'[data-row-pick="{duplicate}"]').click()
    assert '還有一個' in page.locator('.try-feedback').inner_text()
    assert page.locator('[data-next]').is_disabled()
    page.locator(f'[data-row-pick="{2 if duplicate==3 else 3}"]').click()
    assert page.locator('.found').count()==1
    assert page.locator('[data-next]').is_disabled()
    page.locator('[data-row-pick="4"]').click()
    assert '正確是 4 人' in page.locator('.try-feedback').inner_text()
    assert page.locator('.found').count()==2
    assert page.locator('.ai-correct').inner_text()=='4'
    assert page.locator('.try-followup').count()==1
    page.wait_for_timeout(520)

def check_qr(page, selector, filename, expected):
    import cv2
    import numpy as np
    path = OUT / filename
    page.locator(selector).evaluate("e=>e.scrollIntoView({block:'center'})")
    page.wait_for_timeout(160)
    page.locator(selector).screenshot(path=str(path))
    img = cv2.imdecode(np.frombuffer(path.read_bytes(),dtype=np.uint8),cv2.IMREAD_COLOR)
    # Decode the actually rendered QR, upscaled for the detector only.
    img = cv2.resize(img, None, fx=3, fy=3, interpolation=cv2.INTER_NEAREST)
    decoded,_,_=cv2.QRCodeDetector().detectAndDecode(img)
    assert decoded==expected, (filename, decoded, expected)


def choose_correct(page):
    step = page.locator('.try-progress b').inner_text()
    index = 0 if step=='應變' else 1
    options = page.locator('[data-choice]')
    lengths = [len(t) for t in options.all_text_contents()]
    assert max(lengths)-min(lengths)<=10
    options.nth(index).click()
    assert page.locator('[data-next]').is_enabled()
    assert page.locator('.try-followup').count()==0

def check_verify_notice(page):
    assert page.locator('.verify-state').inner_text()=='示範查驗頁・非市府核發'
    assert '正式版將由臺北市政府青年局核發' in page.locator('.verify-notice').inner_text()
    assert '有效・市府核發' not in page.locator('#view').inner_text()
    assert page.locator('.verify-state').evaluate("e=>getComputedStyle(e).color===getComputedStyle(document.querySelector('.verify-notice')).color")

def audit_round_three(page):
    page.evaluate("location.hash='#/gov'")
    page.wait_for_selector('.gov-evidence')
    cards = page.locator('.gov-evidence .evidence-card')
    assert cards.count()==2
    assert '4 個月內獲面試邀約比例差' in cards.nth(0).inner_text()
    assert '目標 ≥ 5 個百分點' in cards.nth(0).inner_text()
    assert 'HR 情境實驗效果量' in cards.nth(1).inner_text()
    assert '先導目標 ≥ 0.2 SD' in cards.nth(1).inner_text()
    assert all('95% 信賴區間' in t for t in cards.all_text_contents())
    assert cards.evaluate_all('(els)=>els.every(e=>e.getBoundingClientRect().bottom<innerHeight-64)')
    body = page.locator('#view').inner_text()
    for text in ['以下數字皆為模擬，用來展示指標設計','較對照組多降 0.2 分','目標 ≥ 0.3 分','第一梯 116 年 7 月開放、4 個月追蹤','104 人力銀行，2025','建議分工','本機紀錄（僅示範，非統計）']:
        assert text in body, text
    assert '試辦前 6 個月' not in body
    assert '模擬・本機紀錄' not in body
    assert page.locator('.gov-fairness .funnel-row b').inner_text().endswith('%')
    assert abs(page.locator('.gov-fairness svg path').evaluate('e=>e.getBBox().width')-48)<0.1
    assert page.locator('a[href="https://multimedia.cy.gov.tw/DocFiles/IFDEWebBBS_CY/Docs/114/3RD/00/76/1144330233.pdf"]').count()==1
    data = page.evaluate('APP.GOV')
    assert abs(data['completedTasks']/data['funnel'][1]['v']-1.3)<0.01
    assert data['taskEstimate']==data['funnel'][1]['target']*1.3
    assert any(d['v']<d['target'] for d in data['funnel'])
    assert any(d['v']>d['target'] for d in data['funnel'])
    page.evaluate("location.hash='#/learn'")
    page.wait_for_selector('.learn-page')
    body = page.locator('#view').inner_text()
    for text in ['階段 3 功能・示範','資源類型','業者自願參與','相關性非因果','線上速成課程','讀書會','大學課程','職人一對一回饋']:
        assert text in body, text
    for text in ['依成效核銷','NT$','費用','Prompt 大全','三天 AI 變現','3,990','12,800']:
        assert text not in body, text
    page.evaluate("location.hash='#/about'")
    page.wait_for_selector('.ladder')
    body = page.locator('#view').text_content()
    for text in ['L1 是電話初篩以外的能力訊號；L2 可替代或補充作業測驗','首張計分工單必答辯、後續抽審 30%','描述性發現，非因果推論','待青年局評估']:
        assert text in body, text
    for route in ['#/verify/TPE-TRY-2026','#/verify/TPE-PW-2026-BA58C8','#/verify/unknown']:
        page.evaluate('(route)=>location.hash=route', route)
        page.wait_for_selector('.verify-notice')
        check_verify_notice(page)
    page.evaluate("location.hash='#/verify/'+APP.portfolioCand(APP.CANDIDATES[2]).entries[0].vid")
    page.wait_for_selector('.decision-card')
    assert '能力判定須待答辯驗證' in page.locator('.review-dialogue').inner_text()
    assert '職人評語' not in page.locator('.review-dialogue h2').all_text_contents()
    assert 'AI 初評' in page.locator('.verify-bottom').inner_text()
    page.evaluate("location.hash='#/company'")
    page.wait_for_selector('.candidate-row')
    assert page.locator('.candidate-actions .btn').first.evaluate("e=>getComputedStyle(e).boxShadow==='none'")
    page.evaluate("location.hash='#/'")
    page.wait_for_selector('.home-action')
    assert '工單 #0142' in page.locator('.home-ticket').inner_text()
    assert page.locator('.home-action .btn').evaluate("e=>getComputedStyle(e).borderRadius==='0px' && getComputedStyle(e).boxShadow!=='none'")

with sync_playwright() as pw:
    browser = pw.chromium.launch(channel='chrome', headless=True)
    context = browser.new_context(viewport={'width':390,'height':844}, device_scale_factor=1, color_scheme='light')
    page = context.new_page()
    errors, external, failed_resources = [], [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    def record_request(r):
        if r.url.startswith('http') and not r.url.startswith('http://127.0.0.1:'): external.append(r.url)
    page.on('request', record_request)
    page.on('response', lambda r: failed_resources.append(r.url) if r.status>=400 else None)
    page.goto(base+'#/')
    page.wait_for_selector('.home-action')
    assert page.evaluate('APP.theme.effective()') == 'dark'
    page.evaluate("APP.theme.set('light')")
    page.screenshot(path=str(OUT/'home-390.png'),full_page=True)
    assert page.locator('.home-action a').bounding_box()['y'] < 700
    assert page.evaluate("localStorage.getItem('shadowtask.v1')") is None
    # Save a legacy-compatible account, then verify the entire short flow leaves its bytes intact.
    page.evaluate("APP.demo.load(); APP.store.get().user.name = '原有使用者'; APP.store.save()")
    snapshot = page.evaluate("localStorage.getItem('shadowtask.v1')")
    memory = page.evaluate('JSON.stringify(APP.store.get())')
    page.locator('.home-action a').click()
    next_step(page, '抓錯')
    page.evaluate('window.sheetBefore = document.querySelector(".try-sheet"); window.rowBefore = document.querySelector("[data-row-pick]")')
    page.locator('[data-row-pick="0"]').focus()
    page.keyboard.press('Enter')
    assert page.locator('[data-row="0"]').get_attribute('class')=='wrong shake'
    assert page.locator('[data-next]').is_disabled()
    pick_errors(page)
    assert page.evaluate('window.sheetBefore === document.querySelector(".try-sheet") && window.rowBefore === document.querySelector("[data-row-pick]")')
    assert page.locator('.try-sheet').evaluate('(e)=>e.getAnimations().length')==0
    next_step(page, '應變')
    page.evaluate('window.sheetBefore = document.querySelector(".try-sheet")')
    choose_correct(page)
    assert page.evaluate('window.sheetBefore === document.querySelector(".try-sheet")')
    assert '真實工單裡，職人會當面追問你為什麼。' not in page.locator('.try-feedback').inner_text()
    next_step(page, '說明')
    choose_correct(page)
    next_step(page, '看紀錄')
    assert page.locator('.try-stamp').is_visible()
    assert page.locator('.try-checks li').count()==3
    assert page.locator('.try-track').count()==0
    check_qr(page, '.record-qr svg', 'result-qr.png', 'https://a96020183.github.io/shadow-task/#/verify/TPE-TRY-2026')
    assert page.locator('#try-title').inner_text()=='體驗完成'
    assert '體驗紀錄（示範）' in page.locator('.try-record').inner_text()
    assert 'TPE-TRY-2026' in page.locator('.try-record').inner_text()
    assert '非市府核發' in page.locator('.try-record').inner_text()
    page.locator('.try-record').click()
    check_verify_notice(page)
    assert any(k in page.locator('#view').inner_text() for k in ('提示後答對', '再試後找到', '看答案後確認'))
    check_qr(page, '.try-qr svg', 'try-qr.png', 'https://a96020183.github.io/shadow-task/#/verify/TPE-TRY-2026')
    page.locator('a[href="#/onepage?try=1"]').click()
    assert page.locator('.onepage').is_visible()
    page.evaluate("location.hash='#/try/review'")
    page.wait_for_selector('.try-review')
    assert '虛構示範' in page.locator('#view').inner_text()
    assert '待加強' in page.locator('#view').inner_text()
    assert page.locator('a[href="#/verify/TPE-PW-2026-BA58C8"]').count()==1
    # The review's own evidence code must resolve to the same answer.
    coffee_link = page.locator('a[href="#/verify/TPE-PW-2026-BA58C8"]')
    link_title = coffee_link.inner_text().replace('再看一張：', '').strip()
    coffee_link.click()
    assert page.locator('#view h1').inner_text()==link_title
    coffee_time = page.locator('.decision-meta').inner_text()
    page.evaluate("location.hash='#/try/review'")
    page.locator('.try-text-link').first.click()
    assert page.locator('.decision-meta').inner_text()!=coffee_time
    assert '2 小時 42 分' in page.locator('.decision-meta').inner_text()
    assert '去年校園報名多' in page.locator('.review-dialogue blockquote').inner_text()
    assert page.evaluate('JSON.stringify(APP.store.get())') == memory
    page.evaluate("window.dispatchEvent(new Event('pagehide'))")
    assert page.evaluate("localStorage.getItem('shadowtask.v1')") == snapshot
    page.goto(base+'#/verify/TPE-TRY-2026')
    page.reload()
    assert '還沒有已完成的作答' in page.locator('#view').inner_text()
    assert page.locator('.try-qr svg').is_visible()
    assert page.evaluate("localStorage.getItem('shadowtask.v1')") == snapshot
    page.goto(base+'#/try')
    next_step(page, '抓錯')
    page.locator('[data-row-pick="0"]').click()
    page.locator('[data-row-pick="1"]').click()
    assert '看了提示' in page.locator('.try-feedback').inner_text()
    assert page.locator('.found').count()==2
    assert '正確是 4 人' in page.locator('.try-feedback').inner_text()
    next_step(page, '應變')
    page.locator('[data-choice][data-value="1"]').click()
    assert page.locator('[data-next]').is_disabled()
    assert '看了提示' in page.locator('.try-feedback').inner_text()
    choose_correct(page)
    next_step(page, '說明')
    page.locator('[data-choice][data-value="2"]').click()
    assert page.locator('[data-next]').is_disabled()
    choose_correct(page)
    next_step(page, '看紀錄')
    assert page.locator('.result-mark.hinted').count()==3
    assert page.evaluate("localStorage.getItem('shadowtask.v1')") == snapshot
    restart(page)

    audit_round_three(page)

    # All route families, including working and defense states, not just their redirects.
    page.evaluate("APP.store.ensureAttempt('co-logistics-cs')")
    candidates = page.evaluate('APP.CANDIDATES.map(c=>c.id)')
    taskids = page.evaluate('APP.TASKS.map(t=>t.id)')
    ai_route = page.evaluate("'/verify/'+APP.portfolioCand(APP.CANDIDATES[2]).entries[0].vid")
    routes = ['/', '/try', '/try/review', '/verify/TPE-TRY-2026', '/tasks', '/portfolio', '/onepage', '/onepage?try=1', '/verify/TPE-PW-2026-BA58C8', '/verify/unknown', '/company','/gov','/mentor','/squad','/join/NIGHT7','/about','/learn','/work/co-logistics-cs','/result/gov-youth-fair','/result/co-coffee-retention','/not-found']
    routes += ['/task/'+i for i in taskids] + ['/p/'+i for i in candidates]
    routes += [ai_route]
    reports = []
    # All five screens plus reviewed evidence, at four widths and all theme/motion combinations.
    for theme, motion in [('light','no-preference'),('dark','no-preference'),('light','reduce'),('dark','reduce')]:
        page.emulate_media(color_scheme=theme, reduced_motion=motion)
        page.evaluate('(theme)=>APP.theme.set(theme)', theme)
        for width in [360,390,430,1280]:
            page.set_viewport_size({'width':width,'height':844 if width<500 else 900})
            page.evaluate("location.hash='#/try'")
            page.wait_for_selector('.try-sheet')
            if page.locator('[data-restart]').count(): restart(page)
            for step, name in enumerate(['接工單','抓錯','應變','說明','看紀錄'],1):
                page.wait_for_timeout(450)
                if step==2:
                    pick_errors(page, duplicate=2 if width==360 else 3)
                    # Clicking the other half of the same duplicate never counts as a second error.
                    assert page.locator('.found').count()==2
                if step in [3,4]: choose_correct(page)
                page.wait_for_timeout(450)
                reports.append(dict(route=f'/try step {step} {theme}/{motion}',width=width,**page.evaluate(SCAN)))
                assert 'LV.' not in page.locator('body').inner_text()
                assert 'XP' not in page.locator('body').inner_text()
                if motion=='reduce':
                    assert page.locator('.try-sheet').evaluate('e=>getComputedStyle(e).transform')=='none'
                    assert page.locator('.sky-window').first.evaluate('e=>getComputedStyle(e).animationName')=='none'
                if width in [360,390,1280] and (theme,motion) in [('light','no-preference'),('dark','reduce')]:
                    page.screenshot(path=str(OUT/f'try-{step}-{width}-{theme}-{motion}.png'),full_page=True)
                if step<5:
                    dock = page.locator('.try-dock').bounding_box()
                    assert dock['y']+dock['height'] <= page.viewport_size['height']+1
                    assert page.locator('.try-dock .px-btn').bounding_box()['height']>=44
                    next_step(page, ['接工單','抓錯','應變','說明','看紀錄'][step])
            assert page.locator('.result-mark.hinted').count()==0
            for route in ['/try/review', '/verify/TPE-TRY-2026', '/verify/TPE-PW-2026-BA58C8']:
                page.evaluate('(r)=>location.hash="#"+r',route)
                page.wait_for_timeout(520)
                reports.append(dict(route=f'{route} {theme}/{motion}',width=width,**page.evaluate(SCAN)))
                assert 'LV.' not in page.locator('body').inner_text()
                assert 'XP' not in page.locator('body').inner_text()
                if route.startswith('/verify/'): check_verify_notice(page)
            page.evaluate("location.hash='#/try'")
            page.wait_for_selector('[data-restart]')
            restart(page)
    page.emulate_media(color_scheme='light', reduced_motion='no-preference')
    page.evaluate("APP.theme.set('light')")
    for width in [360,390,430,1280]:
        page.set_viewport_size({'width':width,'height':844 if width<500 else 900})
        for route in routes:
            page.evaluate('(r)=>location.hash="#"+r',route)
            page.wait_for_timeout(520 if route=='/try' else 70)
            data=page.evaluate(SCAN)
            reports.append(dict(route=route,width=width,**data))
            if width in [390,1280] and route in ['/','/tasks','/company','/gov','/mentor','/onepage','/verify/TPE-PW-2026-BA58C8','/try/review','/portfolio','/learn','/about','/work/co-logistics-cs']:
                page.screenshot(path=str(OUT/((route.strip('/').replace('/','_') or 'home')+f'-{width}.png')),full_page=True)
                page.screenshot(path=str(OUT/((route.strip('/').replace('/','_') or 'home')+f'-{width}-fold.png')))
    OUT.joinpath('checkpoint.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2),encoding='utf-8')
    # Keep the original workflows usable with real interactions.
    page.set_viewport_size({'width':390,'height':844})
    page.evaluate("location.hash='#/tasks'")
    page.locator('.search input').fill('不存在的工單')
    assert page.locator('[data-empty]').is_visible()
    page.locator('.search input').fill('物流')
    assert page.locator('.quests a:visible').count()==1
    page.evaluate("location.hash='#/company'")
    page.wait_for_selector('.candidate-row')
    assert '小安' not in page.locator('body').inner_text()
    assert '原有使用者' not in page.locator('body').inner_text()
    assert page.locator('.candidate-row').count()==8
    assert page.locator('.candidate-row .verification-level').count()==8
    assert set(page.locator('.candidate-row .verification-level').all_text_contents())=={'答辯驗證','AI 初評'}
    assert page.locator('.candidate-row').evaluate_all('(els)=>els.filter(e=>e.getBoundingClientRect().bottom<=innerHeight-64).length')>=3
    page.locator('[data-function="客服"]').click()
    assert page.locator('.candidate-row').count()==1
    page.locator('[data-function="全部"]').click()
    page.locator('[data-shortlist]').first.click()
    assert page.locator('[data-shortlist]').first.get_attribute('aria-pressed')=='true'
    page.locator('[data-shortlist]').first.click()
    page.locator('.talent-more summary').click()
    page.locator('[data-grade-filter]').select_option('S')
    assert page.locator('[data-grade-filter]').input_value()=='S'
    page.locator('.talent-more summary').click()
    page.locator('[data-sort-filter]').select_option('2')
    assert page.locator('[data-sort-filter]').input_value()=='2'
    page.locator('[data-invite]').first.click()
    assert page.locator('[role=dialog]').is_visible()
    page.locator('[data-x]').click()
    page.locator('[data-tab="post"]').click()
    assert '比只看年資準' in page.locator('#view').inner_text()
    assert '工作樣本 .33、結構化面試 .42、年資只有 .07' in page.locator('#view').inner_text()
    assert '工單分數本身的效度會在試辦中驗證。' in page.locator('#view').inner_text()
    reports.append(dict(route='/company (post)',width=390,**page.evaluate(SCAN)))
    page.locator('[data-tab="inv"]').click()
    page.evaluate("location.hash='#/mentor'")
    page.locator('[data-open]').first.click()
    page.locator('[data-cmt]').fill('已核對數字，請補充決策依據。')
    page.locator('[data-submit]').click()
    assert page.evaluate('Object.keys(APP.store.get().reviews).length')==1
    reports.append(dict(route='/mentor (reviewed)',width=390,**page.evaluate(SCAN)))
    page.evaluate("location.hash='#/work/co-logistics-cs'")
    page.locator('[data-bind="understanding.restate"]').fill('確認有效客訴，提出客服流程改善。')
    page.evaluate("window.dispatchEvent(new Event('pagehide'))")
    assert '有效客訴' in page.evaluate("JSON.parse(localStorage.getItem('shadowtask.v1')).attempts['co-logistics-cs'].understanding.restate")
    page.locator('[data-tab="table"]').click()
    page.locator('[data-flag]').first.click()
    assert page.evaluate("Object.values(APP.store.attempt('co-logistics-cs').flags).some(Boolean)")
    page.locator('[data-tab="ai"]').click()
    page.locator('[data-ask]').first.click()
    assert page.evaluate("APP.store.attempt('co-logistics-cs').aiLog.length")==1
    reports.append(dict(route='/work (AI)',width=390,**page.evaluate(SCAN)))
    for step in [2,3,4,5]:
        page.evaluate('(n)=>{APP.store.attempt("co-logistics-cs").step=n; APP.render()}',step)
        reports.append(dict(route='/work step '+str(step),width=390,**page.evaluate(SCAN)))
    page.evaluate("APP.store.attempt('co-logistics-cs').step=6;location.hash='#/defense/co-logistics-cs'")
    page.wait_for_timeout(60)
    assert page.locator('[data-def]').count()>0
    for width in [360,390,430,1280]:
        page.set_viewport_size({'width':width,'height':844})
        reports.append(dict(route='/defense/co-logistics-cs',width=width,**page.evaluate(SCAN)))
    # Storage unavailable, file://, theme toggle, reduced motion, retained printed QR target.
    denied = browser.new_context(viewport={'width':360,'height':780}, color_scheme='dark', reduced_motion='reduce')
    denied.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage disabled')}})")
    p2 = denied.new_page()
    p2.on('pageerror',lambda error: errors.append('denied: '+str(error)))
    p2.on('request',record_request)
    p2.goto(ROOT.joinpath('index.html').as_uri()+'#/try')
    next_step(p2, '抓錯')
    pick_errors(p2)
    next_step(p2, '應變')
    choose_correct(p2)
    next_step(p2, '說明')
    choose_correct(p2)
    next_step(p2, '看紀錄')
    assert p2.locator('.try-stamp').evaluate("e=>getComputedStyle(e).animationName")=='state-fade'
    assert p2.locator('.try-stamp').evaluate("e=>getComputedStyle(e).transform")=='none'
    check_qr(p2, '.record-qr svg', 'result-qr-dark-file.png', 'https://a96020183.github.io/shadow-task/#/verify/TPE-TRY-2026')
    p2.locator('.try-record').click()
    check_verify_notice(p2)
    check_qr(p2, '.try-qr svg', 'try-qr-dark-file.png', 'https://a96020183.github.io/shadow-task/#/verify/TPE-TRY-2026')
    p2.screenshot(path=str(OUT/'try-dark-reduced-360.png'),full_page=True)
    p2.locator('[data-theme-toggle]').click()
    assert p2.evaluate('APP.theme.effective()')=='light'
    p2.locator('[data-theme-toggle]').click()
    assert p2.evaluate('APP.theme.effective()')=='dark'
    p2.goto(ROOT.joinpath('index.html').as_uri()+'#/verify/TPE-PW-2026-BA58C8')
    assert '查無此驗證碼' not in p2.locator('#view').inner_text()
    p2.goto(ROOT.joinpath('index.html').as_uri()+'#/onepage')
    assert p2.locator('.op-qr svg path').count()>0
    p2.screenshot(path=str(OUT/'onepage-dark-file-360.png'),full_page=True)
    qr_url=p2.evaluate("APP.ui.verifyURL('TPE-PW-2026-BA58C8')")
    assert qr_url=='https://a96020183.github.io/shadow-task/#/verify/TPE-PW-2026-BA58C8'
    p2.evaluate("document.querySelector('.op-qr').innerHTML=APP.ui.qrSVG(APP.ui.verifyURL('TPE-PW-2026-BA58C8'));document.querySelector('.op-qr svg').style.cssText='width:280px;height:280px;max-width:none'")
    p2.locator('.op-qr svg').screenshot(path=str(OUT/'qr.png'))
    try:
        import cv2
        import numpy as np
        qr_image = cv2.imdecode(np.frombuffer(OUT.joinpath('qr.png').read_bytes(), dtype=np.uint8), cv2.IMREAD_COLOR)
        decoded,_,_=cv2.QRCodeDetector().detectAndDecode(qr_image)
        assert decoded==qr_url
        print('QR decoded successfully')
    except ImportError:
        print('QR decoder unavailable; SVG generation verified')
    for width in [360,390,430,1280]:
        p2.set_viewport_size({'width':width,'height':844})
        for route in ['/','/tasks','/portfolio','/company','/gov','/mentor','/verify/TPE-PW-2026-BA58C8','/try/review','/verify/TPE-TRY-2026','/squad','/learn','/about',ai_route]:
            p2.evaluate('(r)=>location.hash="#"+r',route)
            p2.wait_for_timeout(40)
            reports.append(dict(route=route+' (dark/file/storage denied)',width=width,**p2.evaluate(SCAN)))
    audit_round_three(p2)

    # The phone menu and primary actions stay keyboard reachable.
    page.evaluate("location.hash='#/'")
    page.set_viewport_size({'width':390,'height':844})
    page.locator('[data-menu]').click()
    assert page.locator('[data-menu]').get_attribute('aria-expanded')=='true'
    page.keyboard.press('Escape')
    assert page.locator('[data-menu]').get_attribute('aria-expanded')=='false'
    OUT.joinpath('report.json').write_text(json.dumps({'routes':reports,'errors':errors,'external':external,'failed_resources':failed_resources},ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'checks':len(reports),'errors':errors,'external':external,'overflow':[(x['route'],x['width']) for x in reports if x['overflow'] or x['sw']>x['cw']],'small_mobile':sum(len(x['small']) for x in reports if x['width']<500),'tiny_mobile':sum(len(x['tiny']) for x in reports if x['width']<500)},ensure_ascii=False))
    assert not errors
    assert not external
    assert not failed_resources
    assert not [(x['route'],x['width']) for x in reports if x['overflow'] or x['sw']>x['cw']]
    assert not [x for x in reports if x['width']<500 and (x['small'] or x['tiny'])]
    browser.close()
server.shutdown()
