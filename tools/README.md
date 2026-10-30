# Tools

Working tools for the Abri Korte site and its social media posts. Nothing in this folder is part of the website.

## Setup, once per computer

- Python 3.10 or newer:
  `pip install playwright pillow numpy opencv-python-headless onnxruntime`, then `python -m playwright install chromium`
- Node: `cd tools && npm install`. This keeps local copies of three.js, Matter.js, GSAP and the Poppins and Barlow fonts, so the tests and renders work without the CDNs.
- ffmpeg with zscale (libzimg), for the Reel tools only.
- For a new point-cloud player only: put `depth_anything_v2_vits.onnx` (Depth Anything V2 Small, fixed 518x518 input) and `u2net_human_seg.onnx` (U2Net human segmentation, as used by rembg) in `tools/point-cloud/models/`, or point `ABRI_MODELS` at their folder. They are too big for git.

Run everything from the repo root. The `.sh` scripts need bash (Git Bash or WSL on Windows).

## site/: page tests

| Script | What it does |
| --- | --- |
| `harness.py [desk phone ...] [--only court,how]` | Builds the home page into `site/build/`, serves it, screenshots every section into `site/shots/`, prints errors and measurements. Scenarios: desk, desk-dark, phone, phone-dark, tablet, small, laptop. |
| `booking_screens.py` | The booking page tabs, light and dark, phone and desktop. |
| `booking_flow.py` | Picks a slot, changes hours and rentals, checks the Messenger message, the Today chip, the Nov 21 tournament block and the Home link. |
| `edge_tests.py` | Reduced motion, no WebGL, and the inlined preview build. |
| `hero_probe.py` | Where the hero pickleballs settle on each screen size. |
| `rebuild_booking.py [--tourney]` | Rebuilds `index.html` from the template but keeps its schedule data. `--tourney` also takes the current `src/tourney.json`. |

The home page has test hooks: `window.__abriDt` fixes the frame time, `window.__abriHero.ff(seconds)` fast-forwards the hero physics, and `__abriCourt` and `__abriCloud` expose the court and the point cloud.

## point-cloud/: a new player for How booking works

```
python3 -I tools/point-cloud/depth_mask.py photo.jpg tools/point-cloud/work/new
python3 -I tools/point-cloud/pack_player.py tools/point-cloud/work/new tools/point-cloud/work/new/out --paddle x0,y0,x1,y1
```

Check `work/new/cut_vis.png` first. The person model leaves out a paddle held away from the body, and `--paddle` adds it back from the depth map (box in photo pixels). Copy `player.jpg` and `player-depth.png` from `out/` into `src/home/`, set the fallback image size and alt text in `src/home/body.html`, then rebuild the home page. The current player was made with `--paddle 195,570,390,765`.

## social/: Reels and posts

The Oct 29 "new regulation net" Reel, as a template for the next one:

```
tools/social/reel/prep_clips.sh /path/IMG_1552.MOV ...        # iPhone HDR clips to SDR copies (ZOOM=1 for crop-ins)
python3 tools/social/reel/build_base.py tools/social/reel/cfg.json                  # cut the shots in cfg.json
python3 tools/social/reel/render_ov.py tools/social/reel/cfg.json --at 1.6,5,10.6 --bg tools/social/reel/work/base.mp4
python3 tools/social/reel/render_ov.py tools/social/reel/cfg.json --all             # every text frame
tools/social/reel/mux.sh tools/social/reel/work/reel.mp4 12.5                       # final 1080x1920 Reel, silent track
python3 tools/social/reel/check_reel.py tools/social/reel/work/reel.mp4 0.5,3,6,9,12 check.jpg   # frames with the Reels UI zones
```

The words and animation are in `reel/overlay.html`, the timing in `reel/cfg.json`. The Reel has no music, so a trending sound can be added in the Facebook or Instagram app.

The team photo post (1080x1350):

```
python3 tools/social/post/render_post.py tools/social/post/team_post.html team-post.jpg --photo /path/IMG_1557.JPG
```

`social/assets/` holds the logo and the A mark used by both.
