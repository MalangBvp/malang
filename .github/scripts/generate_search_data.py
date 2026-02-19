import os, json
from datetime import datetime, timezone
from bs4 import BeautifulSoup

INCLUDE_DIRS = ["src/pages"]
SEARCH_OUTPUT = "resrc/data/search.json"
SITEMAP_OUTPUT = "sitemap.xml"
BASE_URL = "https://www.malangbvp.in"

entries = []
urls = set()

def clean_url(p):
    p = p.replace("\\","/")
    if p.endswith("index.html"):
        return "/" + p[:-10]
    return "/" + p

for d in INCLUDE_DIRS:
    for root,_,files in os.walk(d):
        for f in files:
            if not f.endswith(".html"): continue

            fp = os.path.join(root,f)
            rel = os.path.relpath(fp,".")
            url = clean_url(rel)

            with open(fp,encoding="utf-8") as file:
                soup = BeautifulSoup(file,"html.parser")

            title = soup.title.string.strip() if soup.title else f
            text = " ".join(soup.get_text().split())

            entries.append({
                "title": title,
                "url": url,
                "content": text[:800]
            })

            urls.add(url)

# save search.json
os.makedirs(os.path.dirname(SEARCH_OUTPUT),exist_ok=True)
with open(SEARCH_OUTPUT,"w",encoding="utf-8") as f:
    json.dump(entries,f,indent=2)

print("search.json:",len(entries))

# sitemap
now = datetime.now(timezone.utc).date()

def priority(u):
    if u == "/": return "1.0"
    if u.count("/") <= 2: return "0.8"
    return "0.6"

s = [
'<?xml version="1.0" encoding="UTF-8"?>',
'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
]

for u in sorted(urls):
    s += [
    "  <url>",
    f"    <loc>{BASE_URL}{u}</loc>",
    f"    <lastmod>{now}</lastmod>",
    f"    <priority>{priority(u)}</priority>",
    "  </url>"
    ]

s.append("</urlset>")

with open(SITEMAP_OUTPUT,"w",encoding="utf-8") as f:
    f.write("\n".join(s))

print("sitemap.xml:",len(urls))