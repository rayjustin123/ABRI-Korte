"""Public tournament snapshot for the booking site, from the tournament app's saved database files.

  python3 make_tourney.py tdb tourney.json

tdb/ holds the ArtifactData exports: event/config.json, teams/*.json, draws/*.json,
matches/*.json, scores/*.json. Only confirmed teams' names leave this script:
no contacts, playing history, notes or payment details.
"""
import datetime as dt
import glob
import json
import os
import sys

SRC, OUT = sys.argv[1], sys.argv[2]


def coll(name):
    out = {}
    for p in glob.glob(os.path.join(SRC, name, "*.json")):
        doc = json.load(open(p, encoding="utf-8"))
        out[os.path.splitext(os.path.basename(p))[0]] = doc.get("data", doc) if isinstance(doc, dict) else doc
    return out


cfg = json.load(open(os.path.join(SRC, "event", "config.json"), encoding="utf-8"))
cfg = cfg.get("data", cfg)
teams, draws, matches, scores = coll("teams"), coll("draws"), coll("matches"), coll("scores")

locked = {k: d for k, d in draws.items() if d and d.get("locked") and matches.get(k)}
in_draw = {tid for d in locked.values() for pool in d.get("pools", []) for tid in pool}


def confirmed(t):
    return t.get("status") == "approved" and t.get("paid") is True


def name(t):
    return (t.get("display") or " & ".join(x for x in (t.get("p1"), t.get("p2")) if x) or "Team").strip()


pub_teams = {tid: {"cat": t.get("cat"), "name": name(t)} for tid, t in teams.items() if confirmed(t) or tid in in_draw}
pub_scores = {}
for k in locked:
    o = {}
    for mid, s in (scores.get(k) or {}).items():
        if isinstance(s, dict) and s.get("a") is not None and s.get("b") is not None:
            o[mid] = {"a": s["a"], "b": s["b"], "ta": s.get("ta"), "tb": s.get("tb")}
    pub_scores[k] = o

keep = ["name", "title", "days", "cats", "scoring", "slots", "breakMin", "checkInMin", "regDeadline", "minTeams", "hoursNote"]
now = dt.datetime.now(dt.timezone(dt.timedelta(hours=8)))
snap = {
    "updatedLabel": now.strftime("%b %-d, %-I:%M %p"),
    "config": {k: cfg[k] for k in keep if k in cfg},
    "teams": pub_teams,
    "draws": {k: {"pools": d["pools"], "locked": True} for k, d in locked.items()},
    "matches": {k: {"list": matches[k]["list"]} for k in locked},
    "scores": pub_scores,
}
json.dump(snap, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"{len(pub_teams)} confirmed teams, {len(locked)} locked draws -> {OUT}")
