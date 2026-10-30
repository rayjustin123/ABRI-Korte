"""Rebuild the booking page (index.html) from src/template.html, keeping the schedule data already in it.

  python3 tools/site/rebuild_booking.py [--tourney]
Use it after changing the template, rates or rules only, so the page keeps its "updated" time and booked slots.
With --tourney it also swaps in the current src/tourney.json (the tournament block carries its own time stamp).
For a new schedule from the sheet, use src/build.py instead (see the README).
"""
import json
import os
import re
import sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "src"))
import build  # noqa: E402


def main():
    p = os.path.join(ROOT, "index.html")
    src = open(p, encoding="utf-8").read()
    data = json.loads(re.search(r'<script type="application/json" id="data">(.*?)</script>', src, re.S).group(1))
    if "--tourney" in sys.argv[1:]:
        data["tourney"] = json.load(open(os.path.join(ROOT, "src", "tourney.json"), encoding="utf-8"))
    out = build.standalone(build.fragment(data), "https://abri-korte.vercel.app/")
    assert "—" not in out, "em dash in page"
    open(p, "w", encoding="utf-8").write(out)
    t = data.get("tourney") or {}
    print("index.html", len(out), "bytes; schedule updated", data.get("updatedLabel"),
          "; tournament updated", t.get("updatedLabel"), "; register by", (t.get("config") or {}).get("regDeadline"))


if __name__ == "__main__":
    main()
