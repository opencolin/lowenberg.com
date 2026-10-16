#!/usr/bin/env python3
"""Regenerate assets/og.png (1200x630 Open Graph card).

Usage: python3 scripts/og.py
Requires Pillow. Downloads Newsreader Light, Newsreader Light Italic, and
Geist Mono from Google Fonts into a temp directory on each run.
"""
import io
import math
import os
import random
import re
import tempfile
import urllib.request

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 1200, 630
BG = (15, 15, 14)
BONE = (237, 232, 223)
BRASS = (201, 166, 107)
MUTED = (168, 163, 153)
FAINT = (113, 109, 101)

EYEBROW = "DEVELOPER RELATIONS  ·  AI AGENTS  ·  SAN FRANCISCO"
LINE1 = "Twenty years of building networks. Wireless, APIs,"
LINE2 = "developer communities, and now AI agents."


def fetch_fonts(tmp):
    """Google Fonts serves TTF URLs to old user agents."""
    css_url = "https://fonts.googleapis.com/css?family=Newsreader:300,300i|Geist+Mono:400"
    req = urllib.request.Request(css_url, headers={"User-Agent": "Mozilla/4.0"})
    css = urllib.request.urlopen(req, timeout=30).read().decode()
    fonts = {}
    for block in css.split("@font-face")[1:]:
        family = re.search(r"font-family: '([^']+)'", block).group(1)
        style = re.search(r"font-style: (\w+)", block).group(1)
        url = re.search(r"url\(([^)]+\.ttf)\)", block).group(1)
        path = os.path.join(tmp, f"{family}-{style}.ttf".replace(" ", ""))
        with open(path, "wb") as f:
            f.write(urllib.request.urlopen(url, timeout=30).read())
        fonts[(family, style)] = path
    return fonts


def main():
    random.seed(11)
    with tempfile.TemporaryDirectory() as tmp:
        fonts = fetch_fonts(tmp)
        reg = ImageFont.truetype(fonts[("Newsreader", "normal")], 132)
        ita = ImageFont.truetype(fonts[("Newsreader", "italic")], 132)
        mono = ImageFont.truetype(fonts[("Geist Mono", "normal")], 20)
        mono_s = ImageFont.truetype(fonts[("Geist Mono", "normal")], 17)

        im = Image.new("RGBA", (W, H), BG + (255,))
        d = ImageDraw.Draw(im, "RGBA")

        # Network field
        nodes = [(random.uniform(0, W), random.uniform(0, H)) for _ in range(64)]
        for i, a in enumerate(nodes):
            for b in nodes[i + 1:]:
                dist = math.hypot(a[0] - b[0], a[1] - b[1])
                if dist < 150:
                    d.line([a, b], fill=BONE + (int((1 - dist / 150) * 64),), width=1)
        for x, y in nodes:
            d.ellipse([x - 1.6, y - 1.6, x + 1.6, y + 1.6], fill=BONE + (130,))

        # Darken the left side for legibility
        grad = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        gd = ImageDraw.Draw(grad)
        for x in range(0, 780):
            gd.line([(x, 0), (x, H)], fill=BG + (int(225 * (1 - x / 780) ** 1.1),))
        im = Image.alpha_composite(im, grad)

        # Portrait
        portrait = Image.open(os.path.join(ROOT, "assets", "colin.jpg")).convert("RGB").resize((300, 300), Image.LANCZOS)
        px, py = W - 300 - 80, (H - 300) // 2
        d = ImageDraw.Draw(im, "RGBA")
        d.rectangle([px - 7, py - 7, px + 307, py + 307], outline=BONE + (45,), width=1)
        im.paste(portrait, (px, py))

        # Type
        d = ImageDraw.Draw(im, "RGBA")
        d.text((80, 150), EYEBROW, font=mono, fill=BRASS)
        d.text((76, 190), "Colin", font=reg, fill=BONE)
        d.text((76, 300), "Lowen", font=reg, fill=BONE)
        w = d.textlength("Lowen", font=reg)
        d.text((76 + w, 300), "berg", font=ita, fill=BRASS)
        d.text((80, 490), LINE1, font=mono, fill=MUTED)
        d.text((80, 518), LINE2, font=mono, fill=MUTED)
        d.text((80, 580), "lowenberg.com", font=mono_s, fill=FAINT)

        out = os.path.join(ROOT, "assets", "og.png")
        im.convert("RGB").save(out, optimize=True)
        print("wrote", out)


if __name__ == "__main__":
    main()
