"""Screens of the booking page (index.html at the repo root): header, tabs and schedule, light and dark, phone and desktop.

  python3 tools/site/booking_screens.py
Screenshots go to tools/site/shots/booking/. Prints the navigation, first slots and headings it found.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import harness as T  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402

OUT = os.path.join(T.OUT, "booking")
os.makedirs(OUT, exist_ok=True)


def route(r):
    if r.request.url.startswith("https://m.me"):
        return r.abort()
    return T.route(r)


def main():
    srv = T.serve(T.ROOT)
    base = "http://127.0.0.1:%d/" % srv.server_address[1]
    res = {}
    with sync_playwright() as p:
        b = p.chromium.launch()
        for name, w, hgt, mob, dark in [("desk", 1440, 900, False, False), ("desk-dark", 1440, 900, False, True),
                                        ("phone", 390, 844, True, False), ("phone-dark", 390, 844, True, True)]:
            ctx = b.new_context(viewport={"width": w, "height": hgt}, is_mobile=mob, has_touch=mob, device_scale_factor=1)
            if dark:
                ctx.add_init_script("try{localStorage.setItem('abri-theme','dark')}catch(e){}")
            ctx.route("**/*", route)
            pg = ctx.new_page()
            errs = []
            pg.on("pageerror", lambda e, errs=errs: errs.append(str(e)))
            pg.on("console", lambda m, errs=errs: errs.append(m.text) if m.type == "error" else None)
            pg.goto(base)
            pg.wait_for_timeout(700)
            info = {"top": pg.evaluate("Math.round(document.querySelector('.top').getBoundingClientRect().top)"),
                    "nav": pg.evaluate("[...document.querySelectorAll(innerWidth >= 960 ? '.toptabs a' : '.tabbar a')].map(a => a.textContent.trim() + (a.classList.contains('on') ? '*' : '') + ' ' + a.getAttribute('href'))"),
                    "cards": pg.evaluate("[...document.querySelectorAll('#list .slot')].map(s => s.innerText.replace(/\\n/g, ' | ')).slice(0, 4)"),
                    "h1": pg.evaluate("document.querySelector('h1').innerText"),
                    "scroll": pg.evaluate("[document.documentElement.scrollWidth, innerWidth]")}
            pg.screenshot(path=f"{OUT}/{name}_book.png")
            for tab in ["tournament", "rates", "info"]:
                sel = (".toptabs" if w >= 960 else ".tabbar") + f" a[data-v='{tab}']"
                pg.locator(sel).click()
                pg.wait_for_timeout(250)
                info[tab] = [pg.evaluate("location.hash"), pg.evaluate("document.querySelector('h1').innerText"),
                             pg.evaluate("[document.documentElement.scrollWidth, innerWidth]")]
                pg.screenshot(path=f"{OUT}/{name}_{tab}.png")
            info["errors"] = errs
            res[name] = info
            ctx.close()
        b.close()
    srv.shutdown()
    print(json.dumps(res, indent=1, ensure_ascii=False))


if __name__ == "__main__":
    main()
