# Malang architecture and functionality

Fine Arts & Photography Club of Bharati Vidyapeeth College of Engineering, Pune. Public site: [malangbvp.in](https://malangbvp.in).

This is a static, JSON-driven website with one Vercel function, Google Sheets as the write-side, and four supporting GitHub repos. There is no Node app, no shared backend framework, and no database server.

## Repos

| Repo | Role |
|---|---|
| **malang** | Website: static HTML/CSS/JS, JSON content, `api/create-redirect.js` |
| **redirector** | Short-link table: `r/redirects.json` |
| **media** | Public assets via GitHub raw (logos, `members.csv`, ICS) |
| **malang-tools** | Offline ops: certificates, bulk mail, Google Contacts, attendance QR |
| **.github** | Org profile README |

Hosting: Vercel (static + `/api/*.js`). Auth: Firebase project `malang-auth`. Operational data: Google Sheets through Apps Script web apps whose `/exec` URLs are hardcoded in pages.

```text
Browser
  │
  ▼
malangbvp.in (Vercel)
  index.html ── iframe ── src/pages/*
  Firebase Auth (Google / GitHub)
  /api/create-redirect.js
        │                    │
        │ GitHub raw         │ POST
        ▼                    ▼
redirector/r/redirects.json     Google Apps Script
media/members.csv               └── Google Sheets
malang/resrc/data/*.json
```

## How the site loads

Not React/Vue. **Shell + iframe.**

`index.html` is chrome (SEO, Firebase, search, nav). `#content` is a full-viewport iframe.

Boot (`src/scripts/load.js`):

1. Read the path after the origin.
2. If it is not empty and not `index.html`, fetch `redirector` `r/redirects.json` from GitHub raw and `location.replace` if the slug exists. That is `malangbvp.in/instagram`.
3. Otherwise load `/?page=…` into the iframe. Default: `home.html`. Extra query params are forwarded.

Deep links:

- `https://malangbvp.in/?page=gallery&mode=photographs`
- `https://malangbvp.in/?page=home.html`
- `https://malangbvp.in/?q=rangotsav` opens site search

In-app navigation is `parent.loadPage('/src/pages/….html')`. The copy-link button builds `origin/?page=<iframe-file>`.

Shared UI is in `src/scripts/common.js` (alerts, modal, newsletter, restricted-section toggling). Chrome snippets load via `data-include` (`nav.html`, `footer.html`, `search.html`).

## Public functionality

### Home

3D GLB logo (`model-viewer`) that follows mouse / device tilt, starfield, masonry photos, sponsor marquee, newsletter in the footer.

Linked pages that are currently missing: `brochure.html` (use `pdf.html` for the 2026 brochure), `r.html` (Rangotsav).

### Events

- Upcoming: `resrc/data/events.json` via `events.js`. Empty array shows a “no live events” message. Google Calendar (`malangbvp@gmail.com`) is always embedded.
- Past: `timeline.json`, 7 events per “view more” batch. Images open the shared modal.

### Galleries

One page, two modes (artworks / photographs). Metadata keys match `0.webp`, `1.webp`, …. Hardcoded totals in `gallery.js`: **132 artworks, 118 photographs**. Filters (type, artist) sync to the query string. Images load in batches of 26. Copy/save/zoom deterrents are client-side only.

### Members

| Page | Source | UI |
|---|---|---|
| Core | `core.json` + `resrc/images/members/` | 3D carousel (Gen VIII, 2026–2027) |
| Alumni | `alumni.json` | Generation tables |
| Associates | `media` `members.csv` (GitHub raw) | Table: Name, Position, Year, Branch, Division. First 7 CSV rows are skipped. |

### Fashion Euphoria

`fe.html`: countdown to `2026-02-28`, posters, partners, 2025 recap video.

- `fe-register.html` — team registration → Apps Script
- `fe-pay.html` — payment proof → Apps Script

### Recruitment

`src/pages/recruitment_form/` is a standalone multi-step form (domains, avatars). POST JSON to Apps Script with `mode: 'no-cors'`. Marked Open in the nav.

### Search

Fuse.js over `resrc/data/search.json`. Shortcut `\`. Shareable `?q=` URLs. Regenerated on every push to `main` (not a weekly cron, despite older README text).

### Other public pages

Privacy, terms, unsubscribe, sitemap, 404, feature-request form (`form.html`), brochure PDF (`pdf.html`), t-shirt order form (`tshirt.html`).

Newsletter subscribe/unsubscribe POSTs `email` + `mode` to one Apps Script.

## Member / core-team functionality

### Auth (two client-side layers)

**Firebase + allowlist.** Google or GitHub popup on `account.html`. Email must be in `member-emails.json` or the session is signed out. Success sets `localStorage.loggedIn` and toggles `.restricted` / `.protected` CSS. Account linking handles `auth/account-exists-with-different-credential`.

This is **not** a server session. Restricted HTML is still downloadable.

**Passcodes** on `authentication.html?page=…` are Base64 of the page name (`treasury` → treasury.html, `media` → media.html, `drafts` → drafts.html). Account also links `?page=tshirt`, which is not in `authMap` and shows an invalid-page error.

### After login

Claims, redirects list, redirector, QR generator, site docs.

Extra passcode: treasury, media kit, drafts (drafts is a stub).

External: Attendance QR, Certificate, Contact, Mail (GitHub).

### Claims

Name, amount, bill image/PDF → Base64 → Apps Script → sheet row `Pending`.

### Treasury

GET live total from Apps Script. Ledger from a public Sheet (`gviz/tq?tqx=out:json`). Chart.js: balance over time and expenses by header (Bharatiyam, Claims, Development, Funds, Party / Trip, Other). POST `mode=add` writes immediately. No server-side role check.

### Redirector

UI POSTs `{ longURL, postfix }` to `/api/create-redirect`. The function uses `PERSONAL_PAT` to insert the slug at the top of `redirector` `r/redirects.json` (HTTP 409 if it exists). The redirects table reads the same JSON from GitHub raw.

A `workflow_dispatch` Action on `redirector` can do the same insert with `jq`; the live UI uses the Vercel function.

### QR generator

Client-only (`qr-code-styling`). Unrelated to Attendance-QR-tool.

### Media Kit

Passcode page of official logos.

### Drafts

Stub: “under development”.

### M-ArUCo

Nav item commented out. `aruco.js` opens the rear camera only. `aruco.json` is unused.

### Site Docs

Renders the repo README (`marked` + highlight.js), `documentation/structure/structure.txt`, and the latest commit on `main`.

## Data files

```text
resrc/data/
  events.json          upcoming (often empty)
  timeline.json        past events
  artworks.json
  photographs.json
  core.json
  alumni.json
  aruco.json           unused
  member-emails.json   Firebase allowlist
  search.json          generated — do not edit by hand
```

Associates: `https://raw.githubusercontent.com/MalangBvp/media/main/members.csv`.

## CI

| Workflow | Trigger | Effect |
|---|---|---|
| `update-search-data.yml` | push to `main` | Rebuild `search.json` + `sitemap.xml` |
| `update-structure.yml` | push to `main` (not by `github-actions[bot]`) | Rebuild `documentation/structure/structure.txt` |
| `create-pr.yml` (malang / redirector) | manual | Alternate redirect insert; production path is the Vercel API |

## malang-tools

| Tool | Input | Output |
|---|---|---|
| Certificate-tool | CSV (`ID`, `Email`, `Names`) + template + font | Landscape A4 PDFs |
| Mail-tool | Email CSV + HTML template + PDFs | Gmail SMTP |
| certificate_email.py | Same CSV as certificates | Emails POCs their PDFs (zip if >2) |
| Contact-tool | Phone CSV | Google People contacts `prefix1`, `prefix2`, … |
| Attendance-QR-tool | Browser CSV (`name`, `branch`) | Styled QR PNGs; payload `"name, branch"` |

## Apps Script surfaces

| Surface | Typical payload |
|---|---|
| Newsletter | `email`, `mode=subscribe\|unsubscribe` |
| Feature request | JSON + optional Base64 file |
| Recruitment | Name, gender, domains, contact, year/branch/division, motivation, portfolio |
| FE register / FE pay | Team form / payment proof |
| T-shirt | Merch order |
| Claims | name, amount, file, `status=Pending` |
| Treasury | `mode=add`, header, signed amount |

Public forms often use `mode: 'no-cors'`, so the UI cannot distinguish success from failure.

## PWA / SEO

`manifest.json` exists. `service-worker.js` is registered then immediately unregistered in `load.js`, so the SW is effectively unused.

`robots.txt` allows pages and images, blocks `/api/`, `/resrc/data/`, scripts and styles. Sitemap: `/sitemap.xml`.

## Known mismatches and risks

- README gallery counts (68 / 42) are stale; code uses 132 / 118.
- Search Action is on every `main` push, not weekly.
- `structure.txt` still lists deleted pages (`brochure.html`, `r.html`, …).
- Auth and treasury passcodes are client-side; the treasury sheet is readable via the public `gviz` URL.
- `events.json` can be empty while the calendar still works.
- Footer `href`s can break out of the iframe shell and drop the nav.

See [`LOCAL_SETUP.md`](./LOCAL_SETUP.md) to run this on a laptop.
