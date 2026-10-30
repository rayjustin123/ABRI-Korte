"""Render an HTML post template to a JPG (screenshot of its #post box).

  python3 tools/social/post/render_post.py tools/social/post/team_post.html out.jpg [--photo team.jpg] [--size 1080x1350]

--photo prepares the photo the template shows (work/team.jpg next to the template): scaled to 1080 wide with a
light brightness, contrast and sharpening lift. Fonts and the logo mark load from tools/node_modules and
tools/social/assets, so run `npm install` in tools/ first. pip install playwright pillow
"""
import argparse
import os

from PIL import Image, ImageEnhance, ImageFilter
from playwright.sync_api import sync_playwright

ap = argparse.ArgumentParser()
ap.add_argument("page")
ap.add_argument("out")
ap.add_argument("--photo")
ap.add_argument("--size", default="1080x1350")
a = ap.parse_args()
w, h = (int(v) for v in a.size.split("x"))
page = os.path.abspath(a.page)

if a.photo:
    work = os.path.join(os.path.dirname(page), "work")
    os.makedirs(work, exist_ok=True)
    im = Image.open(a.photo).convert("RGB")
    im = im.resize((1080, round(1080 * im.height / im.width)), Image.LANCZOS)
    im = ImageEnhance.Brightness(im).enhance(1.06)
    im = ImageEnhance.Contrast(im).enhance(1.04)
    im = ImageEnhance.Color(im).enhance(1.03)
    im = im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=40, threshold=2))
    im.save(os.path.join(work, "team.jpg"), quality=95)

with sync_playwright() as p:
    b = p.chromium.launch(args=["--allow-file-access-from-files"])
    pg = b.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
    pg.goto("file://" + page)
    pg.evaluate("() => window.ready")
    png = os.path.splitext(a.out)[0] + ".png"
    pg.screenshot(path=png, clip={"x": 0, "y": 0, "width": w, "height": h})
    b.close()
Image.open(png).convert("RGB").save(a.out, quality=93, subsampling=0)
os.remove(png)
print(a.out)
