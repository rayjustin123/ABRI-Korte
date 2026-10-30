"""Booking flow on a phone and a desktop: pick an open slot, change hours and rentals, the Messenger link,
the Today chip, the tournament block and the Home link.

  python3 tools/site/booking_flow.py
Uses the schedule data already in index.html with the current src/template.html, so it checks template changes
without a new schedule. Screenshots go to tools/site/shots/flow/.
"""
import json
import os
import re
import sys
import urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import harness as T  # noqa: E402
sys.path.insert(0, os.path.join(T.ROOT, "src"))
import build  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402

OUT = os.path.join(T.OUT, "flow")
os.makedirs(OUT, exist_ok=True)
RESET = (":root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}"
         "body{margin:0;font:14px system-ui,-apple-system,sans-serif}img{max-width:100%}[hidden]{display:none!important}")


def page_path():
    src = open(os.path.join(T.ROOT, "index.html"), encoding="utf-8").read()
    data = json.loads(re.search(r'<script type="application/json" id="data">(.*?)</script>', src, re.S).group(1))
    frag = build.fragment(data)
    path = os.path.join(OUT, "page.html")
    open(path, "w", encoding="utf-8").write(
        '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>'
        + RESET + "</style></head><body>" + frag + "</body></html>")
    return path


def main():
    path = page_path()
    res, errs = {}, []
    bill = "[...document.querySelectorAll('#bill .l')].map(l => l.innerText.replace(/\\n/g,' = ')).join('  ;  ')"
    with sync_playwright() as p:
        b = p.chromium.launch()
        for name, w, h, mob in [("phone", 390, 844, True), ("desk", 1366, 820, False)]:
            ctx = b.new_context(viewport={"width": w, "height": h}, is_mobile=mob, has_touch=mob)
            ctx.grant_permissions(["clipboard-read", "clipboard-write"])
            ctx.route("**/m.me/**", lambda r: r.abort())
            ctx.route("**/fonts.googleapis.com/**", lambda r: r.abort())
            pg = ctx.new_page()
            pg.on("pageerror", lambda e, name=name: errs.append(name + ": " + str(e)))
            pg.goto("file://" + path)
            pg.wait_for_timeout(300)
            r = {}
            r["day"] = pg.locator(".dayhead h2").inner_text()
            r["first_cards"] = pg.evaluate("[...document.querySelectorAll('#list .slot')].map(s => s.innerText.replace(/\\n/g,' | ')).slice(0,3)")
            r["past_cards"] = pg.locator(".card.past").count()
            r["today_chip_before"] = pg.locator(".todaychip").count()
            pg.locator("#list button.card").first.click()
            pg.wait_for_timeout(350)
            r["panel_open"] = pg.evaluate("document.getElementById('panel').classList.contains('open')")
            r["bill"] = pg.evaluate(bill)
            plus = pg.locator(".panel button[data-k='hours'][data-v='1']")
            if plus.is_enabled():
                plus.click()
                pg.wait_for_timeout(120)
            r["bill_more"] = pg.evaluate(bill)
            pg.locator(".panel button[data-k='paddles'][data-v='1']").click()
            pg.wait_for_timeout(120)
            r["bill_paddle"] = pg.evaluate(bill)
            href = pg.evaluate("document.getElementById('cta').href")
            r["msg"] = urllib.parse.unquote(href.split("text=")[1])[:160] if "text=" in href else href
            pg.screenshot(path=f"{OUT}/{name}_panel.png")
            # close the panel (phone), go to another day, then the Today chip brings you back
            if mob:
                pg.locator(".panel .x").click()
                pg.wait_for_timeout(250)
            if pg.locator("button.d:not([disabled])").count() < 3:   # late in the week: go to the next one
                pg.locator("button.arrow[aria-label='Next week']").click()
                pg.wait_for_timeout(120)
            pg.locator("button.d:not([disabled])").nth(2).click()
            pg.wait_for_timeout(150)
            r["other_day"] = pg.locator(".dayhead h2").inner_text()
            r["today_chip_after"] = pg.locator(".todaychip").count()
            pg.locator(".todaychip").click()
            pg.wait_for_timeout(150)
            r["back_today"] = pg.locator(".dayhead h2").inner_text()
            # the tournament block on Nov 21 opens the Tournament tab
            for _ in range(8):
                if pg.locator("button.d[aria-label^='Saturday, November 21']").count():
                    break
                pg.locator("button.arrow[aria-label='Next week']").click()
                pg.wait_for_timeout(60)
            if pg.locator("button.d[aria-label^='Saturday, November 21']").count():
                pg.locator("button.d[aria-label^='Saturday, November 21']").click()
                pg.wait_for_timeout(120)
                pg.locator("button.card.event").click()
                pg.wait_for_timeout(200)
                r["event_to_tab"] = [pg.evaluate("location.hash"), pg.locator("h1").inner_text()]
            r["home_href"] = pg.evaluate("[...document.querySelectorAll('a')].filter(a => a.textContent.trim() === 'Home').map(a => a.getAttribute('href'))")
            r["scroll"] = pg.evaluate("[document.documentElement.scrollWidth, innerWidth]")
            res[name] = r
            ctx.close()
        b.close()
    print(json.dumps(res, indent=1, ensure_ascii=False))
    print("errors", errs)


if __name__ == "__main__":
    main()
