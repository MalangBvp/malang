# Local workspace setup

Use this when you want to work on Malang from your own machine instead of a Cursor Cloud Agent.

The Cloud Agent workspace is **five GitHub repos as siblings**. On your PC they live here:

```text
Documents/project-adi/
├── malang          ← website (this repo)
├── malang-tools    ← certificate / mail / contact / attendance QR
├── media           ← public assets + associates CSV
├── redirector      ← short-link JSON
├── .github         ← GitHub org profile README
└── project-adi.code-workspace
```

`Documents` means your user Documents folder (`~/Documents` on macOS/Linux, `[My Documents]\project-adi` on Windows, including OneDrive-redirected Documents). Override with `PROJECT_ADI` if you want a different path.

## 1. Create the workspace (one command)

**macOS / Linux / Git Bash**

```bash
mkdir -p ~/Documents/project-adi && cd ~/Documents/project-adi
git clone https://github.com/malangbvp/malang.git
bash malang/scripts/clone-workspace.sh
cursor ~/Documents/project-adi/project-adi.code-workspace
```

`clone-workspace.sh` clones any missing sibling repos into `Documents/project-adi` and copies the workspace file next to them.

**Windows PowerShell**

```powershell
$dest = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'project-adi'
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Set-Location $dest
git clone https://github.com/malangbvp/malang.git
powershell -ExecutionPolicy Bypass -File .\malang\scripts\clone-workspace.ps1
cursor (Join-Path $dest 'project-adi.code-workspace')
```

Open **File → Open Workspace from File…** and pick `Documents/project-adi/project-adi.code-workspace` if the `cursor` CLI is not on your PATH.

After that you should see all five folders in one Cursor window.

## 2. Run the website

The site is static HTML/CSS/JS plus one Vercel function (`api/create-redirect.js`). There is no `package.json`.

**Static pages only** (home, galleries, events, etc.):

```bash
cd ~/Documents/project-adi/malang
python3 -m http.server 8000
# open http://localhost:8000
```

**Full local stack including `/api/create-redirect`:**

```bash
npm i -g vercel
cd ~/Documents/project-adi/malang
vercel link          # attach to the existing malangbvp.in project
vercel env pull      # writes .env.local with PERSONAL_PAT
vercel dev           # typically http://localhost:3000
```

`.env` is gitignored. Never commit tokens.

### What `PERSONAL_PAT` is

The redirector API commits to `MalangBvp/redirector` via the GitHub API. The token lives in:

- Vercel project env: `PERSONAL_PAT`
- GitHub Actions on `malang` and `redirector`: `PERSONAL_PAT`

It needs `contents: write` on `MalangBvp/redirector`. Use a fine-grained PAT if you rotate it.

You do **not** need this token to edit pages, JSON, CSS, or most JS.

## 3. What you do not need to copy from Cloud

Cloud did not generate unique build artifacts. Latest `main` is the source of truth.

This Cloud run (`https://cursor.com/agents/bc-bffb6362-960c-4922-81b1-eda29676b8da`) only produced analysis. The architecture write-up is in [`ARCHITECTURE.md`](./ARCHITECTURE.md).

Firebase, Google Sheets, and Apps Script URLs are already hardcoded in the pages. They work from localhost the same way they work in production (CORS/`no-cors` behaviour included).

## 4. Secrets and accounts you already use

Keep these in password managers / dashboards. Do not paste them into git.

| What | Where it is used | Where to get it |
|---|---|---|
| `PERSONAL_PAT` | Vercel `/api/create-redirect`, GitHub Actions | Vercel env + GitHub repo secrets |
| Firebase `malang-auth` | Google / GitHub login | Firebase console (config is already in `index.html` / `account.html`) |
| Apps Script deployments | Forms, claims, treasury, newsletter | The `/exec` URLs already in each page |
| Gmail SMTP for Mail-tool | `malang-tools/Mail-tool` | Google App Password for the sending account |
| Google People API OAuth | `malang-tools/Contact-tool` | Cloud Console desktop OAuth client |

`malang-tools` currently commits OAuth files and has historically contained SMTP app passwords in source. Treat that repo as sensitive. Rotate anything that was ever committed, then keep `credentials.json`, `token.json`, and app passwords out of git.

## 5. Tools repo (Python)

```bash
cd ~/Documents/project-adi/malang-tools
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install reportlab google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client
```

| Tool | How to run |
|---|---|
| Certificate-tool | Edit paths at the top of `Certificate-tool/certificate_generator.py`, then `python Certificate-tool/certificate_generator.py` |
| Mail-tool | Edit subject/CSV/template in `Mail-tool/email_sender.py`, then run it |
| Contact-tool | `python Contact-tool/contact_saver.py` (needs `credentials.json`) |
| Attendance-QR-tool | Open `Attendance-QR-tool/index.html` in a browser and upload a CSV |

## 6. Content you will edit most often

| Change | File / repo |
|---|---|
| Upcoming events | `malang/resrc/data/events.json` |
| Past events | `malang/resrc/data/timeline.json` + images |
| Art / photo gallery | `artworks.json` / `photographs.json` + `.webp` files; bump counts in `src/scripts/gallery.js` (currently 132 / 118) |
| Core / alumni | `core.json` / `alumni.json` + `resrc/images/members/` |
| Who can log in | `malang/resrc/data/member-emails.json` |
| Associates table | `media/members.csv` |
| Short links | Redirector UI on the site, or `redirector/r/redirects.json` |

Push to `malang` `main` regenerates `search.json` and `sitemap.xml` via GitHub Actions.

## 7. Suggested first local check

1. `python3 -m http.server 8000` in `Documents/project-adi/malang` and open `/`.
2. Confirm the iframe loads `src/pages/home.html`.
3. Hit `malangbvp.in/instagram`-style paths only on the deployed domain (or `vercel dev`) — local `http.server` will not run the short-link handler the same way unless you open `/` and rely on `load.js`.
4. Do not test treasury/claims writes against production sheets unless you intend to.

Read [`ARCHITECTURE.md`](./ARCHITECTURE.md) for how the shell, auth, Sheets, and repos fit together.
