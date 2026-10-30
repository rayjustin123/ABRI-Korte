"""Step 2 of a new point-cloud player: cut the player out and pack him for the How booking works section.

  python3 -I tools/point-cloud/pack_player.py work_dir out_dir [--height 370] [--paddle x0,y0,x1,y1] [--paddle-depth 0.25]

work_dir is the folder from depth_mask.py. --paddle is a box in photo pixels around anything the person mask
missed (the paddle); inside it, pixels nearer than --paddle-depth (0 = far, 1 = near) are added to the cut-out.
Writes out_dir/player.jpg (the cropped photo) and out_dir/player-depth.png (R = depth, near is bright;
G = the player's outline), scaled to --height pixels tall. About 280x370 keeps the cloud near 68k points on
desktop and 32k on phones. Copy both into src/home/, rebuild the home page, and update the fallback image
size and alt text in src/home/body.html.
pip install numpy pillow opencv-python-headless
"""
import argparse
import os

import cv2
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("work")
ap.add_argument("out")
ap.add_argument("--height", type=int, default=370)
ap.add_argument("--paddle", help="x0,y0,x1,y1 box in photo pixels")
ap.add_argument("--paddle-depth", type=float, default=0.25)
a = ap.parse_args()

im = np.asarray(Image.open(os.path.join(a.work, "src.png")).convert("RGB"))
d = np.load(os.path.join(a.work, "depth.npy")).astype(np.float32)
d = (d - d.min()) / (d.max() - d.min())
m = np.load(os.path.join(a.work, "mask.npy")).astype(np.float32)
H, W = d.shape
mask = m
if a.paddle:
    x0, y0, x1, y1 = (int(v) for v in a.paddle.split(","))
    yy, xx = np.mgrid[0:H, 0:W]
    box = (xx >= x0) & (xx <= x1) & (yy >= y0) & (yy <= y1)
    pad = ((d > a.paddle_depth) & box).astype(np.uint8)
    pad = cv2.morphologyEx(pad, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    pad = cv2.dilate(pad, np.ones((3, 3), np.uint8), iterations=1).astype(np.float32)
    mask = np.maximum(m, cv2.GaussianBlur(pad, (0, 0), 0.9))
mask = np.clip((mask - 0.15) / 0.7, 0, 1)
# keep the biggest piece (the player and what he holds)
bw = (mask > 0.5).astype(np.uint8)
n, lab, stats, _ = cv2.connectedComponentsWithStats(bw, 8)
keep = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
near = cv2.dilate((lab == keep).astype(np.uint8), np.ones((5, 5), np.uint8), iterations=2)
mask = mask * near
ys, xs = np.where(mask > 0.3)
x0, x1 = max(0, xs.min() - 16), min(W, xs.max() + 17)
y0, y1 = max(0, ys.min() - 14), min(H, ys.max() + 15)
sel = mask > 0.5
lo, hi = np.percentile(d[sel], 1), np.percentile(d[sel], 99.5)
dn = np.clip((d - lo) / (hi - lo), 0, 1)
crop = lambda arr: arr[y0:y1, x0:x1]
s = a.height / (y1 - y0)
tw, th = max(1, round((x1 - x0) * s)), a.height
photo = Image.fromarray(crop(im)).resize((tw, th), Image.LANCZOS)
dn_s = np.asarray(Image.fromarray(crop(dn).astype(np.float32)).resize((tw, th), Image.BILINEAR))
mk_s = np.asarray(Image.fromarray(crop(mask).astype(np.float32)).resize((tw, th), Image.BILINEAR))
mk_s = cv2.erode(mk_s, np.ones((3, 3), np.uint8))   # drop the soft rim, where the background shows through
R = (1 + np.clip(dn_s, 0, 1) * 254).astype(np.uint8)
G = (np.clip(mk_s, 0, 1) * 255).astype(np.uint8)
R[G < 8] = 0
R = np.where(R > 0, np.maximum(1, (R // 4) * 4), 0).astype(np.uint8)          # 64 depth levels
G = ((G // 16) * 16 + 8 * (G >= 16)).clip(0, 255).astype(np.uint8)             # 16 outline levels
G[R == 0] = 0
os.makedirs(a.out, exist_ok=True)
photo.save(os.path.join(a.out, "player.jpg"), quality=88, optimize=True, progressive=True)
Image.fromarray(np.dstack([R, G, np.zeros_like(R)])).save(os.path.join(a.out, "player-depth.png"), optimize=True)
cut = (np.asarray(photo).astype(np.float32) * (G[..., None] / 255.0)).astype(np.uint8)
Image.fromarray(cut).save(os.path.join(a.work, "cut_final.png"))
for f in ("player.jpg", "player-depth.png"):
    print(f, os.path.getsize(os.path.join(a.out, f)), "bytes")
print("crop", x0, x1, y0, y1, "-> size", tw, th, "player px", int((G > 128).sum()))
