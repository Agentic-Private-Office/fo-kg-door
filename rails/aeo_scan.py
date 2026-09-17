"""
aeo_scan.py — scan familyofficeknowledgegraph.ai on isitagentready.com's own endpoint, save the per-check JSON, diff against the last run.

  python aeo_scan.py [url] [--label name]   -> rails/aeo/<date>[-label].json, prints per-check status and the diff
  python aeo_scan.py --diff a.json b.json   -> check-level diff of two saved scans

Weekly (Sundays) by the Windows task "fo-kg AEO scan": exceptions only are appended to START_ME_UP/BUILD-LOG.md.
The API JSON is the record; the UI score is read in the Browser pane when reported.
"""
import datetime as dt, io, json, pathlib, sys, urllib.request
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "rails" / "aeo"
LOG = ROOT.parents[1] / "START_ME_UP" / "BUILD-LOG.md"


def flatten(d):
    rows = {}
    for cat, v in d.get("checks", {}).items():
        items = v.items() if isinstance(v, dict) else [(c.get("id"), c) for c in v]
        for k, c in items:
            if isinstance(c, dict):
                rows[f"{cat}.{k}"] = (c.get("status"), (c.get("message") or "")[:110])
    return rows


def scan(url):
    req = urllib.request.Request("https://isitagentready.com/api/scan", method="POST", data=json.dumps({"url": url}).encode(),
                                 headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0 (familyofficeknowledgegraph.ai AEO scan)"})
    with urllib.request.urlopen(req, timeout=240) as r:
        return json.load(r)


def summary(d):
    rows = flatten(d)
    tot = {"pass": 0, "fail": 0, "neutral": 0}
    for s, _ in rows.values():
        if s in tot: tot[s] += 1
    return rows, tot


def diff(a, b):
    ra, rb = flatten(a), flatten(b)
    return [(k, ra.get(k, ("absent",))[0], rb.get(k, ("absent",))[0]) for k in sorted(set(ra) | set(rb)) if ra.get(k, ("absent",))[0] != rb.get(k, ("absent",))[0]]


if __name__ == "__main__":
    args = sys.argv[1:]
    if args[:1] == ["--diff"]:
        a, b = json.load(open(args[1], encoding="utf-8")), json.load(open(args[2], encoding="utf-8"))
        for k, sa, sb in diff(a, b): print(f"{k:42} {sa:8} -> {sb}")
        sys.exit(0)
    url = next((x for x in args if x.startswith("http")), "https://familyofficeknowledgegraph.ai")
    label = args[args.index("--label") + 1] if "--label" in args else ""
    weekly = "--weekly" in args
    d = scan(url)
    OUT.mkdir(parents=True, exist_ok=True)
    prev = sorted(OUT.glob("*.json"))
    name = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d") + (f"-{label}" if label else "") + ".json"
    json.dump(d, open(OUT / name, "w", encoding="utf-8"), indent=1)
    rows, tot = summary(d)
    try:
        fp = ROOT / "public" / "facts.json"; f = json.load(open(fp, encoding="utf-8"))
        f.setdefault("radar", {})["readiness"] = {"date": name[:10], "level": d.get("level"), "level_name": d.get("levelName"), "pass": tot["pass"], "fail": tot["fail"], "neutral": tot["neutral"], "scanner": "isitagentready.com /api/scan", "source": f"FO-KG/SITE/rails/aeo/{name}"}
        open(fp, "w", encoding="utf-8").write(json.dumps(f, indent=2, ensure_ascii=False) + "\n")
    except Exception as e:
        print("facts.json readiness not written:", e)
    print(f"{url} level {d.get('level')} {d.get('levelName')} | pass {tot['pass']} fail {tot['fail']} neutral {tot['neutral']} | isCommerce {d.get('isCommerce')} {d.get('commerceSignals')}")
    for k, (s, m) in rows.items(): print(f"  {k:42} {str(s):8} {m}")
    if prev:
        last = json.load(open(prev[-1], encoding="utf-8"))
        changes = diff(last, d)
        print(f"diff vs {prev[-1].name}: {len(changes)} change(s)")
        for k, sa, sb in changes: print(f"  {k:42} {sa:8} -> {sb}")
        if weekly and changes:
            with open(LOG, "a", encoding="utf-8") as f:
                f.write(f"\n**FO-KG AEO weekly scan {name[:10]} — exceptions vs {prev[-1].name}:** " + "; ".join(f"{k} {sa}->{sb}" for k, sa, sb in changes) + f". Totals pass {tot['pass']} fail {tot['fail']} neutral {tot['neutral']}, level {d.get('level')}.\n")
