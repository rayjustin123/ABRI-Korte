"""Search engine pieces shared by both pages: structured data (JSON-LD) and the sitemap.

The booking page (src/build.py) and the home page (src/home/build_home.py) both put business() in their head,
plus event() while a tournament is coming up, so Google can show the court and the tournament.
write_sitemap() rewrites sitemap.xml at the site root with today's date whenever a page is rebuilt.
robots.txt at the site root is a plain file that points crawlers to the sitemap.
"""
import datetime as dt
import json
import os

SITE = "https://abrikorte.com/"
NAME = "Abri Korte"
PAGES = ["", "home/"]  # paths under SITE that belong in the sitemap
MANILA = dt.timezone(dt.timedelta(hours=8))
ADDRESS = {
    "@type": "PostalAddress",
    "streetAddress": "724 Upper Tugbongan",
    "addressLocality": "Consolacion",
    "addressRegion": "Cebu",
    "addressCountry": "PH",
}
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def business():
    """The court as a sports venue: name, address, open 24 hours, price range and social profiles."""
    return {
        "@context": "https://schema.org",
        "@type": "SportsActivityLocation",
        "@id": SITE + "#court",
        "name": NAME,
        "description": ("One covered pickleball and badminton court in Upper Tugbongan, Consolacion, Cebu. "
                        "Open 24 hours. See open times and rates, then book on Messenger."),
        "url": SITE,
        "image": SITE + "og.png",
        "logo": SITE + "icon-512.png",
        "address": ADDRESS,
        "hasMap": "https://www.google.com/maps/search/?api=1&query=724+Upper+Tugbongan+Consolacion+Cebu",
        "openingHoursSpecification": [{"@type": "OpeningHoursSpecification", "dayOfWeek": DAYS,
                                       "opens": "00:00", "closes": "23:59"}],
        "priceRange": "₱200 to ₱400 per hour",
        "currenciesAccepted": "PHP",
        "sameAs": ["https://www.facebook.com/ABRIKorteCebu", "https://www.instagram.com/abri.korte/"],
    }


def event(tourney, end_minutes=17 * 60):
    """The tournament as a SportsEvent while its last day is today or later, else None."""
    cfg = (tourney or {}).get("config") or {}
    days = sorted(cfg.get("days") or [], key=lambda d: d["date"])
    if not days or days[-1]["date"] < dt.datetime.now(MANILA).date().isoformat():
        return None
    first, last = days[0], days[-1]
    fees = [c.get("fee") for c in cfg.get("cats", []) if c.get("fee")]
    ev = {
        "@context": "https://schema.org",
        "@type": "SportsEvent",
        "name": cfg.get("name") or "Abri Korte tournament",
        "sport": "Pickleball",
        "startDate": "%sT%s:00+08:00" % (first["date"], first.get("start", "07:00")),
        "endDate": "%sT%02d:%02d:00+08:00" % (last["date"], end_minutes // 60, end_minutes % 60),
        "eventStatus": "https://schema.org/EventScheduled",
        "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
        "location": {"@type": "SportsActivityLocation", "@id": SITE + "#court", "name": NAME, "address": ADDRESS},
        "image": [SITE + "og.png"],
        "url": SITE + "#tournament",
        "organizer": {"@type": "Organization", "name": NAME, "url": SITE},
    }
    if cfg.get("blurb"):
        ev["description"] = cfg["blurb"]
    if fees:
        offer = {"@type": "Offer", "price": str(min(fees)), "priceCurrency": "PHP",
                 "availability": "https://schema.org/InStock", "url": SITE + "#tournament"}
        if cfg.get("regDeadline"):
            offer["validThrough"] = cfg["regDeadline"] + "T23:59:00+08:00"
        ev["offers"] = offer
    return ev


def jsonld(tourney=None):
    """<script type="application/ld+json"> tags for the head: the court, plus the tournament when one is coming up."""
    out = []
    for obj in (business(), event(tourney)):
        if obj:
            text = json.dumps(obj, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
            out.append('<script type="application/ld+json">' + text + "</script>")
    return "\n".join(out)


def write_sitemap(root):
    """sitemap.xml at the site root, every page dated today (Manila time)."""
    today = dt.datetime.now(MANILA).date().isoformat()
    urls = "".join("  <url><loc>%s%s</loc><lastmod>%s</lastmod></url>\n" % (SITE, p, today) for p in PAGES)
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + "</urlset>\n")
    open(os.path.join(root, "sitemap.xml"), "w", encoding="utf-8").write(xml)
