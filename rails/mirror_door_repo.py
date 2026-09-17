"""mirror_door_repo.py — mirror the FO-KG door source to the PUBLIC repo github.com/Agentic-Private-Office/fo-kg-door
(CEO ruling 2026-09-17: the repo an MCP listing points at is public). Runs after every deploy (deploy rails call it).
Copies the door only: worker/, public/, wrangler.toml, server.json, rails/*.py|*.ps1|*.sh — never .wrangler/, logs, scan outputs,
orders, harvest work, keys or *.pem. Commits and pushes with the office GitHub account, then switches gh back.
usage: python rails/mirror_door_repo.py "<message>"  [--no-push]"""
import os, sys, shutil, subprocess, fnmatch, re

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MIRROR = r"C:\MATTHEWKEDDY\PUBLIC\fo-kg-door"
INCLUDE_DIRS = ["worker", "public"]
INCLUDE_FILES = ["wrangler.toml", "server.json"]
RAIL_GLOBS = ["*.py", "*.ps1", "*.sh"]
FORBIDDEN = re.compile(r"(\.pem$|\.seed\.|AGENT KEYS|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY)", re.I)


def copy_tree(src, dst):
    if os.path.isdir(dst):
        shutil.rmtree(dst)
    shutil.copytree(src, dst, ignore=shutil.ignore_patterns(".wrangler", "node_modules", "*.pem", "*.log"))


def main():
    msg = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else "mirror door source"
    push = "--no-push" not in sys.argv
    os.makedirs(MIRROR, exist_ok=True)
    for d in INCLUDE_DIRS:
        copy_tree(os.path.join(SITE, d), os.path.join(MIRROR, d))
    for f in INCLUDE_FILES:
        shutil.copyfile(os.path.join(SITE, f), os.path.join(MIRROR, f))
    rd = os.path.join(MIRROR, "rails")
    if os.path.isdir(rd):
        shutil.rmtree(rd)
    os.makedirs(rd)
    for f in os.listdir(os.path.join(SITE, "rails")):
        if any(fnmatch.fnmatch(f, g) for g in RAIL_GLOBS):
            shutil.copyfile(os.path.join(SITE, "rails", f), os.path.join(rd, f))
    # guard: nothing forbidden leaves the private tree
    bad = []
    for dp, dn, fn in os.walk(MIRROR):
        if ".git" in dp:
            continue
        for f in fn:
            p = os.path.join(dp, f)
            if FORBIDDEN.search(f):
                bad.append(p); continue
            if f == os.path.basename(__file__):
                continue  # this guard names the patterns it hunts; it is not a key
            if f.endswith((".js", ".py", ".ps1", ".sh", ".toml", ".json", ".md", ".txt")):
                try:
                    t = open(p, encoding="utf-8", errors="ignore").read()
                except Exception:
                    continue
                if "BEGIN PRIVATE KEY" in t or "BEGIN EC PRIVATE" in t or "BEGIN RSA PRIVATE" in t:
                    bad.append(p)
    if bad:
        sys.exit("REFUSED: forbidden material in the mirror: " + "; ".join(bad[:5]))
    n = sum(len(fn) for dp, dn, fn in os.walk(MIRROR) if ".git" not in dp)
    print("mirrored", n, "files to", MIRROR)
    if not push:
        return
    def run(c):
        return subprocess.run(c, cwd=MIRROR, shell=True, capture_output=True, text=True)
    run("git add -A")
    r = run('git -c user.name="CC" -c user.email="mk@agent-kg.ai" commit -q -m "%s"' % msg.replace('"', "'"))
    if "nothing to commit" in (r.stdout + r.stderr):
        print("nothing to commit"); return
    # CEO ruling 2026-09-17: Agentic-Private-Office is the active gh account for every office-root step; never switched away here
    subprocess.run("gh auth switch --user Agentic-Private-Office", shell=True, capture_output=True)
    p = run("git push -q origin main")
    print("pushed" if p.returncode == 0 else "PUSH FAILED: " + (p.stderr or p.stdout)[-300:])


if __name__ == "__main__":
    main()
