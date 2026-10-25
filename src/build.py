"""Build the Abri Korte booking page from the reservation sheet's taken slots.

rows.txt holds one taken slot per line: date|start|end|status (no guest names).

  python3 build.py rows.txt page.html                 artifact version (no document skeleton)
  python3 build.py rows.txt --site site --url URL     standalone site: site/index.html
"""
import argparse
import datetime as dt
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
BLOCKING = {"Confirmed", "Pending", "Completed", "Unpaid", ""}
DAY = 1440
EPOCH = dt.date(1970, 1, 1)
EVENT = "Abri Korte Pickleball Invitational"


def mins(t):
    t = t.strip().upper()
    hm, ap = t.split(" ")[0], t.split(" ")[-1]
    parts = hm.split(":")
    h, m = int(parts[0]), int(parts[1]) if len(parts) > 1 else 0
    return (h % 12 + (12 if ap == "PM" else 0)) * 60 + m


def absmin(iso, m):
    return (dt.date.fromisoformat(iso) - EPOCH).days * DAY + m


def make_data(rows_path, tourney_path=None):
    blocks = []
    for line in open(rows_path, encoding="utf-8"):
        line = line.strip()
        if not line:
            continue
        date, start, end, status = (line.split("|") + ["", "", "", ""])[:4]
        if status.strip() not in BLOCKING:
            continue
        s, e = absmin(date, mins(start)), absmin(date, mins(end))
        if e <= s:
            e += DAY  # runs past midnight
        blocks.append([s, e])
    blocks.sort()
    merged = []
    for s, e in blocks:
        if merged and s <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], e)
        else:
            merged.append([s, e])
    events = [[absmin(d, 6 * 60), absmin(d, 17 * 60), EVENT] for d in ("2026-11-21", "2026-11-22")]
    now = dt.datetime.now(dt.timezone(dt.timedelta(hours=8)))
    return {
        "updatedLabel": now.strftime("%b %-d, %-I:%M %p"),
        "weeks": 8,
        "maxHours": 8,
        "rates": {"weekday": {"day": 200, "night": 350}, "weekend": {"day": 300, "night": 400},
                  "dayStart": 6 * 60, "dayEnd": 17 * 60},
        "rentals": {"paddle": 100, "ball": 100},
        "promo": {"start": "2026-09-11", "end": None, "every": 4},
        "quiet": {"from": 22 * 60, "to": 5 * 60},
        "drinks": [{"name": "Water", "price": 30}, {"name": "Coke", "price": 50},
                   {"name": "Coke Zero", "price": 50}, {"name": "Pocari Sweat", "price": 60}],
        "rules": [
            "Non-marking court shoes only. No street shoes or bare feet.",
            "Free Bluetooth speaker. Keep the volume low after 10 PM.",
            "For comfort room access, please contact our personnel.",
            "Paddles and racquets are available for rent.",
            "Water and drinks for sale. No food on the court surface.",
            "Clean up after your session. Trash goes in the bins.",
            "No smoking or vaping inside the covered court.",
            "Sessions end on the hour. Respect the next group.",
            "Children must be supervised by an adult.",
            "Play at your own risk. Mind your belongings.",
        ],
        "address": "724 Upper Tugbongan, Consolacion, Cebu",
        "maps": "https://www.google.com/maps/search/?api=1&query=724+Upper+Tugbongan+Consolacion+Cebu",
        "fb": "https://www.facebook.com/profile.php?id=61593743265058",
        "messenger": "https://m.me/61593743265058",
        "home": "home/",
        "booked": sorted(merged + events, key=lambda b: b[0]),
        "tourney": json.load(open(tourney_path, encoding="utf-8")) if tourney_path and os.path.exists(tourney_path) else None,
    }, len(merged)


def fragment(data):
    js = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")
    tpl = open(os.path.join(HERE, "template.html"), encoding="utf-8").read()
    assert tpl.count("/*__DATA__*/") == 1
    return tpl.replace("/*__DATA__*/", js)


DESC = "See open court times at Abri Korte, get the price right away, and book on Messenger. Covered pickleball and badminton court in Consolacion, Cebu, open 24 hours."
RESET = (":root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}"
         "body{margin:0}img{max-width:100%}[hidden]{display:none!important}")


def standalone(frag, url):
    cut = frag.index("</style>\n") + len("</style>\n")
    head, body = frag[:cut], frag[cut:]
    head = head.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', "")
    base = url.rstrip("/") + "/" if url else ""
    meta = [
        '<meta name="description" content="' + DESC + '">',
        '<meta name="theme-color" content="#EDF2F5" media="(prefers-color-scheme: light)">',
        '<meta name="theme-color" content="#0D1418" media="(prefers-color-scheme: dark)">',
        '<link rel="icon" href="favicon.svg" type="image/svg+xml">',
        '<link rel="apple-touch-icon" href="apple-touch-icon.png">',
        '<link rel="manifest" href="site.webmanifest">',
        '<meta property="og:type" content="website">',
        '<meta property="og:site_name" content="Abri Korte">',
        '<meta property="og:title" content="Book the court at Abri Korte">',
        '<meta property="og:description" content="See open times, get the price, and book on Messenger.">',
        '<meta property="og:image" content="' + base + 'og.png">',
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        '<meta name="twitter:card" content="summary_large_image">',
    ]
    if base:
        meta.append('<meta property="og:url" content="' + base + '">')
        meta.append('<link rel="canonical" href="' + base + '">')
    return ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
            '<style>' + RESET + '</style>\n' + head.replace("<title>", "\n".join(meta) + "\n<title>", 1)
            + '</head>\n<body>\n' + body + '</body>\n</html>\n')


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("rows")
    ap.add_argument("out", nargs="?", default="abri-korte-booking.html")
    ap.add_argument("--site")
    ap.add_argument("--url", default="")
    ap.add_argument("--tourney", default=os.path.join(HERE, "tourney.json"))
    a = ap.parse_args()
    data, n = make_data(a.rows, a.tourney)
    if not a.site:
        data["home"] = "https://abri-korte.vercel.app/home/"
    frag = fragment(data)
    assert "—" not in frag, "em dash in page"
    if a.site:
        os.makedirs(a.site, exist_ok=True)
        html = standalone(frag, a.url)
        open(os.path.join(a.site, "index.html"), "w", encoding="utf-8").write(html)
        print(f"{n} taken blocks, updated {data['updatedLabel']}, {len(html):,} bytes -> {a.site}/index.html")
    else:
        open(a.out, "w", encoding="utf-8").write(frag)
        print(f"{n} taken blocks, updated {data['updatedLabel']}, {len(frag):,} bytes -> {a.out}")
