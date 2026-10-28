"""C 版可重產截圖：python tools/design_capture.py [round-name]。只開本機 Chrome。"""
import json
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'design-shots' / (sys.argv[1] if len(sys.argv) > 1 else 'final')
OUT.mkdir(parents=True, exist_ok=True)

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()
BASE = f'http://127.0.0.1:{server.server_port}/index.html'

SCAN = """() => {
  const visible = e => { const r=e.getBoundingClientRect(); return r.width && r.height && getComputedStyle(e).visibility !== 'hidden' && !e.closest('svg'); };
  const bodyText = [...document.querySelectorAll('#view p,#view blockquote,#view .prose,#view .doc,#view .candidate-quote,#view .chat-bubble')].filter(visible);
  const controls = [...document.querySelectorAll('a,button,summary,input,select,textarea')].filter(visible).filter(e => !e.disabled && !e.closest('.sr-only') && !(['checkbox','radio'].includes(e.type) && e.closest('label')));
  return {overflow:document.documentElement.scrollWidth>innerWidth, smallBody:bodyText.filter(e=>parseFloat(getComputedStyle(e).fontSize)<16).map(e=>({cls:e.className,text:e.textContent.slice(0,40),size:getComputedStyle(e).fontSize})), smallControls:controls.filter(e=>{const r=e.getBoundingClientRect();return r.width<43.9||r.height<43.9}).map(e=>({text:e.textContent.slice(0,30),w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})), theme:document.documentElement.dataset.theme};
}"""

def settle(p):
    p.evaluate('document.fonts.ready')
    p.wait_for_timeout(550)

def next_step(p):
    p.locator('[data-next]').click()
    settle(p)

reports = []
errors, external = [], []
try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel='chrome', headless=True)
        for theme in ['light', 'dark']:
            context = browser.new_context(viewport={'width':390,'height':780}, device_scale_factor=2, is_mobile=True, has_touch=True, color_scheme=theme)
            page = context.new_page()
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.on('request', lambda r: external.append(r.url) if r.url.startswith('http') and not r.url.startswith('http://127.0.0.1:') else None)
            page.goto(BASE+'#/')
            page.evaluate('(t)=>APP.theme.set(t)', theme)
            page.reload()
            settle(page)

            def capture(name, full=True):
                reports.append({'screen':name,'theme':theme,'width':page.viewport_size['width'],**page.evaluate(SCAN)})
                page.screenshot(path=str(OUT/f'{theme}-{name}.png'))
                if full:
                    page.screenshot(path=str(OUT/f'{theme}-{name}-full.png'),full_page=True)

            capture('home')
            if theme=='light': page.screenshot(path=str(ROOT/'design-shots/cover.png'))
            page.locator('.home-action a').click()
            settle(page)
            capture('try-1')
            next_step(page)
            page.locator('[data-row-pick="3"]').click()
            page.locator('[data-row-pick="4"]').click()
            page.wait_for_timeout(700)
            page.locator('.try-feedback').evaluate("e=>e.scrollIntoView({block:'center'})")
            # Keep the feedback above both fixed bars, as the actual interaction does.
            page.evaluate("()=>{const b=document.querySelector('.try-feedback').getBoundingClientRect(), d=document.querySelector('.try-dock').getBoundingClientRect();if(b.bottom>d.top-16)window.scrollBy(0,b.bottom-d.top+16)}")
            capture('try-2-caught')
            if theme=='light': page.screenshot(path=str(ROOT/'design-shots/inner.png'))
            next_step(page)
            capture('try-3')
            page.locator('[data-choice="adjustment"][data-value="0"]').click()
            next_step(page)
            capture('try-4')
            page.locator('[data-choice="reason"][data-value="1"]').click()
            next_step(page)
            capture('try-5')
            for name,route in [('review','try/review'),('verify','verify/TPE-PW-2026-BA58C8'),('try-verify','verify/TPE-TRY-2026'),('company','company'),('gov','gov'),('tasks','tasks'),('resume','resume'),('learn','learn'),('about','about'),('work','work/co-logistics-cs')]:
                if name=='work': page.evaluate("APP.store.ensureAttempt('co-logistics-cs')")
                page.evaluate('(r)=>location.hash="#/"+r',route)
                settle(page)
                page.evaluate('window.scrollTo(0,0)')
                capture(name)
            for width,height in [(360,780),(768,900),(1280,900)]:
                page.set_viewport_size({'width':width,'height':height})
                for name,route in [('home',''),('company','company'),('gov','gov'),('verify','verify/TPE-PW-2026-BA58C8'),('tasks','tasks'),('work','work/co-logistics-cs')]:
                    page.evaluate('(r)=>location.hash="#/"+r',route)
                    settle(page)
                    page.evaluate('window.scrollTo(0,0)')
                    capture(f'{name}-{width}',full=False)
            context.close()
        browser.close()
finally:
    server.shutdown()
OUT.joinpath('measurements.json').write_text(json.dumps({'reports':reports,'errors':errors,'external':external},ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'screens':len(reports),'errors':errors,'external':external,'overflow':[r['screen'] for r in reports if r['overflow']],'smallBody':[{'screen':r['screen'],'theme':r['theme'],'items':r['smallBody']} for r in reports if r['smallBody']],'smallControls':[{'screen':r['screen'],'items':r['smallControls']} for r in reports if r['smallControls']]},ensure_ascii=False))
