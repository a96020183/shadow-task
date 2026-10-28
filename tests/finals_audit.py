"""本機驗收：python tests/finals_audit.py（需要已安裝的 Python Playwright 與 Chromium）。"""
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
    for step in range(1,6):
        page.wait_for_timeout(320)
        page.screenshot(path=str(OUT/f'try-{step}-390.png'),full_page=True)
        if step==2:
            page.locator('[data-claim="1"]').click()
            assert page.locator('[data-next]').is_disabled()
            page.locator('[data-claim="0"]').click()
        if step==3: page.locator('[data-choice][data-value="1"]').click()
        if step==4: page.locator('[data-choice][data-value="2"]').click()
        if step<5: page.locator('[data-next]').click()
    assert page.locator('.try-stamp').is_visible()
    page.locator('.try-dock a').click()
    assert page.locator('.onepage').is_visible()
    page.locator('a[href="#/verify/TPE-TRY-2026"]').click()
    assert page.locator('.try-stamp').is_visible()
    assert page.evaluate('JSON.stringify(APP.store.get())') == memory
    page.evaluate("window.dispatchEvent(new Event('pagehide'))")
    assert page.evaluate("localStorage.getItem('shadowtask.v1')") == snapshot
    page.reload()
    assert page.locator('a[href="#/try"]').count()>0
    assert page.evaluate("localStorage.getItem('shadowtask.v1')") == snapshot
    page.goto(base+'#/try')
    page.locator('[data-next]').click()
    page.locator('[data-claim="1"]').click()
    page.locator('[data-claim="1"]').click()
    assert '一起看答案' in page.locator('.try-feedback').inner_text()
    page.locator('[data-next]').click()
    page.locator('[data-choice][data-value="0"]').click()
    page.locator('[data-next]').click()
    page.locator('[data-choice][data-value="0"]').click()
    page.locator('[data-next]').click()
    assert '提示後確認' in page.locator('#view').inner_text()
    assert '這題還可以再練' in page.locator('#view').inner_text()
    assert page.evaluate("localStorage.getItem('shadowtask.v1')") == snapshot
    page.locator('[data-restart]').click()
    assert '1 / 5' in page.locator('.try-progress').inner_text()

    # All route families, including working and defense states, not just their redirects.
    page.evaluate("APP.store.ensureAttempt('co-logistics-cs')")
    candidates = page.evaluate('APP.CANDIDATES.map(c=>c.id)')
    taskids = page.evaluate('APP.TASKS.map(t=>t.id)')
    routes = ['/', '/try', '/tasks', '/portfolio', '/onepage', '/onepage?try=1', '/verify/TPE-PW-2026-BA58C8', '/verify/unknown', '/company','/gov','/mentor','/squad','/join/NIGHT7','/about','/learn','/work/co-logistics-cs','/result/gov-youth-fair','/result/co-coffee-retention','/not-found']
    routes += ['/task/'+i for i in taskids] + ['/p/'+i for i in candidates]
    reports = []
    # Each short-experience screen, including feedback, at all requested widths.
    for width in [360,390,430,1280]:
        page.set_viewport_size({'width':width,'height':740 if width<500 else 900})
        page.evaluate("location.hash='#/try'")
        page.wait_for_selector('[data-next]')
        for step in range(1,6):
            if step==2: page.locator('[data-claim="0"]').click()
            if step==3: page.locator('[data-choice][data-value="1"]').click()
            if step==4: page.locator('[data-choice][data-value="2"]').click()
            reports.append(dict(route='/try step '+str(step),width=width,**page.evaluate(SCAN)))
            dock = page.locator('.try-dock').bounding_box()
            assert dock['y']+dock['height'] <= page.viewport_size['height']+1
            assert page.locator('.try-dock .btn').bounding_box()['height']>=44
            if step<5: page.locator('[data-next]').click()
        page.locator('[data-restart]').click()
    for width in [360,390,430,1280]:
        page.set_viewport_size({'width':width,'height':844 if width<500 else 900})
        for route in routes:
            page.evaluate('(r)=>location.hash="#"+r',route)
            page.wait_for_timeout(60)
            data=page.evaluate(SCAN)
            reports.append(dict(route=route,width=width,**data))
            if width in [390,1280] and route in ['/','/tasks','/company','/gov','/mentor','/onepage','/verify/TPE-PW-2026-BA58C8','/work/co-logistics-cs']:
                page.screenshot(path=str(OUT/((route.strip('/').replace('/','_') or 'home')+f'-{width}.png')),full_page=True)
                page.screenshot(path=str(OUT/((route.strip('/').replace('/','_') or 'home')+f'-{width}-fold.png')))
    # Keep the original workflows usable with real interactions.
    page.set_viewport_size({'width':390,'height':844})
    page.evaluate("location.hash='#/tasks'")
    page.locator('.search input').fill('不存在的工單')
    assert page.locator('[data-empty]').is_visible()
    page.locator('.search input').fill('物流')
    assert page.locator('.quests a:visible').count()==1
    page.evaluate("location.hash='#/company'")
    page.locator('[data-grade-filter]').select_option('S')
    assert page.locator('[data-grade-filter]').input_value()=='S'
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
    p2.locator('[data-next]').click()
    p2.locator('[data-claim="0"]').click()
    p2.locator('[data-next]').click()
    p2.locator('[data-choice][data-value="1"]').click()
    p2.locator('[data-next]').click()
    p2.locator('[data-choice][data-value="2"]').click()
    p2.locator('[data-next]').click()
    assert p2.locator('.try-stamp').evaluate("e=>getComputedStyle(e).animationName")=='none'
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
        for route in ['/','/tasks','/portfolio','/company','/gov','/mentor','/verify/TPE-PW-2026-BA58C8','/squad','/learn','/about']:
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
