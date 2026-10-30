"""Render the home page in headless Chromium, with local copies of the CDN libraries and fonts.

  python3 tools/site/harness.py [scenario ...] [--only court,how]
  scenarios: desk, desk-dark, phone, phone-dark, tablet, small, laptop   (default: desk phone)

Builds the home page into tools/site/build/site, serves it over http (the point cloud needs http to read its
images), screenshots each section into tools/site/shots/ and prints what it measured. Needs `npm install` in tools/.
Other scripts here import it for serve(), route() and frames().
"""
import functools
import http.server
import json
import os
import re
import subprocess
import sys
import threading

from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))
V = os.path.join(HERE, "..", "node_modules")
OUT = os.path.join(HERE, "shots")
BUILD = os.path.join(HERE, "build")
SITE = os.path.join(BUILD, "site")
ARTIFACT = os.path.join(BUILD, "abri-korte-home.html")
os.makedirs(OUT, exist_ok=True)
LOCAL = {
    "three@0.149.0/build/three.min.js": V + "/three/build/three.min.js",
    "matter-js@0.19.0/build/matter.min.js": V + "/matter-js/build/matter.min.js",
    "gsap@3.12.5/dist/gsap.min.js": V + "/gsap/dist/gsap.min.js",
    "gsap@3.12.5/dist/ScrollTrigger.min.js": V + "/gsap/dist/ScrollTrigger.min.js",
}
FONTS = (("barlow", ["300", "400", "500", "600"]), ("barlow-condensed", ["600", "700"]),
         ("poppins", ["300", "400", "500", "600", "700", "300-italic"]))
_built = False


def build():
    """Build the home page (site version and the inlined preview) from src/home into tools/site/build."""
    global _built
    if _built:
        return
    subprocess.run([sys.executable, os.path.join(ROOT, "src", "home", "build_home.py"),
                    "--site-out", SITE, "--artifact-out", ARTIFACT], check=True, stdout=subprocess.DEVNULL)
    _built = True


def font_css():
    out = []
    for pkg, weights in FONTS:
        for w in weights:
            css = open(os.path.join(V, "@fontsource", pkg, w + ".css"), encoding="utf-8").read()
            css = re.sub(r"url\(\./files/([^)]+)\)", lambda m: "url(https://fonts.gstatic.com/local/%s/%s)" % (pkg, m.group(1)), css)
            out.append(css)
    return "\n".join(out)


_font_css = None


def route(r):
    """Serve CDN scripts and Google Fonts from tools/node_modules; block every other outside request."""
    global _font_css
    u = r.request.url
    for k, p in LOCAL.items():
        if u.endswith(k):
            return r.fulfill(path=p, content_type="application/javascript")
    if u.startswith("https://fonts.googleapis.com/css2"):
        if _font_css is None:
            _font_css = font_css()
        return r.fulfill(body=_font_css, content_type="text/css")
    if u.startswith("https://fonts.gstatic.com/local/"):
        pkg, fn = u.split("/local/")[1].split("/", 1)
        return r.fulfill(path=os.path.join(V, "@fontsource", pkg, "files", fn), content_type="font/woff2")
    if u.startswith("http://127.0.0.1") or u.startswith("data:") or u.startswith("file://"):
        return r.continue_()
    return r.abort()


def serve(directory=None):
    """Serve the built home page (or another folder) on a free local port. Call .shutdown() when done."""
    if directory is None:
        build()
        directory = SITE
    h = functools.partial(http.server.SimpleHTTPRequestHandler, directory=directory)
    http.server.SimpleHTTPRequestHandler.log_message = lambda *a: None
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def launch(p):
    # SwiftShader gives headless Chromium software WebGL, so the three.js views render without a GPU
    return p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])


SCEN = {
    "desk": dict(w=1440, h=900, mobile=False, dark=False),
    "desk-dark": dict(w=1440, h=900, mobile=False, dark=True),
    "phone": dict(w=390, h=844, mobile=True, dark=False),
    "phone-dark": dict(w=390, h=844, mobile=True, dark=True),
    "tablet": dict(w=820, h=1180, mobile=True, dark=False),
    "small": dict(w=360, h=640, mobile=True, dark=False),
    "laptop": dict(w=1280, h=720, mobile=False, dark=False),
}
SECTIONS = ["court", "gear", "rates", "events", "tournament", "how", "visit"]


def context(b, name):
    s = SCEN[name]
    ctx = b.new_context(viewport={"width": s["w"], "height": s["h"]}, device_scale_factor=1,
                        is_mobile=s["mobile"], has_touch=s["mobile"])
    if s["dark"]:
        ctx.add_init_script("try{localStorage.setItem('abri-theme','dark')}catch(e){}")
    ctx.route("**/*", route)
    return ctx


def frames(pg, n=8):
    for _ in range(n):
        pg.evaluate("() => new Promise(r => requestAnimationFrame(() => r()))")


def run(names, only=None):
    srv = serve()
    url = "http://127.0.0.1:%d/index.html" % srv.server_address[1]
    res = {}
    with sync_playwright() as p:
        b = launch(p)
        for name in names:
            ctx = context(b, name)
            pg = ctx.new_page()
            pg.set_default_timeout(90000)
            errs = []
            pg.on("console", lambda m, errs=errs: errs.append(m.type + ": " + m.text) if m.type in ("error", "warning") else None)
            pg.on("pageerror", lambda e, errs=errs: errs.append("pageerror: " + str(e)))
            pg.goto(url)
            pg.wait_for_timeout(1500)
            # __abriDt fixes the frame time and ff() fast-forwards the hero physics, so shots are repeatable
            pg.evaluate("() => { window.__abriDt = 0.2; if (window.__abriHero && window.__abriHero.ff) window.__abriHero.ff(6); }")
            frames(pg, 6)
            if not only:
                pg.screenshot(path=f"{OUT}/{name}_1hero.png")
            info = pg.evaluate("""() => ({ views: window.__abri ? window.__abri.views() : null,
              cloud: window.__abriCloud ? { ready: window.__abriCloud.ready, n: window.__abriCloud.n } : null,
              scroll: [document.documentElement.scrollWidth, innerWidth], gl: !document.documentElement.classList.contains('no-gl'),
              fit: [...document.querySelectorAll('[data-fit]')].map(e => e.className + ':' + Math.round(e.getBoundingClientRect().width) + '/' + Math.round(e.parentElement.getBoundingClientRect().width) + ' fs ' + getComputedStyle(e).fontSize) })""")
            for i, sec in enumerate(SECTIONS):
                if only and sec not in only:
                    continue
                pg.evaluate("id => { const el = document.getElementById(id); window.scrollTo(0, el.getBoundingClientRect().top + scrollY); }", sec)
                pg.wait_for_timeout(250)
                frames(pg, 14)
                pg.screenshot(path=f"{OUT}/{name}_{i+2}{sec}.png")
                if sec in ("court", "rates", "how", "events", "tournament"):
                    pg.evaluate("id => { const el = document.getElementById(id); window.scrollTo(0, el.getBoundingClientRect().top + scrollY + innerHeight * 0.75); }", sec)
                    pg.wait_for_timeout(200)
                    frames(pg, 10)
                    pg.screenshot(path=f"{OUT}/{name}_{i+2}{sec}_b.png")
            info["scroll_end"] = pg.evaluate("[document.documentElement.scrollWidth, innerWidth]")
            info["errors"] = errs[:14]
            res[name] = info
            ctx.close()
        b.close()
    srv.shutdown()
    print(json.dumps(res, indent=1))


if __name__ == "__main__":
    args = sys.argv[1:]
    only = None
    if "--only" in args:
        k = args.index("--only")
        only = args[k + 1].split(",")
        args = args[:k] + args[k + 2:]
    run(args or ["desk", "phone"], only)
