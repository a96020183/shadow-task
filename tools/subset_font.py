"""把 Cubic 11 像素字型縮成只含網站用到的字（改過文字後重跑）：python tools/subset_font.py"""
import os, pathlib
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
chars = set()
for p in [ROOT / 'index.html', *(ROOT / 'assets/js').glob('*.js'), *(ROOT / 'assets/css').glob('*.css')]:
    chars |= set(p.read_text(encoding='utf8'))
chars |= {chr(c) for c in range(0x20, 0x7f)} | set('，。、；：？！「」『』（）—…・％＋－×÷＝｜／～→←↑↓✓✕★☆●○■□')
src, out = ROOT / 'assets/fonts/Cubic_11.woff2', ROOT / 'assets/fonts/Cubic_11-subset.woff2'
font = TTFont(src); cmap = font.getBestCmap()
opt = subset.Options(); opt.flavor = 'woff2'; opt.layout_features = ['*']; opt.name_IDs = ['*']; opt.name_languages = ['*']
s = subset.Subsetter(opt); s.populate(text=''.join(c for c in chars if ord(c) in cmap)); s.subset(font)
font.flavor = 'woff2'; font.save(out)
print(f'{os.path.getsize(src) // 1024} KB -> {os.path.getsize(out) // 1024} KB')
