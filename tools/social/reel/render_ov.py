"""Render the text overlays (overlay.html, animated with GSAP) to transparent PNG frames.

  python3 tools/social/reel/render_ov.py tools/social/reel/cfg.json --at 0.8,5,10 [--bg tools/social/reel/work/base.mp4]
      preview stills, composited on the base edit when --bg is given -> work/prev/ (sheet.jpg shows them side by side)
  python3 tools/social/reel/render_ov.py tools/social/reel/cfg.json --all
      every frame at 30 fps -> work/frames/ov_0000.png ...

cfg sets the timing: b1 and b2 are [in, out] seconds for the two text beats, end is when the end card starts,
total is the Reel length. The words themselves are in overlay.html.
pip install playwright pillow, then `npm install` in tools/.
"""
import json
import os
import subprocess
import sys

from PIL import Image
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(HERE, "work")
FPS = 30


def main():
    cfg = json.load(open(sys.argv[1]))
    page_path = os.path.join(HERE, cfg.get("page", "overlay.html"))
    args = sys.argv[2:]
    times = [float(x) for x in args[args.index("--at") + 1].split(",")] if "--at" in args else None
    bg = args[args.index("--bg") + 1] if "--bg" in args else None
    outdir = os.path.join(WORK, cfg.get("out", "frames"))
    prev = os.path.join(WORK, "prev")
    os.makedirs(outdir, exist_ok=True)
    os.makedirs(prev, exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--allow-file-access-from-files"])
        pg = b.new_page(viewport={"width": 1080, "height": 1920}, device_scale_factor=1)
        pg.add_init_script("window.CFG = " + json.dumps(cfg) + ";")
        pg.goto("file://" + page_path)
        pg.evaluate("() => window.ready")
        stage = {"x": 0, "y": 0, "width": 1080, "height": 1920}
        if times is not None:
            outs = []
            for t in times:
                pg.evaluate("t => window.seek(t)", t)
                fn = os.path.join(prev, "ov_%05.2f.png" % t)
                pg.screenshot(path=fn, clip=stage, omit_background=True)
                if bg:
                    base = os.path.join(prev, "bg_%05.2f.png" % t)
                    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", str(t), "-i", bg,
                                    "-frames:v", "1", base], check=True)
                    im = Image.open(base).convert("RGBA")
                    im.alpha_composite(Image.open(fn))
                    im = im.convert("RGB")
                    im.save(fn.replace("ov_", "mix_").replace(".png", ".jpg"), quality=90)
                    outs.append(im)
            if outs:
                w = 360
                sheet = Image.new("RGB", (w * len(outs) + 10 * (len(outs) - 1), 640), "white")
                for i, im in enumerate(outs):
                    sheet.paste(im.resize((w, 640), Image.LANCZOS), (i * (w + 10), 0))
                sheet.save(os.path.join(prev, "sheet.jpg"), quality=88)
            print("previews ->", prev)
        else:
            n = int(round(cfg["total"] * FPS))
            for i in range(n):
                pg.evaluate("t => window.seek(t)", i / FPS)
                pg.screenshot(path=os.path.join(outdir, "ov_%04d.png" % i), clip=stage, omit_background=True)
            print("frames", n, "->", outdir)
        b.close()


if __name__ == "__main__":
    main()
