"""
build_pages.py — the five footer pages of familyofficeknowledgegraph.ai from START_ME_UP/familyofficeknowledgegraph-ai-footer-pages.md,
verbatim, on the shared office template. Run before every deploy, after build_kit.py: python rails/build_pages.py
"""
import html as H, json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parents[1]
PUB = ROOT / "public"
MD = ROOT.parents[1] / "START_ME_UP" / "familyofficeknowledgegraph-ai-footer-pages.md"
O = "https://familyofficeknowledgegraph.ai"
facts = json.load(open(PUB / "facts.json", encoding="utf-8"))

src = open(MD, encoding="utf-8").read()
sections = {}
for block in src.split("\n---\n"):
    m = re.match(r"\s*## (/[a-z-]+) — (.+?)\n(.*)", block, re.S)
    if m: sections[m.group(1)] = {"title": m.group(2).strip(), "body": m.group(3).strip()}

PAGES = {"/status": "status.html", "/terms": "terms.html", "/privacy": "privacy.html", "/security": "security.html", "/no-cookies": "no-cookies.html"}
TITLES = {"/status": "Status", "/terms": "Terms of use", "/privacy": "Privacy", "/security": "Report a security issue", "/no-cookies": "No cookies"}
EYEBROWS = {"/status": "STATUS · LIVE READ", "/terms": "TERMS OF USE", "/privacy": "PRIVACY", "/security": "SECURITY", "/no-cookies": "NO COOKIES"}


def esc(s): return H.escape(s, quote=False)


def linkify(text):
    text = re.sub(r"(https?://[^\s)]+)", lambda m: f'<a href="{m.group(1)}">{m.group(1)}</a>', text)
    text = re.sub(r"(?<![\w/\"])(/\.well-known/[\w./-]+|/api|/x402)(?![\w/-])", lambda m: f'<a href="{m.group(1)}">{m.group(1)}</a>', text)
    return text


def render_body(body):
    out = []
    for para in re.split(r"\n\s*\n", body):
        lines = para.strip().split("\n")
        if all(l.startswith("- ") for l in lines): out.append('<ul class="line-list">' + "".join(f"<li>{linkify(esc(l[2:].strip()))}</li>" for l in lines) + "</ul>")
        elif all(re.match(r"^\d+\. ", l) for l in lines): out.append('<ul class="line-list">' + "".join(f"<li>{linkify(esc(l.strip()))}</li>" for l in lines) + "</ul>")
        else: out.append(f'<div class="sec-prose"><p>{linkify(esc(" ".join(l.strip() for l in lines)))}</p></div>')
    return "\n".join(out)


home = open(PUB / "index.html", encoding="utf-8").read()
NAV = re.search(r"<nav[\s\S]*?</nav>", home).group(0).replace('href="#', 'href="/#')
FOOTER = re.search(r"<footer[\s\S]*?</footer>", home).group(0)
STATUS_TABLE = '''<div class="sec-prose"><p>Surface version {{surface_version}} · as of {{as_of}}</p></div>
<ul class="line-list status-rows">
{{status.rows}}
</ul>'''


def page_html(path, sec):
    title = TITLES[path]
    body = render_body(sec["body"])
    if path == "/status":
        paras = re.split(r"\n\s*\n", sec["body"].strip())
        body = f'<div class="sec-prose"><p>{esc(paras[0])}</p></div>\n{STATUS_TABLE}\n<div class="sec-prose"><p>{esc(paras[-1])}</p></div>'
    desc = re.split(r"\n\s*\n", sec["body"].strip())[0].replace("\n", " ")
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>{esc(title)} — Family Office Knowledge Graph</title>
<meta name="description" content="{esc(desc)[:300]}" />
<meta property="og:title" content="{esc(title)} — Family Office Knowledge Graph" />
<meta property="og:type" content="website" />
<meta property="og:url" content="{O}{path}" />
<meta property="og:image" content="{O}/icon-1024.png" />
<meta name="theme-color" content="#000000" />
<link rel="canonical" href="{O}{path}" />
<link rel="icon" href="/favicon.ico" sizes="32x32" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
<link rel="stylesheet" href="/styles.css" />
</head>
<body>

{NAV}

<main id="main">
<section id="page" class="section section-dark">
  <div class="sec-inner">
    <div class="sec-eyebrow">{EYEBROWS[path]}</div>
    <h1 class="sec-h2">{esc(title)}</h1>
{body}
  </div>
</section>
</main>

{FOOTER}

</body>
</html>
'''


for path, fn in PAGES.items():
    assert path in sections, f"copy missing for {path}"
    open(PUB / fn, "w", encoding="utf-8", newline="\n").write(page_html(path, sections[path]))

urls = ["/", "/x402", "/status", "/terms", "/privacy", "/security", "/no-cookies"]
open(PUB / "sitemap.xml", "w", encoding="utf-8", newline="\n").write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "".join(f"  <url><loc>{O}{u}</loc><lastmod>{facts['as_of']}</lastmod><changefreq>weekly</changefreq></url>\n" for u in urls) + "</urlset>\n")
print("pages built:", ", ".join(PAGES.values()), "| sitemap", len(urls), "urls")
