"""Home page edge cases: reduced motion, no WebGL (three.js blocked), and the inlined preview build opened as a file.

  python3 tools/site/edge_tests.py
Screenshots go to tools/site/shots/.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import harness as T  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402


def main():
    srv = T.serve()
    url = "http://127.0.0.1:%d/index.html" % srv.server_address[1]
    res = {}
    with sync_playwright() as p:
        b = T.launch(p)
        # reduced motion
        ctx = b.new_context(viewport={"width": 1280, "height": 800}, reduced_motion="reduce")
        ctx.route("**/*", T.route)
        pg = ctx.new_page(); pg.set_default_timeout(90000); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.goto(url); pg.wait_for_timeout(1500)
        for sec in ["court", "how"]:
            pg.evaluate("id => { const el = document.getElementById(id); window.scrollTo(0, el.getBoundingClientRect().top + scrollY + 40); }", sec)
            T.frames(pg, 6)
            pg.screenshot(path=os.path.join(T.OUT, "reduce_%s.png" % sec))
        res["reduce"] = errs[:]
        ctx.close()

        # no WebGL: three.js fails to load
        ctx = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)

        def no_three(r):
            if r.request.url.endswith("three.min.js"):
                return r.abort()
            return T.route(r)
        ctx.route("**/*", no_three)
        pg = ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.goto(url); pg.wait_for_timeout(1500)
        pg.evaluate("() => { const el = document.getElementById('how'); window.scrollTo(0, el.getBoundingClientRect().top + scrollY); }")
        pg.wait_for_timeout(400)
        pg.screenshot(path=os.path.join(T.OUT, "nogl_how.png"))
        res["nogl"] = {"errors": errs[:], "nogl_class": pg.evaluate("document.documentElement.className"),
                       "fallback_visible": pg.evaluate("getComputedStyle(document.querySelector('.how-fallback')).display"),
                       "scroll": pg.evaluate("[document.documentElement.scrollWidth, innerWidth]"),
                       "fit": pg.evaluate("[...document.querySelectorAll('[data-fit]')].map(e => Math.round(e.getBoundingClientRect().width))")}
        ctx.close()

        # the inlined preview build, opened as a file
        ctx = b.new_context(viewport={"width": 1280, "height": 800})
        ctx.route("**/*", T.route)
        pg = ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type in ("error", "warning") else None)
        src = open(T.ARTIFACT, encoding="utf-8").read()
        page = os.path.join(T.OUT, "artifact_page.html")
        open(page, "w", encoding="utf-8").write('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + src + "</body></html>")
        pg.goto("file://" + page); pg.wait_for_timeout(2500)
        pg.evaluate("() => { const el = document.getElementById('how'); window.scrollTo(0, el.getBoundingClientRect().top + scrollY); window.__abriDt = 0.25; }")
        T.frames(pg, 16)
        pg.screenshot(path=os.path.join(T.OUT, "artifact_how.png"))
        res["artifact"] = {"errors": errs[:], "cloud": pg.evaluate("window.__abriCloud ? [window.__abriCloud.ready, window.__abriCloud.n] : null"),
                           "book": pg.evaluate("[...document.querySelectorAll('.nav a')].map(a => a.textContent.trim() + ' ' + a.href)")}
        b.close()
    srv.shutdown()
    print(json.dumps(res, indent=1))


if __name__ == "__main__":
    main()
