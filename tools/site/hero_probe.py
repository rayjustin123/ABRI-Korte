"""Where the hero balls end up after the rain, per screen size.

  python3 tools/site/hero_probe.py [scenario ...] [--secs 9] [--tag after]
Prints, per scenario: how many balls are still above the bottom of the name (aboveHeading), how many reached the
floor (nearFloor), whether the name spans the width (narrow, phones), and any hidden under the tab bar.
Screenshots go to tools/site/shots/hero_<tag>_<scenario>.png.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import harness as T  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402

PROBE = """() => {
  const st = window.__abriHero, hero = document.querySelector('.hero') || document.getElementById('hero');
  const hr = hero.getBoundingClientRect();
  const tb = document.querySelector('.tabbar'); const tr = tb ? tb.getBoundingClientRect() : null;
  const tbv = tb ? getComputedStyle(tb).display !== 'none' : false;
  let gy1 = -1e9;
  for (const s of hero.querySelectorAll('.hero-words .ch')) gy1 = Math.max(gy1, s.getBoundingClientRect().bottom - hr.top);
  const ys = st.balls.map(o => o.b.position.y);
  return { W: st.W, H: Math.round(st.H), r: st.r, n: st.balls.length, narrow: st.narrow, floor: Math.round(st.fy || st.H),
    aboveHeading: ys.filter(y => y < gy1).length, nearFloor: ys.filter(y => y > (st.fy || st.H) - st.r * 6).length,
    hidden: tbv ? ys.filter(y => y - st.r > tr.top - hr.top).length : 0 };
}"""


def main():
    args = sys.argv[1:]
    secs, tag = 9.0, "probe"
    if "--secs" in args:
        i = args.index("--secs"); secs = float(args[i + 1]); args = args[:i] + args[i + 2:]
    if "--tag" in args:
        i = args.index("--tag"); tag = args[i + 1]; args = args[:i] + args[i + 2:]
    names = args or ["phone", "small", "tablet", "desk"]
    srv = T.serve()
    url = "http://127.0.0.1:%d/index.html" % srv.server_address[1]
    with sync_playwright() as p:
        b = T.launch(p)
        for name in names:
            ctx = T.context(b, name)
            pg = ctx.new_page(); pg.set_default_timeout(90000); errs = []
            pg.on("pageerror", lambda e, errs=errs: errs.append(str(e)))
            pg.goto(url); pg.wait_for_timeout(1500)
            pg.evaluate("s => { window.__abriDt = 0.2; window.__abriHero.ff(s); }", secs)
            T.frames(pg, 4)
            info = pg.evaluate(PROBE)
            info["errors"] = errs
            print(name, json.dumps(info))
            pg.screenshot(path=os.path.join(T.OUT, "hero_%s_%s.png" % (tag, name)))
            ctx.close()
        b.close()
    srv.shutdown()


if __name__ == "__main__":
    main()
