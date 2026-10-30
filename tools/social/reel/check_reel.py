"""Contact sheet of the finished Reel with the Instagram Reels UI zones drawn on top.

  python3 check_reel.py reel.mp4 0.3,1.0,... out.jpg
"""
import os
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw

src, times, out = sys.argv[1], [float(t) for t in sys.argv[2].split(",")], sys.argv[3]
tmp = tempfile.mkdtemp()
tiles = []
for t in times:
    fn = os.path.join(tmp, "f_%05.2f.png" % t)
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", str(t), "-i", src, "-frames:v", "1", fn], check=True)
    im = Image.open(fn).convert("RGB")
    ov = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    # approximate Reels UI: top bar, bottom caption block, right action column
    d.rectangle([0, 0, 1080, 200], outline=(255, 0, 80, 200), width=4)
    d.rectangle([0, 1520, 1080, 1920], outline=(255, 0, 80, 200), width=4)
    d.rectangle([950, 1050, 1080, 1520], outline=(255, 0, 80, 200), width=4)
    im = Image.alpha_composite(im.convert("RGBA"), ov).convert("RGB")
    im = im.resize((360, 640), Image.LANCZOS)
    ImageDraw.Draw(im).text((8, 8), "%.2fs" % t, fill=(255, 255, 0))
    tiles.append(im)
cols = min(len(tiles), 5)
rows = (len(tiles) + cols - 1) // cols
sheet = Image.new("RGB", (cols * 370 - 10, rows * 650 - 10), "white")
for i, im in enumerate(tiles):
    sheet.paste(im, ((i % cols) * 370, (i // cols) * 650))
sheet.save(out, quality=88)
print(out, sheet.size)
