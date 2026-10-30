"""Step 1 of a new point-cloud player: relative depth and a person mask for a photo.

  python3 -I tools/point-cloud/depth_mask.py photo.jpg work_dir

Needs two ONNX models in tools/point-cloud/models/ (or the folder in $ABRI_MODELS), not kept in git:
  depth_anything_v2_vits.onnx   Depth Anything V2 Small, exported with a fixed 518x518 input
  u2net_human_seg.onnx          U2Net human segmentation (the one rembg uses)
pip install onnxruntime numpy pillow

Writes into work_dir: src.png (the photo), depth.npy, mask.npy and three previews (depth_vis, mask_vis, cut_vis).
Look at cut_vis.png: the person model leaves out things held away from the body (a paddle), and
pack_player.py adds those back from the depth map.
"""
import os
import sys

import numpy as np
import onnxruntime as ort
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
M = os.environ.get("ABRI_MODELS") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
im = Image.open(src).convert("RGB")
im.save(os.path.join(out, "src.png"))
W, H = im.size
arr = np.asarray(im).astype(np.float32) / 255.0
mean = np.array([0.485, 0.456, 0.406], np.float32)
std = np.array([0.229, 0.224, 0.225], np.float32)

# depth (bright = near after normalising)
s = ort.InferenceSession(os.path.join(M, "depth_anything_v2_vits.onnx"), providers=["CPUExecutionProvider"])
inp = s.get_inputs()[0]
DW, DH = 518, 518  # the export takes a fixed 518 square
x = (np.asarray(im.resize((DW, DH), Image.BICUBIC)).astype(np.float32) / 255.0 - mean) / std
x = x.transpose(2, 0, 1)[None].astype(np.float32)
d = np.squeeze(s.run(None, {inp.name: x})[0])
d = np.asarray(Image.fromarray(d.astype(np.float32)).resize((W, H), Image.BICUBIC))

# person mask
s2 = ort.InferenceSession(os.path.join(M, "u2net_human_seg.onnx"), providers=["CPUExecutionProvider"])
i2 = s2.get_inputs()[0]
y = np.asarray(im.resize((320, 320), Image.LANCZOS)).astype(np.float32)
y = y / max(1.0, y.max())
y = ((y - mean) / std).transpose(2, 0, 1)[None].astype(np.float32)
m = s2.run(None, {i2.name: y})[0][0, 0]
m = (m - m.min()) / (m.max() - m.min() + 1e-6)
m = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).resize((W, H), Image.LANCZOS)).astype(np.float32) / 255.0

np.save(os.path.join(out, "depth.npy"), d)
np.save(os.path.join(out, "mask.npy"), m)
dn = (d - d.min()) / (d.max() - d.min())
Image.fromarray((dn * 255).astype(np.uint8)).save(os.path.join(out, "depth_vis.png"))
Image.fromarray((m * 255).astype(np.uint8)).save(os.path.join(out, "mask_vis.png"))
Image.fromarray((arr * m[..., None] * 255).astype(np.uint8)).save(os.path.join(out, "cut_vis.png"))
print("ok", W, H, "->", out)
