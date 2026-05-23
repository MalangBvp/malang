import os, json
from datetime import datetime, timezone
from bs4 import BeautifulSoup

INCLUDE_DIRS = ["src/pages"]
DATA_DIR = "resrc/data"
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

# ─────────────────────────────────────────────
# 1. Scrape HTML pages (existing behaviour)
# ─────────────────────────────────────────────
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
                "content": text[:800],
                "category": "page",
                "tags": []
            })

            urls.add(url)

# ─────────────────────────────────────────────
# 2. Alumni data  →  one entry per member
# ─────────────────────────────────────────────
alumni_path = os.path.join(DATA_DIR, "alumni.json")
if os.path.exists(alumni_path):
    with open(alumni_path, encoding="utf-8") as f:
        alumni_data = json.load(f)

    for gen in alumni_data:
        year = gen.get("year", "")
        generation = gen.get("generation", "")
        for member in gen.get("members", []):
            name = member.get("name", "").strip()
            if not name or name == "NA":
                continue
            role = member.get("role", "")
            branch = member.get("branch", "")

            content_parts = [f"{name}", f"{role}", f"Batch: {year}", f"{generation}"]
            if branch:
                content_parts.append(f"Branch: {branch}")

            tags = [t for t in [role, branch, generation, year] if t]

            entries.append({
                "title": name,
                "url": "/src/pages/alumni.html",
                "content": " · ".join(content_parts),
                "category": "alumni",
                "tags": tags
            })

# ─────────────────────────────────────────────
# 3. Artworks  →  one entry per artwork
# ─────────────────────────────────────────────
artworks_path = os.path.join(DATA_DIR, "artworks.json")
if os.path.exists(artworks_path):
    with open(artworks_path, encoding="utf-8") as f:
        artworks_data = json.load(f)

    for art_id, art in artworks_data.items():
        title = art.get("title", "").strip()
        artist = art.get("artist", "").strip()
        art_type = art.get("type", "").strip()

        # Skip entries with no useful searchable text
        if not title and not artist:
            continue

        display_title = title if title else f"Artwork by {artist}"
        content_parts = []
        if title:
            content_parts.append(title)
        if artist:
            content_parts.append(f"Artist: {artist}")
        if art_type:
            content_parts.append(f"Type: {art_type}")

        tags = [t for t in [art_type, artist] if t]

        entries.append({
            "title": display_title,
            "url": "/src/pages/gallery.html",
            "content": " · ".join(content_parts),
            "category": "artwork",
            "tags": tags
        })

# ─────────────────────────────────────────────
# 4. Photographs  →  one entry per photographer
#    (grouped to avoid excessive entries)
# ─────────────────────────────────────────────
photos_path = os.path.join(DATA_DIR, "photographs.json")
if os.path.exists(photos_path):
    with open(photos_path, encoding="utf-8") as f:
        photos_data = json.load(f)

    # Group by photographer
    photographers = {}
    for photo_id, photo in photos_data.items():
        artist = photo.get("artist", "").strip()
        if not artist:
            continue
        if artist not in photographers:
            photographers[artist] = {"types": set(), "count": 0}
        photo_type = photo.get("type", "").strip()
        if photo_type:
            photographers[artist]["types"].add(photo_type)
        photographers[artist]["count"] += 1

    for artist, info in photographers.items():
        types_list = sorted(info["types"])
        count = info["count"]
        content_parts = [f"Photographer: {artist}", f"{count} photograph{'s' if count != 1 else ''}"]
        if types_list:
            content_parts.append(f"Categories: {', '.join(types_list)}")

        entries.append({
            "title": f"Photos by {artist}",
            "url": "/src/pages/gallery.html",
            "content": " · ".join(content_parts),
            "category": "photograph",
            "tags": types_list + [artist]
        })

# ─────────────────────────────────────────────
# 5. Timeline events  →  one entry per event
# ─────────────────────────────────────────────
timeline_path = os.path.join(DATA_DIR, "timeline.json")
if os.path.exists(timeline_path):
    with open(timeline_path, encoding="utf-8") as f:
        timeline_data = json.load(f)

    for event in timeline_data:
        title = event.get("title", "").strip()
        if not title:
            continue
        date = event.get("date", "")
        location = event.get("location", "")
        description = event.get("description", "")

        content_parts = [title]
        if date:
            content_parts.append(date)
        if location:
            content_parts.append(location)
        if description:
            content_parts.append(description[:300])

        tags = [t for t in [date, location] if t]

        entries.append({
            "title": title,
            "url": "/src/pages/timeline.html",
            "content": " · ".join(content_parts),
            "category": "event",
            "tags": tags
        })

# ─────────────────────────────────────────────
# Save search.json
# ─────────────────────────────────────────────
os.makedirs(os.path.dirname(SEARCH_OUTPUT),exist_ok=True)
with open(SEARCH_OUTPUT,"w",encoding="utf-8") as f:
    json.dump(entries,f,indent=2)

print("search.json:",len(entries))

# ─────────────────────────────────────────────
# Sitemap
# ─────────────────────────────────────────────
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