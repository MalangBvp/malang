<p>This documentation contains everything required to manage the Malang website and its supporting tools. It includes guides for updating website content, using internal utilities, managing broadcasts, and maintaining workflows used by the Malang core team.</p>

<ul id="docList">
  <h1>Malang | Docs</h1>
    <li>
      <details>
        <summary>Site</summary>
        <ul>
          <li>
            <details>
              <summary>Updation</summary>
              <ul>
                <li>
                  <details>
                    <summary>Events</summary>
                    <ul>
                      <li><a href="#Events">Upcoming Event</a></li>
                      <li><a href="#Timeline">Past Event</a></li>
                    </ul>
                  </details>
                </li>
                <li>
                  <details>
                    <summary>Galleries</summary>
                    <ul>
                      <li><a href="#Art-Gallery">Art Gallery</a></li>
                      <li><a href="#Photo-Gallery">Photo Gallery</a></li>
                    </ul>
                  </details>
                </li>
                <li>
                  <details>
                    <summary>Members</summary>
                    <ul>
                      <li><a href="#Core-Members">Core Members</a></li>
                      <li><a href="#Malang-Alumni">Malang Alumni</a></li>
                      <li><a href="#Associates">Associates</a></li>
                    </ul>
                  </details>
                </li>
              </ul>
            </details>
          </li>
          <li>
          <details>
              <summary>Management</summary>
              <ul>
                <li><a href="#Accounts">Accounts</a></li>
                <li><a href="#Claims">Claims</a></li>
                <li><a href="#Redirector">Redirector</a></li>
                <li><a href="#Treasury">Treasury</a></li>
                <li><a href="#QR-Code-Generator">QR Code Generator</a></li>
                <li><a href="#M-ArUCo">M-ArUCo</a></li>
                <li><a href="#Media-Kit">Media Kit</a></li>
              </ul>
            </details>
          </li>
          <li><a href="#Site-Structure">Site Structure</a></li>
          <li><a href="#Variables">Variables</a></li>
          <li>
          <details>
              <summary>Workflows</summary>
              <ul>
                <li><a href="#Update-Search-Data">Update Search Data</a></li>
                <li><a href="#Update-Structure">Update Structure</a></li>
              </ul>
            </details>
          </li>
      </details>
    </li>
    <li>
      <details>
        <summary>Tools</summary>
        <ul>
          <li><a href="#Attendance-QR-Tooll">Attendance QR Tool</a></li>
          <li><a href="#Certificate-Tool">Certificate Tool</a></li>
          <li><a href="#Contact-Tool">Contact Tool</a></li>
          <li><a href="#Mail-Tool">Mail Tool</a></li>
        </ul>
      </details>
    </li>
    <li>
      <details>
        <summary>Broadcasts</summary>
        <ul>
          <li><a href="#newsletter-emails">Newsletter Emails</a></li>
          <li><a href="https://whatsapp.com/channel/0029Val4ZfE2P59c7yG0zF3j" target="_blank">Whatsapp Channel</a></li>
          <li><a href="https://www.instagram.com/malangbvp" target="_blank">Instagram Channel</a></li>
        </ul>
      </details>
    </li>
  </ul>
<hr>
<br>

# Site > Updation

## Events

<h3 id="Events">Managing Upcoming Events</h3>

- Go to `/resrc/data/events.json` and add events like:

```json
[
  {
    "name": "EVENT NAME",
    "date": "EVENT DATE",
    "location": "EVENT VENUE",
    "description": "EVENT DESCRIPTION",
    "image": "[/resrc/images/misc/IMAGE] || IMAGE URL",
    "buttons": [
      {
        "text": "ALTERNATE BUTTON TEXT",
        "link": "REDIRECTION LINK",
        "focus": false
      },
      {
        "text": "PRIMARY BUTTON TEXT",
        "link": "REDIRECTION LINK",
        "focus": true
      }
    ]
  }
]
```

---

<h3 id="Timeline">Managing Past Events</h3>

- Go to `/resrc/data/timeline.json` and add events like:

```json
{
    "title": "EVENT TITLE",
    "date": "EVENT DATE",
    "description": "EVENT DESCRIPTION",
    "images": [
      list of paths of images to be added
    ]
  }
```

## Galleries

<h3 id="Art-Gallery">Managing Art Gallery</h3>

- Go to `/resrc/data/artworks.json` and add artwork like:

```json
"0": {
        "title": "ARTWORK TITLE",
        "artist": "ARTIST'S NAME",
        "type": "ARTWORK TYPE"
    }
```

> [!CAUTION]
> Artwork image must be in `.webp` format.
>
> The JSON key must be unique, continued series of existing keys and must match the image name.

> [!NOTE]
> Don't forget to add artwork image in `resrc\images\artworks` folder.
>
> Update the artwork count in `src/scripts/gallery.js`:

```js
        // artwork count and photograph count
        const total = mode === 'artworks' ? 68 : 42;
                                            ^
```

<h3 id="Photo-Gallery">Managing Photo Gallery</h3>

- Go to `/resrc/data/photographs.json` and add artwork like:

```json
"0": {
        "title": "PHOTOGRAPH TITLE",
        "artist": "PHOTOGRAPHER'S NAME",
        "type": "PHOTOGRAPH TYPE"
    }
```

> [!CAUTION]
> Phogograph must be in `.webp` format.
>
> The JSON key must be unique, continued series of existing keys and must match the image name.

> [!NOTE]
> Don't forget to add photograph in `resrc\images\photographs` folder.
>
> Update the photograph count in `src/scripts/gallery.js`:

```js
        // artwork count and photograph count
        const total = mode === 'artworks' ? 68 : 42;
                                                  ^
```

## Members

<h3 id="Core-Members">Core Members</h3>

Active core team members are managed in `resrc/data/core.json`.
The structure groups members by their generation and academic year.

- Go to [`/resrc/data/core.json`](file:///resrc/data/core.json) and add/update members in the current generation:

```json
[
    {
        "year": "2026-2027",
        "generation": "Gen VIII",
        "members": [
            {
                "name": "Member Name",
                "role": "Role Title",
                "image": "image_name.webp",
                "branch": "Branch Name",
                "linkedin": "https://linkedin.com/in/...",
                "github": "https://github.com/..."
            }
        ]
    }
]
```

> [!CAUTION]
> Member images must be placed in the `resrc/images/members/` directory.

<h3 id="Malang-Alumni">Malang Alumni</h3>

Past core members who have graduated or completed their tenure are recorded in `resrc/data/alumni.json`.

- Go to [`/resrc/data/alumni.json`](file:///resrc/data/alumni.json) and append a new generation block exactly like the core members format above when a batch passes out.

<h3 id="Associates">Associates</h3>

Associates are active club contributors whose data is loaded dynamically via a CSV file hosted in the `media` repository.

- To update the Associates list, edit the `members.csv` file in the **[MalangBvp/media](https://github.com/MalangBvp/media/blob/main/members.csv)** repository.
- **Required Columns:** `Name`, `Position`, `Year`, `Branch`, `Division`.
- Changes made to the CSV will automatically reflect on the [Associates page](file:///src/pages/members.html).

# Site > Management

This section covers the internal tools restricted to authorized members. Access is strictly managed.

<h3 id="Accounts">Accounts</h3>

The [Account portal](file:///src/pages/account.html) serves as the gateway to restricted utilities. Authentication is managed in two ways:
1. **Firebase Authentication:** Members must sign in with Google. To grant a new member access, add their email address to the array in [`/resrc/data/member-emails.json`](file:///resrc/data/member-emails.json).
2. **Passcodes:** Some pages (like Treasury, Media Kit, and Drafts) require a specific passcode. Passcodes are base64-encoded and verified inside [`src/scripts/authentication.js`](file:///src/scripts/authentication.js).

<h3 id="Claims">Claims</h3>

The [Claims page](file:///src/pages/claims.html) allows members to submit bills for reimbursement.
- **Process:** Members submit their name, the bill amount, and attach an image/PDF of the bill.
- **Backend:** The form encodes the file to Base64 and sends a POST request to a configured Google Apps Script endpoint which logs the claim into a Google Sheet with a "Pending" status.

<h3 id="Redirector">Redirector</h3>

The [Redirector](file:///src/pages/redirector.html) allows the core team to create shortened, custom links (`malangbvp.in/[slug]`).
- **Process:** Entering a long URL and a custom slug (`postfix`) directly modifies the redirects JSON file.
- **Backend:** It uses the Vercel serverless function [`api/create-redirect.js`](file:///api/create-redirect.js), which fetches the existing `r/redirects.json` via the GitHub API, checks for duplicates, appends the new redirect, and commits it directly to the repository using a securely stored `PERSONAL_PAT`.

<h3 id="Treasury">Treasury</h3>

The [Treasury dashboard](file:///src/pages/treasury.html) tracks all Malang expenses and funds.
- **Process:** Members log transactions by selecting a category header (e.g., Bharatiyam, Funds) and inputting a positive or negative amount.
- **Backend:** It communicates with a Google Apps Script to log transactions to a master Google Sheet. The page dynamically fetches the data from the sheet to render real-time balance and expense charts using `Chart.js`.

<h3 id="QR-Code-Generator">QR Code Generator</h3>

A built-in [QR Code Generator](file:///src/pages/qr.html) helps create scan-able QR codes for any link (e.g., for event registration posters).
- Note: This is an independent utility and is *not* related to the separate Attendance QR Tool.

<h3 id="M-ArUCo">M-ArUCo</h3>

[M-ArUCo](file:///src/pages/aruco.html) is an augmented reality scanner built into the site.
- **Process:** It scans physical ArUCo markers and maps their specific IDs to designated redirect links.
- **Update Mapping:** To change where a marker leads, update the ID mapping in [`/resrc/data/aruco.json`](file:///resrc/data/aruco.json):

```json
{
  "1": "https://tejasgupta.work",
  "2": "https://malangbvp.in/events"
}
```

<h3 id="Media-Kit">Media Kit</h3>

The [Media Kit](file:///src/pages/media.html) provides access to official logos and branding assets for Malang.
- It is a passcode-protected page accessible via the Account portal.

# Site Structure

<h3 id="Site-Structure">Directory Overview</h3>

The project is organized into several key directories:
- **`src/`**: Contains the source code for the site.
  - `components/`: Reusable HTML components (Navbar, Footer, etc.).
  - `pages/`: Individual HTML pages.
  - `scripts/`: Client-side JavaScript logic.
  - `styles/`: CSS stylesheets.
- **`resrc/`**: Contains resources like images, icons, and JSON data files (`resrc/data/`) that power the site content.
- **`api/`**: Contains Vercel serverless backend functions (e.g., `create-redirect.js`).
- **`variables/`**: Configuration files and parameters.

<h3 id="Variables">Variables</h3>

The [`variables/`](file:///variables/) directory contains configuration parameters used across different tools.
- Currently, it holds [`utils.json`](file:///variables/utils.json), which defines paths to structural text files (e.g., `structure_path_txt`).

# Workflows

<h3 id="Update-Search-Data">Update Search Data</h3>

A GitHub Action (`.github/workflows/update-search-data.yml`) runs automatically every Sunday at midnight (or can be triggered manually) to parse the site's HTML files.
- It executes a Python script (`generate_search_data.py`) to build an up-to-date `search.json` (for the site-wide search bar) and `sitemap.xml` (for SEO).
- It then commits and pushes these changes directly to the `main` branch.

<h3 id="Update-Structure">Update Structure</h3>

A GitHub Action (`.github/workflows/update-structure.yml`) maintains an up-to-date representation of the project's directory tree.
- It runs a Python script to generate a text-based tree structure of the repository.
- The output is saved to `/documentation/structure/structure.txt`, ensuring developers always have a clear map of the codebase.

<h1 id="Tools">Malang Tools</h1>

| Tool             | CSV Requirements | How to use?               |
| ---------------- | ---------------- | ------------------------- |
| Certificate Tool | name             | [Read](#Certificate-Tool) |
| Contact Tool     | contact no.      | [Read](#Contact-Tool)     |
| Mail Tool        | name, email      | [Read](#Mail-Tool)        |

---

<h3 id="Certificate-Tool">Certificate Tool</h3>

<a href="https://github.com/MalangBvp/Malang-Tools/tree/main/Certificate-tool" target="_blank">GitHub Link</a>

For creating bulk certificated with custom names and font-style.

```python
# sample configuration -----------------------------------------------------------------------
output_dir = "Certificate-tool/certificates"
# Certificate template (PNG/JPG)
template_path = "Certificate-tool/certificate_template.jpg"
#font style
pdfmetrics.registerFont(TTFont('NoticiaText', 'Certificate-tool/NoticiaText-BoldItalic.ttf'))
# size
PAGE_WIDTH, PAGE_HEIGHT = landscape(A4)
# position of the name on the certificate
NAME_X = PAGE_WIDTH / 1.6
NAME_Y = PAGE_HEIGHT / 1.8
FONT_SIZE = 42
data="Mail-tool/shortlisted.csv"
#--------------------------------------------------------------------------------------------
```

- **output_dir:** path of directory where certificates are saved
- **template_path:** path of certificate template.

> [!CAUTION]
> Template must be `.png` or `.jpg`.

- Store `.ttf` file in `Certificate-tool/` for **custom font** and refer it here

```python
#font style
pdfmetrics.registerFont(TTFont('NoticiaText', 'Certificate-tool/NoticiaText-BoldItalic.ttf'))
```

- Set **NAME_X** and **NAME_Y** for position of name on the certificate.
- **FONT_SIZE:** Sets the size of name text.
- **data:** Is the path to the file containing names.

---

<h3 id="Contact-Tool">Contact Tool</h3>

<a href="https://github.com/MalangBvp/Malang-Tools/tree/main/Contact-tool" target="_blank">GitHub Link</a>

For saving bulk contacts to Google contacts, generally useful for adding multiple people to Whatsapp group.

##### Setup

1. Install dependencies

```bash
pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client
```

2. Enable Google People API

- Create a project in <a href="https://console.cloud.google.com/" target="_blank">Google Cloud Console</a>.

- Enable _Google People API_.

- Create OAuth credentials (Desktop app) and replace `credentials.json`.

##### Configurations (edit in add_contacts.py)

```python
# configurations ---------------------------------------------------
contacts_file = 'Contact-tool/contacts.csv'   # CSV file path
prefix = "malang2025@"                        # Contact name prefix
#-------------------------------------------------------------------
```

- `contacts.csv` → one phone number per line, like:

```sql
8279843949,
1234567890,
```

- Contacts will be created as: `malang2025@1`, `malang2025@2`, etc.

---

<h3 id="Mail-Tool">Mail Tool</h3>

<a href="https://github.com/MalangBvp/Malang-Tools/tree/main/Mail-tool" target="_blank">GitHub Link</a>

Used for sending bulk emails with customised names, template and attachments.

> [!NOTE]
> `email_template.html` is the customizable design template of the email to be sent.

> [!IMPORTANT]
> Always use media like images, posters, etc. from <a href="https://github.com/MalangBvp/media" target="_blank">this repo</a> using links like:

```
https://raw.githubusercontent.com/MalangBvp/media/refs/heads/main/images/malang.webp
```

```python
# ------------- sample configurations --------------
subject = "Malang: Welcome to the club! 🥳"
csv_path = "Mail-tool/shortlisted.csv"
attachment_dir = "Certificate-tool/certificates"
#---------------------------------------------------
```

- **subject:** Subject of the emails to be sent.
- **csv_path:** Path of file that contains names and emails.
- **attachment_dir:** Path of directory where attachments are stored.

---

# Broadcasts

<h3 id="newsletter-emails">Newsletter Emails</h3>

Send E-mails to <a href="https://docs.google.com/spreadsheets/d/1uz3li0Uif-DtfTobPKj2fxwWTO8AIoWJghAhPCsyve0/" target="_blank">newsletter subscribers</a> via [Mail Tool](#Mail-Tool).
