"""決賽前第二輪截圖：python -X utf8 tools/finals2_capture.py [資料夾名，預設 final3]
390 深色、390 淺色、360、1280 桌機；走完 L1、L2 示範工單、企業邀請面試與成效追蹤。只開本機 Chrome。"""
import json
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'design-shots' / (sys.argv[1] if len(sys.argv) > 1 else 'final3')
OUT.mkdir(parents=True, exist_ok=True)


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()
BASE = f'http://127.0.0.1:{server.server_port}/index.html'

SCAN = """() => {
  const visible = e => { const r=e.getBoundingClientRect(); const s=getComputedStyle(e); return r.width && r.height && s.visibility !== 'hidden' && !e.closest('svg'); };
  const small = [...document.querySelectorAll('a,button,summary,input,select,textarea,[role=button]')].filter(visible).filter(e => !e.disabled && !e.closest('.sr-only') && !(['checkbox','radio'].includes(e.type) && e.closest('label'))).filter(e => {const r=e.getBoundingClientRect();return r.width < 43.9 || r.height < 43.9}).map(e => (e.innerText||e.outerHTML).slice(0,40));
  const tiny = [...document.querySelectorAll('body *')].filter(visible).filter(e => [...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize)<13).map(e=>e.textContent.slice(0,30));
  return {overflow: document.documentElement.scrollWidth > innerWidth, small, tiny};
}"""

CONFIGS = [('390-dark', 390, 'dark'), ('390-light', 390, 'light'), ('360-dark', 360, 'dark'), ('1280-dark', 1280, 'dark')]
TASKS = {
    'gov-youth-fair': dict(flags=[('table', 'row:reg:r8'), ('doc', 'claim:c2')], asks=['p2']),
    'l2-growth': dict(flags=[('table', 'row:f:r5'), ('doc', 'claim:g1')], asks=['g1']),
}
reports, errors, external = [], [], []


def settle(p, ms=350):
    p.evaluate('document.fonts.ready')
    p.wait_for_timeout(ms)


def go(p, h):
    p.evaluate('(h)=>location.hash=h', h)
    settle(p)


def run_task(p, tid, shot):
    spec = TASKS[tid]
    p.locator('[data-fill]').click(); p.locator('[data-clarify]').click(); settle(p, 150)
    shot(f'{tid}-1-understand')
    p.locator('[data-next]').click(); settle(p, 150)
    p.locator('[data-fill]').click(); p.locator('[data-next]').click(); settle(p, 200)
    for tab, key in spec['flags']:
        p.locator(f'[data-tab="{tab}"]').click()
        p.locator(f'[data-flag="{key}"]').first.click()
    p.locator('[data-tab="ai"]').click()
    for q in spec['asks']:
        p.locator(f'[data-ask="{q}"]').click()
        p.locator(f'[data-flag="ai:{q}"]').click()
    p.locator('[data-tab="table"]').click(); settle(p, 150)
    shot(f'{tid}-3-flags')
    p.locator('[data-fill]').click()
    p.locator('[data-next]').click(); settle(p, 300)
    shot(f'{tid}-3-change', full=False)
    p.locator('.modal-f .btn-primary').click(); settle(p, 150)
    p.locator('[data-fill]').click(); settle(p, 150)
    shot(f'{tid}-3-adjusted')
    p.locator('[data-next]').click(); settle(p, 150)
    p.locator('[data-fill]').click(); p.locator('[data-next]').click(); settle(p, 200)
    if p.locator('[data-peer-ask]').count():
        p.locator('[data-peer-ask]').click()
        p.locator('[data-peer-answer]').fill('我比對了原始資料才發現，交出去前每個數字都重算過。')
    shot(f'{tid}-5-submit')
    p.locator('[data-submit]').click(); settle(p, 300)
    for i in range(3):
        p.locator('[data-fill]').click()
        if i == 0:
            shot(f'{tid}-6-defense')
        p.locator('[data-dnext]').click(); settle(p, 300)
    settle(p, 900)
    shot(f'{tid}-7-result')


try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel='chrome', headless=True)
        for name, width, theme in CONFIGS:
            mobile = width < 500
            ctx = browser.new_context(viewport={'width': width, 'height': 780 if mobile else 900}, device_scale_factor=2 if mobile else 1, is_mobile=mobile, has_touch=mobile, color_scheme=theme)
            p = ctx.new_page()
            p.on('pageerror', lambda e: errors.append(str(e)))
            p.on('request', lambda r: external.append(r.url) if r.url.startswith('http') and not r.url.startswith('http://127.0.0.1:') else None)
            p.goto(BASE + '#/')
            p.evaluate('(t)=>APP.theme.set(t)', theme)
            settle(p)

            def shot(n, full=True):
                reports.append({'screen': n, 'cfg': name, **p.evaluate(SCAN)})
                p.screenshot(path=str(OUT / f'{name}-{n}.png'), full_page=full)

            shot('home', full=False)
            if mobile:
                p.locator('[data-menu]').click(); settle(p, 200)
                shot('menu', full=False)
                p.keyboard.press('Escape')
            for h, n in [('#/tasks', 'tasks'), ('#/task/l2-growth', 'l2-task'), ('#/squad', 'squad'), ('#/progress', 'progress'), ('#/portfolio', 'portfolio'), ('#/p/y0507', 'p-y0507'), ('#/verify/TPE-PW-2026-BA58C8', 'verify-BA58C8'), ('#/gov', 'gov-before'), ('#/company', 'company'), ('#/onepage', 'onepage')]:
                go(p, h)
                shot(n)
            go(p, '#/company')
            p.locator('[data-invite]').first.click(); settle(p, 150)
            shot('company-invite', full=False)
            p.locator('.modal-f .btn-primary').click(); settle(p, 300)
            shot('company-invited', full=False)
            go(p, '#/gov')
            p.locator('[data-funnel-interview]').scroll_into_view_if_needed(); settle(p, 150)
            shot('gov-after-invite', full=False)
            if name in ('390-dark', '1280-dark', '390-light'):
                # L2 示範工單全流程
                go(p, '#/task/l2-growth'); p.locator('[data-start]').click(); settle(p)
                run_task(p, 'l2-growth', shot)
                go(p, '#/gov'); p.locator('[data-funnel-interview]').scroll_into_view_if_needed(); settle(p, 150)
                shot('gov-after-l2', full=False)
                # L1 青年市集：重新挑戰走完
                p.evaluate("APP.redo('gov-youth-fair')"); settle(p)
                run_task(p, 'gov-youth-fair', shot)
                go(p, '#/progress'); shot('progress-after')
                go(p, '#/squad'); shot('squad-after')
            # 一鍵重設 → 空狀態
            go(p, '#/portfolio'); p.locator('[data-reset-now]').click(); settle(p)
            shot('portfolio-reset', full=False)
            go(p, '#/progress'); shot('progress-empty', full=False)
            ctx.close()
        browser.close()
finally:
    server.shutdown()
(OUT / 'report.json').write_text(json.dumps({'reports': reports, 'errors': errors, 'external': external}, ensure_ascii=False, indent=2), encoding='utf-8')
bad = [r for r in reports if r['overflow'] or (r['cfg'] != '1280-dark' and (r['small'] or r['tiny']))]
print(json.dumps({'shots': len(reports), 'errors': errors, 'external': external, 'bad': bad[:12]}, ensure_ascii=False, indent=1))
