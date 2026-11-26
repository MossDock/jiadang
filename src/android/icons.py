#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""家当 v1.0 全套图标生成器 —— 纯几何自绘，不含任何第三方素材。

设计 DNA：暖米纸底 + 墨绿「物品登记卡」+ 三条清单线 + 陶土橙标记点。
与旧版「深绿渐变底 + 白色圆角块 + 房子轮廓」在底色、图形、语义上完全不同，
确保用户桌面、PWA、预览图里不再残留旧品牌视觉。

所有图形均由 PIL 的圆角矩形 / 线段 / 圆构成，不使用字体、不引用图标库、
不嵌入图片，因此不存在字体嵌入、图标库许可或素材授权问题。
"""
import os
from PIL import Image, ImageDraw

PAPER = (246, 242, 234)      # 暖米纸
PAPER_D = (237, 231, 220)    # 暖米纸（底部略深，做极轻渐变）
GREEN = (36, 86, 74)         # 墨松绿
GREEN_D = (29, 70, 59)       # 墨松绿（深）
CLAY = (201, 123, 69)        # 陶土橙
LINE = (246, 242, 234)       # 卡片上的清单线（暖米）


def _capsule(d, p1, p2, w, fill):
    """带圆头的线段。"""
    d.line([p1, p2], fill=fill, width=w)
    r = w // 2
    for (x, y) in (p1, p2):
        d.ellipse([x - r, y - r, x + r, y + r], fill=fill)


def make_icon(S, transparent=False, compact=False):
    """绘制 SxS 图标。

    transparent=True 用于 Android adaptive foreground（透明底，由系统提供背景）；
    compact=True 把图形收进中心安全区，用于 maskable / adaptive foreground。
    """
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0) if transparent else PAPER + (255,))
    d = ImageDraw.Draw(im)

    if not transparent:
        # 极轻的暖米纸纵向渐变，纯色块亦可，仅为质感
        for y in range(S):
            t = y / max(1, S - 1)
            c = tuple(int(PAPER[i] + (PAPER_D[i] - PAPER[i]) * t) for i in range(3))
            d.line([(0, y), (S, y)], fill=c + (255,))

    k = 0.60 if compact else 0.82

    def P(x, y):
        return (S * (0.5 + (x - 0.5) * k), S * (0.5 + (y - 0.5) * k))

    # --- 墨绿「物品登记卡」 ---
    x0, y0 = P(0.18, 0.17)
    x1, y1 = P(0.82, 0.83)
    rad = int(S * 0.145 * k)
    d.rounded_rectangle([x0, y0, x1, y1], radius=rad, fill=GREEN + (255,))
    # 卡片右侧一条极窄深色边，增强层次
    d.rounded_rectangle([x0, y0, x1, y1], radius=rad,
                        outline=GREEN_D + (255,), width=max(1, int(S * 0.006)))

    # --- 标题条 ---
    _capsule(d, P(0.27, 0.325), P(0.55, 0.325),
             max(2, int(S * 0.048 * k)), LINE + (255,))

    # --- 右上角陶土橙标记点（提醒 / 待办） ---
    cx, cy = P(0.715, 0.325)
    r = S * 0.048 * k
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=CLAY + (255,))

    # --- 三条清单线 + 每行左侧陶土橙圆点 ---
    lw = max(2, int(S * 0.031 * k))
    for i, yy in enumerate((0.485, 0.595, 0.705)):
        dx, dy = P(0.255, yy)
        rr = S * 0.017 * k
        d.ellipse([dx - rr, dy - rr, dx + rr, dy + rr], fill=CLAY + (255,))
        _capsule(d, P(0.315, yy), P(0.735 if i != 2 else 0.615, yy),
                 lw, LINE + (255,))

    return im


def make_pwa_icons(outdir):
    """PWA / 网页用图标：icon-192、icon-512、maskable、favicon、apple-touch。"""
    os.makedirs(outdir, exist_ok=True)
    spec = [
        ('icon-192.png', 192, False, False),
        ('icon-512.png', 512, False, False),
        ('icon-maskable-512.png', 512, False, True),
        ('favicon.png', 64, False, False),
        ('apple-touch-icon.png', 180, False, False),
    ]
    for name, sz, tr, cp in spec:
        make_icon(sz * 3, tr, cp).resize((sz, sz), Image.LANCZOS).save(
            os.path.join(outdir, name))
    return len(spec)


def make_android_icons(resdir):
    """Android launcher 五档密度 + adaptive foreground / round xml。"""
    dens = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
    for d, sz in dens.items():
        p = os.path.join(resdir, 'mipmap-' + d)
        os.makedirs(p, exist_ok=True)
        make_icon(sz * 4).resize((sz, sz), Image.LANCZOS).convert('RGB').save(
            os.path.join(p, 'ic_launcher.png'))
        fg = int(sz * 108 / 48)
        make_icon(fg * 3, transparent=True, compact=True).resize(
            (fg, fg), Image.LANCZOS).save(
            os.path.join(p, 'ic_launcher_foreground.png'))

    v26 = os.path.join(resdir, 'mipmap-anydpi-v26')
    os.makedirs(v26, exist_ok=True)
    xml = ('<?xml version="1.0" encoding="utf-8"?>\n'
           '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
           '  <background android:drawable="@color/ic_bg"/>\n'
           '  <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n'
           '</adaptive-icon>\n')
    open(os.path.join(v26, 'ic_launcher.xml'), 'w').write(xml)
    open(os.path.join(v26, 'ic_launcher_round.xml'), 'w').write(xml)
    return len(dens)


if __name__ == '__main__':
    import os
    _here = os.path.dirname(os.path.abspath(__file__))
    _web = os.path.join(os.path.dirname(_here), 'web')
    print('PWA icons:', make_pwa_icons(os.path.join(_web, 'icons')))
    print('Android icons:', make_android_icons(os.path.join(_here, 'res')))
