"""
bump_version.py — bump the surface patch version in facts.json (surface_version) and worker/index.js (VERSION) together.
  python rails/bump_version.py "<note>"     e.g. python rails/bump_version.py "weekly sweep 2026-09-20"
Used by the weekly sweep (sweep_all.ps1); orders bump by hand as before.
"""
import json, pathlib, re, sys

SITE = pathlib.Path(__file__).resolve().parents[1]
facts_p = SITE / "public" / "facts.json"; worker_p = SITE / "worker" / "index.js"
facts = json.loads(facts_p.read_text(encoding="utf-8"))
cur = facts["surface_version"]; a, b, c = (int(x) for x in cur.split("."))
new = f"{a}.{b}.{c + 1}"
facts["surface_version"] = new
facts_p.write_text(json.dumps(facts, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
w = worker_p.read_text(encoding="utf-8")
w2 = re.sub(r'const VERSION = "' + re.escape(cur) + '"', f'const VERSION = "{new}"', w, count=1)
if w2 == w: raise SystemExit(f"worker/index.js does not carry VERSION {cur}")
worker_p.write_text(w2, encoding="utf-8")
print(f"surface {cur} -> {new} ({sys.argv[1] if len(sys.argv) > 1 else 'bump'})")
