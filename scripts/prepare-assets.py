"""仅用于将原创生成图片转成网页 WebP；不改变人物或绘画内容。
运行时传入本机 art-input.json 路径。游戏运行不依赖 Python。
"""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parent.parent
items = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8-sig'))
for item in items:
    name = item['name']
    image = Image.open(item['source'])
    directory = 'characters' if name in ('male', 'female') else 'backgrounds'
    if directory == 'backgrounds':
        image.thumbnail((1440, 810))
    target = root / 'assets' / directory / (name + '.webp')
    image.save(target, 'WEBP', quality=88, method=6)
    print(name, image.size, target.stat().st_size)
# 图标用原创校园书页符号，无第三方字体或商标。
for size, filename in [(192,'icon-192.png'),(512,'icon-512.png'),(180,'apple-touch-icon.png')]:
    im=Image.new('RGB',(size,size),'#eaf0eb');d=ImageDraw.Draw(im)
    def coords(values):return tuple(round(v*size/512) for v in values)
    d.rounded_rectangle(coords((48,48,464,464)),radius=round(size*.12),fill='#527f86')
    d.polygon([coords(p) for p in [(120,150),(240,170),(240,370),(120,345)]],fill='#fff9e8')
    d.polygon([coords(p) for p in [(265,170),(392,150),(392,345),(265,370)]],fill='#d7e8df')
    d.ellipse(coords((349,92,397,140)),fill='#dec48b')
    im.save(root/'assets/icons'/filename)
