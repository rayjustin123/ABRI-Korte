"""Build the Abri Korte home page.

  python3 build_home.py --site-out home              the website page: home/index.html, player.jpg and player-depth.png
  python3 build_home.py --artifact-out page.html     the preview page (no document skeleton, photo inlined)

Sources sit beside this script (style.css, body.html, app.js, player.jpg, player-depth.png), or in src/ next to it.
player-depth.png holds the depth (red) and the outline of the player (green) for the point cloud in the booking section.
On the website the home page lives at /home/ and links back to the booking page at the site root.
"""
import argparse
import base64
import html
import json
import os
import urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src") if os.path.isdir(os.path.join(HERE, "src")) else HERE
SITE = "https://abri-korte.vercel.app/"

MSGR = "https://m.me/61593743265058"
EVENT_TEXT = "\n".join([
    "Hi Abri Korte! I'd like to book the court for an event.", "",
    "Date: ", "Time: ", "How many people: ", "Kind of event: "])
REG_TEXT = "\n".join([
    "Hi Abri Korte! We would like to register for the Abri Korte Pickleball Invitational.", "",
    "Category: ", "Player 1: ", "Player 2: ",
    "How long each of us has played pickleball: ",
    "Podium finishes or titles in past tournaments: ",
    "Racquet sports varsity background: "])

LIBS = [
    "https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js",
    "https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.min.js",
    "https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js",
    "https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js",
]
FONTS = ("https://fonts.googleapis.com/css2?family=Barlow:wght@300;400;500;600"
         "&family=Barlow+Condensed:wght@600;700"
         "&family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300&display=swap")
# Poppins and Barlow have no peso sign, so it comes from Noto Sans, loaded for that one character only
PESO = "https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700&text=%E2%82%B1&display=swap"
CFG = {"rates": {"weekday": {"day": 200, "night": 350}, "weekend": {"day": 300, "night": 400},
                 "dayStart": 6 * 60, "dayEnd": 17 * 60}}
DESC = ("Abri Korte is one covered pickleball and badminton court in Upper Tugbongan, Consolacion, Cebu. "
        "Open 24 hours. See rates, events and the Pickleball Invitational, then book on Messenger.")


def photo_jpeg():
    return open(os.path.join(SRC, "player.jpg"), "rb").read()


def links(site):
    root = "../" if site else SITE
    return {
        "BOOK": root + "#book",
        "TOUR": root + "#tournament",
        "RATES": root + "#rates",
        "INFO": root + "#info",
        "MSG": MSGR,
        "MSG_EVENT": MSGR + "?text=" + urllib.parse.quote(EVENT_TEXT),
        "MSG_REG": MSGR + "?text=" + urllib.parse.quote(REG_TEXT),
        "FB": "https://www.facebook.com/ABRIKorteCebu",
        "IG": "https://www.instagram.com/abrikorte/",
        "MAPS": "https://www.google.com/maps/search/?api=1&query=724+Upper+Tugbongan+Consolacion+Cebu",
    }


def depth_png():
    return open(os.path.join(SRC, "player-depth.png"), "rb").read()


def page(site, photo, depth):
    css = open(os.path.join(SRC, "style.css"), encoding="utf-8").read()
    body = open(os.path.join(SRC, "body.html"), encoding="utf-8").read()
    js = open(os.path.join(SRC, "app.js"), encoding="utf-8").read()
    subs = dict(links(site), PHOTO=photo, DEPTH=depth)
    for k, v in subs.items():
        body = body.replace("{{" + k + "}}", html.escape(v, quote=True))
    assert "{{" not in body, "unfilled placeholder"
    cfg = "<script>window.ABRI=" + json.dumps(CFG, separators=(",", ":")) + ";</script>\n"
    libs = "".join('<script src="%s"></script>\n' % u for u in LIBS)
    fonts = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
             '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
             '<link rel="stylesheet" href="%s">\n'
             '<link rel="stylesheet" href="%s">\n' % (html.escape(FONTS, quote=True), html.escape(PESO, quote=True)))
    style = "<style>\n" + css + "\n</style>\n"
    tail = libs + cfg + "<script>\n" + js + "\n</script>\n"
    if not site:
        return ('<title>Abri Korte Home</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n'
                + fonts + style + body + "\n" + tail)
    url = SITE + "home/"
    head = "\n".join([
        '<!doctype html>', '<html lang="en">', '<head>', '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">',
        '<title>Abri Korte | Pickleball and badminton court in Consolacion, Cebu</title>',
        '<meta name="description" content="%s">' % html.escape(DESC, quote=True),
        '<meta name="theme-color" content="#016FA8">',
        '<link rel="icon" href="../favicon.svg" type="image/svg+xml">',
        '<link rel="apple-touch-icon" href="../apple-touch-icon.png">',
        '<link rel="manifest" href="../site.webmanifest">',
        '<meta property="og:type" content="website">',
        '<meta property="og:site_name" content="Abri Korte">',
        '<meta property="og:title" content="Abri Korte, covered pickleball and badminton court">',
        '<meta property="og:description" content="Open 24 hours in Upper Tugbongan, Consolacion. Book on Messenger.">',
        '<meta property="og:image" content="%sog.png">' % SITE,
        '<meta property="og:url" content="%s">' % url,
        '<link rel="canonical" href="%s">' % url,
        '<meta name="twitter:card" content="summary_large_image">',
        '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}[hidden]{display:none!important}</style>',
        fonts + style + '</head>', '<body>'])
    return head + "\n" + body + "\n" + tail + "</body>\n</html>\n"


def write(path, text):
    assert "—" not in text, "em dash in " + path
    open(path, "w", encoding="utf-8").write(text)
    print(f"{path}: {len(text):,} bytes")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--site-out")
    ap.add_argument("--artifact-out")
    a = ap.parse_args()
    if not a.site_out and not a.artifact_out:
        a.site_out = os.path.join(HERE, "dist", "site")
        a.artifact_out = os.path.join(HERE, "dist", "abri-korte-home.html")
    jpg = photo_jpeg()
    if a.site_out:
        os.makedirs(a.site_out, exist_ok=True)
        for old in ("group.jpg", "group-depth.png"):
            if os.path.exists(os.path.join(a.site_out, old)):
                os.remove(os.path.join(a.site_out, old))
        open(os.path.join(a.site_out, "player.jpg"), "wb").write(jpg)
        open(os.path.join(a.site_out, "player-depth.png"), "wb").write(depth_png())
        write(os.path.join(a.site_out, "index.html"), page(True, "player.jpg", "player-depth.png"))
    if a.artifact_out:
        os.makedirs(os.path.dirname(os.path.abspath(a.artifact_out)), exist_ok=True)
        write(a.artifact_out, page(False, "data:image/jpeg;base64," + base64.b64encode(jpg).decode(),
                                   "data:image/png;base64," + base64.b64encode(depth_png()).decode()))
