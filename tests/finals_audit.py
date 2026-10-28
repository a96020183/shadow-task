"""本機驗收：python -X utf8 tests/finals_audit.py。
需要已安裝的 Python Playwright、Chromium、OpenCV 與 NumPy（實際解碼 QR）。
"""
import json
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'tests' / 'audit-output'
OUT.mkdir(parents=True, exist_ok=True)

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
    page.wait_for_function('document.querySelector(".try-progress b")?.textContent==="接單"')
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

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
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
    page.locator('[data-choice][data-value="2"]').click()
    assert page.evaluate('window.sheetBefore === document.querySelector(".try-sheet")')
    assert '真實工單裡，職人會當面追問你為什麼。' in page.locator('.try-feedback').inner_text()
    next_step(page, '說明')
    page.locator('[data-choice][data-value="2"]').click()
    next_step(page, '拿證明')
    assert page.locator('.try-stamp').is_visible()
    assert page.locator('.try-checks li').count()==3
    assert page.locator('.try-track').count()==0
    page.locator('a[href="#/verify/TPE-TRY-2026"]').click()
    assert page.locator('.try-stamp').is_visible()
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
    page.locator('.try-text-link').first.click()
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
    page.locator('[data-choice][data-value="0"]').click()
    assert page.locator('[data-next]').is_disabled()
    assert '看了提示' in page.locator('.try-feedback').inner_text()
    page.locator('[data-choice][data-value="2"]').click()
    next_step(page, '說明')
    page.locator('[data-choice][data-value="1"]').click()
    assert page.locator('[data-next]').is_disabled()
    page.locator('[data-choice][data-value="2"]').click()
    next_step(page, '拿證明')
    assert page.locator('.result-mark.hinted').count()==3
    assert page.evaluate("localStorage.getItem('shadowtask.v1')") == snapshot
    restart(page)

    # All route families, including working and defense states, not just their redirects.
    page.evaluate("APP.store.ensureAttempt('co-logistics-cs')")
    candidates = page.evaluate('APP.CANDIDATES.map(c=>c.id)')
    taskids = page.evaluate('APP.TASKS.map(t=>t.id)')
    routes = ['/', '/try', '/try/review', '/verify/TPE-TRY-2026', '/tasks', '/portfolio', '/onepage', '/onepage?try=1', '/verify/TPE-PW-2026-BA58C8', '/verify/unknown', '/company','/gov','/mentor','/squad','/join/NIGHT7','/about','/learn','/work/co-logistics-cs','/result/gov-youth-fair','/result/co-coffee-retention','/not-found']
    routes += ['/task/'+i for i in taskids] + ['/p/'+i for i in candidates]
    reports = []
    # All five screens plus reviewed evidence, at four widths and all theme/motion combinations.
    for theme, motion in [('light','no-preference'),('dark','no-preference'),('light','reduce'),('dark','reduce')]:
        page.emulate_media(color_scheme=theme, reduced_motion=motion)
        for width in [360,390,430,1280]:
            page.set_viewport_size({'width':width,'height':844 if width<500 else 900})
            page.evaluate("location.hash='#/try'")
            page.wait_for_selector('.try-sheet')
            if page.locator('[data-restart]').count(): restart(page)
            for step, name in enumerate(['接單','抓錯','應變','說明','拿證明'],1):
                page.wait_for_timeout(450)
                if step==2:
                    pick_errors(page, duplicate=2 if width==360 else 3)
                    # Clicking the other half of the same duplicate never counts as a second error.
                    assert page.locator('.found').count()==2
                if step in [3,4]: page.locator('[data-choice][data-value="2"]').click()
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
                    next_step(page, ['接單','抓錯','應變','說明','拿證明'][step])
            assert page.locator('.result-mark.hinted').count()==0
            for route in ['/try/review', '/verify/TPE-TRY-2026', '/verify/TPE-PW-2026-BA58C8']:
                page.evaluate('(r)=>location.hash="#"+r',route)
                page.wait_for_timeout(520)
                reports.append(dict(route=f'{route} {theme}/{motion}',width=width,**page.evaluate(SCAN)))
                assert 'LV.' not in page.locator('body').inner_text()
                assert 'XP' not in page.locator('body').inner_text()
            page.evaluate("location.hash='#/try'")
            page.wait_for_selector('[data-restart]')
            restart(page)
    page.emulate_media(color_scheme='light', reduced_motion='no-preference')
    for width in [360,390,430,1280]:
        page.set_viewport_size({'width':width,'height':844 if width<500 else 900})
        for route in routes:
            page.evaluate('(r)=>location.hash="#"+r',route)
            page.wait_for_timeout(520 if route=='/try' else 70)
            data=page.evaluate(SCAN)
            reports.append(dict(route=route,width=width,**data))
            if width in [390,1280] and route in ['/','/tasks','/company','/gov','/mentor','/onepage','/verify/TPE-PW-2026-BA58C8','/try/review','/portfolio','/work/co-logistics-cs']:
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
    p2.locator('[data-choice][data-value="2"]').click()
    next_step(p2, '說明')
    p2.locator('[data-choice][data-value="2"]').click()
    next_step(p2, '拿證明')
    assert p2.locator('.try-stamp').evaluate("e=>getComputedStyle(e).animationName")=='state-fade'
    assert p2.locator('.try-stamp').evaluate("e=>getComputedStyle(e).transform")=='none'
    p2.locator('a[href="#/verify/TPE-TRY-2026"]').click()
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
        for route in ['/','/tasks','/portfolio','/company','/gov','/mentor','/verify/TPE-PW-2026-BA58C8','/try/review','/verify/TPE-TRY-2026','/squad','/learn','/about']:
            p2.evaluate('(r)=>location.hash="#"+r',route)
            p2.wait_for_timeout(40)
            reports.append(dict(route=route+' (dark/file/storage denied)',width=width,**p2.evaluate(SCAN)))
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
