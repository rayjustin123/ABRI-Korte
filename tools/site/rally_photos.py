"""Web photos of the Friendly Rally (Nov 22, 2026) for the results on both pages -> rally/ at the site root.

  python3 -I tools/site/rally_photos.py <folder of the rally photos as IMG_xxxx.jpg> [--sheet check.jpg]

The photos are RJ's from the "ABRI Korte Tourna" Drive folder. Each one is turned to sRGB, given the same light
grade as the recap Reel, cropped (boxes below, in each photo's own pixels) and saved twice:
name.jpg (large) and name-s.jpg (half size, for phones and the gallery grid).
"""
import io
import os
import sys

import numpy as np
from PIL import Image, ImageCms

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
OUT = os.path.join(ROOT, "rally")

# name: (photo, crop box x0, y0, x1, y1, large size)
CROPS = {
    "champions": ("9302", (250, 1200, 2250, 3700), (960, 1200)),
    "second":    ("9300", (360, 1250, 2360, 3750), (960, 1200)),
    "third":     ("9298", (370, 950, 2530, 3650), (960, 1200)),
    "podium":    ("9305", (0, 525, 3000, 2400), (1600, 1000)),
    "squad":     ("9310", (0, 300, 3200, 2300), (1600, 1000)),
    "barkada":   ("9257", (0, 400, 3200, 2400), (1600, 1000)),
    "medals":    ("9296", (0, 1067, 2560, 4267), (800, 1000)),
    "serve":     ("9161", (1280, 0, 3200, 2400), (800, 1000)),
    "rally-1":   ("9203", (450, 1300, 2450, 3800), (800, 1000)),
    "rally-2":   ("9163", (0, 1100, 2400, 4100), (800, 1000)),
    "rally-3":   ("9245", (325, 1500, 2325, 4000), (800, 1000)),
    "rally-4":   ("9248", (50, 1600, 1850, 3850), (800, 1000)),
}

SRGB = ImageCms.createProfile("sRGB")


def load(path):
    im = Image.open(path)
    icc = im.info.get("icc_profile")
    im = im.convert("RGB")
    if icc:
        im = ImageCms.profileToProfile(im, ImageCms.ImageCmsProfile(io.BytesIO(icc)), SRGB, outputMode="RGB")
    return im


def grade(im):
    a = np.asarray(im).astype(np.float32) / 255.0
    lum = 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]
    lo, hi = np.percentile(lum[::4, ::4], [0.4, 99.6])
    lo, hi = min(lo, 0.05) * 0.7, max(hi, 0.86)
    a = np.clip((a - lo) / (hi - lo), 0, 1)
    a = a * 0.8 + (a * a * (3 - 2 * a)) * 0.2
    l = (0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2])[..., None]
    a = l + (a - l) * 1.12
    a[..., 0] *= 1.015
    a[..., 2] *= 0.985
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))


def main():
    src = sys.argv[1]
    sheet = sys.argv[sys.argv.index("--sheet") + 1] if "--sheet" in sys.argv else None
    os.makedirs(OUT, exist_ok=True)
    thumbs = []
    for name, (key, box, size) in CROPS.items():
        im = grade(load(os.path.join(src, "IMG_%s.jpg" % key)))
        x0, y0, x1, y1 = box
        x1, y1 = min(x1, im.width), min(y1, im.height)
        big = im.resize(size, Image.LANCZOS, box=(x0, y0, x1, y1))
        big.save(os.path.join(OUT, name + ".jpg"), quality=80, optimize=True, progressive=True)
        small = big.resize((size[0] // 2, size[1] // 2), Image.LANCZOS)
        small.save(os.path.join(OUT, name + "-s.jpg"), quality=78, optimize=True, progressive=True)
        kb = (os.path.getsize(os.path.join(OUT, name + ".jpg")) + os.path.getsize(os.path.join(OUT, name + "-s.jpg"))) // 1024
        print("%-10s IMG_%s %s -> %dx%d, %d KB" % (name, key, box, size[0], size[1], kb))
        thumbs.append((name, small))
    if sheet:
        h = 300
        tiles = [t.resize((round(t.width * h / t.height), h)) for _, t in thumbs]
        W = sum(t.width for t in tiles) + 8 * (len(tiles) - 1)
        out = Image.new("RGB", (W, h), "white")
        x = 0
        for t in tiles:
            out.paste(t, (x, 0))
            x += t.width + 8
        out.save(sheet, quality=85)


if __name__ == "__main__":
    main()
