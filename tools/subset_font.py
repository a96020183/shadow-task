"""產生本站 OFL 字型子集（改過文字後重跑）：python tools/subset_font.py
- Cubic 11 像素字：只留英數與少數符號，中文不用像素字。
- Noto Sans TC Black：中文標題用，只含網站實際用到的字。
製作時若沒有 .font-cache/ 才會下載官方字型資料；網站執行時不外連。"""
import pathlib, urllib.request
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
FONTS = ROOT / 'assets/fonts'
chars = set()
for p in [ROOT / 'index.html', *(ROOT / 'assets/js').glob('*.js'), *(ROOT / 'assets/css').glob('*.css')]:
    chars |= set(p.read_text(encoding='utf8'))
chars |= {chr(c) for c in range(0x20, 0x7f)} | set('，。、；：？！「」『』（）—…・％＋－×÷＝｜／～→←↑↓✓✕★☆●○■□')

def build(font, text, out):
    opt = subset.Options(); opt.flavor = 'woff2'; opt.layout_features = ['*']
    s = subset.Subsetter(opt); s.populate(text=''.join(c for c in text if ord(c) in font.getBestCmap())); s.subset(font)
    return font

# 像素字：ASCII + · → 與網站用到的箭頭／勾號（對應 city.css 的 unicode-range）
PIXEL = {chr(c) for c in range(0x20, 0x7f)} | set('·→')
out = FONTS / 'Cubic_11-subset.woff2'
f = build(TTFont(FONTS / 'Cubic_11.woff2'), PIXEL, out); f.flavor = 'woff2'; f.save(out)
print(f'Cubic 11 pixel latin: {out.stat().st_size:,} bytes')

cache = ROOT / '.font-cache'; cache.mkdir(exist_ok=True)
src = cache / 'NotoSansTC-wght.ttf'
origin = 'https://raw.githubusercontent.com/google/fonts/main/ofl/notosanstc/'
if not src.exists(): urllib.request.urlretrieve(origin + 'NotoSansTC%5Bwght%5D.ttf', src)
if not (FONTS / 'NotoSansTC-OFL.txt').exists(): urllib.request.urlretrieve(origin + 'OFL.txt', FONTS / 'NotoSansTC-OFL.txt')
cjk = set(chars)  # 含英數，中英混排的標題才會同一個粗細
f = build(TTFont(src), cjk, None)
f = instantiateVariableFont(f, {'wght': 900}, inplace=True); f.flavor = 'woff2'
out = FONTS / 'NotoSansTC-Black-subset.woff2'; f.save(out)
assert out.stat().st_size <= 230 * 1024, 'Noto Sans TC Black subset should stay under 230 KB'
print(f'Noto Sans TC Black: {out.stat().st_size:,} bytes (OFL)')
