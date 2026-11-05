# Upload page setup (one time, about 15 minutes)

This connects the **Upload Work** page to the Malang Google Drive and to the
website gallery. You do it once. After that everything is automatic:

```
member uploads  ->  photo is saved in Drive > Website > Pending Uploads
reviewer clicks Approve  ->  photo appears in the website gallery (about 1 minute)
                             and moves to Drive > Website > Artworks / Photographs
```

There are three parts:

| Part | What it is | Who / which account |
|---|---|---|
| A | Make a **GitHub key** so approved work can be added to the website | Your GitHub account (must be able to push to `MalangBvp/malang`) |
| B | Set up the **postman** (Google Apps Script) that saves uploads in Drive | **malangbvp@gmail.com** |
| C | Tell the website the postman's address | Anyone with repo access |

---

## Part A: GitHub key (5 minutes)

The key lets the postman add approved pictures to the website. It can only
change files in `MalangBvp/malang`, nothing else.

1. Go to **github.com** and sign in.
2. Click your **profile photo** (top right) > **Settings**.
3. In the left menu, scroll to the bottom > **Developer settings**.
4. **Personal access tokens** > **Fine-grained tokens** > **Generate new token**.
5. Fill in:
   - **Token name:** `Malang upload publisher`
   - **Expiration:** pick **Custom** and choose a date one year from now.
     Put a reminder in your calendar: when the key expires, approving stops working until you make a new one.
   - **Resource owner:** `MalangBvp`
   - **Repository access:** **Only select repositories** > choose **malang**
   - **Permissions** > **Repository permissions** > **Contents** > **Read and write**
     (GitHub adds "Metadata: Read-only" by itself, that's fine)
6. Click **Generate token**.
7. **Copy the token** (it starts with `github_pat_`). GitHub shows it only once.
   Keep it in a safe place for Part B.

> Never paste this token into chat, code, WhatsApp or any file in the repo.
> It only goes into the postman's private settings in Part B.

**If `MalangBvp` is not in the Resource owner list,** or the token says "pending":
the organisation must allow these keys. An owner of the MalangBvp organisation goes to
**github.com/MalangBvp** > **Settings** > **Personal access tokens** and allows
fine-grained tokens (and approves your request under **Pending requests**).

---

## Part B: The postman (10 minutes, as malangbvp@gmail.com)

Do this whole part **signed in as malangbvp@gmail.com**. Tip: use a separate
Chrome profile or an Incognito window so you don't mix it up with your own account.

### B1. Paste the code
1. Open **script.google.com** > **New project**.
2. Click **Untitled project** at the top and rename it to `Malang Upload Service`.
3. In `Code.gs`, delete everything that is already there.
4. Open [`documentation/upload-backend.gs`](upload-backend.gs) on GitHub > click **Raw** >
   select all (**Ctrl+A**) > copy (**Ctrl+C**).
5. Paste it into `Code.gs` (**Ctrl+V**) and press **Ctrl+S** to save.

### B2. Add the 3 settings
1. Click the **gear icon** (Project Settings) in the left bar.
2. Scroll down to **Script Properties** > **Add script property**. Add these three:

| Property | Value |
|---|---|
| `WEBSITE_FOLDER_ID` | Open Google Drive > **My Drive > Website**. Look at the address bar: `drive.google.com/drive/folders/`**`1CXt...`** Copy only the part after `/folders/`. |
| `FIREBASE_API_KEY` | `AIzaSyD20pmHMSjDirK1CFEz1EIrUJWwqbVLev4` (this one is already public in the website code, it is not a secret) |
| `GITHUB_TOKEN` | The `github_pat_...` key from Part A |

3. Click **Save script properties**.

### B3. Run setup once
1. Click the **< >** icon (Editor) in the left bar.
2. At the top, in the function menu next to **Run**, choose **`setup`**. Click **Run**.
3. Google asks for permission:
   **Review permissions** > choose **malangbvp@gmail.com** >
   you will see *"Google hasn't verified this app"*. This is normal for your own script.
   Click **Advanced** > **Go to Malang Upload Service (unsafe)** > **Allow**.
4. Look at the **Execution log** at the bottom. You should see:
   ```
   Folders and sheet are ready inside "Website".
   EMPTY  Members tab has 0 emails.
   EMPTY  Reviewers tab has 0 emails.
   OK  FIREBASE_API_KEY is set.
   OK  GitHub token can see MalangBvp/malang.
   ```
   In Drive > Website you now also have a **Pending Uploads** folder and a
   **Malang Upload Submissions** sheet. Your existing Artworks and Photographs
   folders are reused, nothing is deleted.

   If a line says `MISSING` or `PROBLEM`, fix that property in B2 and run `setup` again.
   `EMPTY` is expected the first time: you fill those tabs in B3b.

### B3b. Add members and reviewers
The list of who is a member, and who is a reviewer, lives **only in the sheet**,
not on the website. Nobody visiting the site can see it.

1. Open Drive > Website > **Malang Upload Submissions**.
2. **Members** tab: put each member's Gmail in **column A**, one per row, starting
   on row 2. Column B (`name`) is just a note for you; the script ignores it.
3. **Reviewers** tab: same, for the people who approve uploads.
   A reviewer should also be in **Members**, or they can't open the upload page.

Capital letters and spaces around the email don't matter.

### B4. Deploy it
1. Top right: **Deploy** > **New deployment**.
2. Click the **gear** next to "Select type" > **Web app**.
3. Fill in:
   - **Description:** `v1`
   - **Execute as:** **Me (malangbvp@gmail.com)**
   - **Who has access:** **Anyone**
4. Click **Deploy** (allow access again if asked).
5. Copy the **Web app URL**. It looks like
   `https://script.google.com/macros/s/AKfy.../exec`
6. Check it works: open that URL in a new tab. You should see
   `{"ok":true,"service":"malang-upload","version":5}`

"Anyone" is needed so the website can talk to it. Nobody can do anything with
it without signing in on the website as a listed member or reviewer: every
request is checked. When the website asks "who am I?" it only gets a yes or no
for the person signed in, never the list.

---

## Part C: Connect the website

Put the Web app URL from B4 into [`resrc/data/upload-config.json`](../resrc/data/upload-config.json):

```json
"endpoint": "https://script.google.com/macros/s/AKfy.../exec",
```

Commit and push. Once the site updates, the yellow "not connected" notice on
the upload page disappears and uploads go to Drive. (The URL is not a secret;
it is fine for it to be in the website code.)

---

## Try it

1. Sign in on **Upload Work** with a member account, upload a test image.
2. Check **Drive > Website > Pending Uploads**: the image is there, and the sheet has a new row.
3. Sign in as a reviewer > **Review** tab > **Approve & publish**.
4. About a minute later the image is in the gallery, and the Drive file has
   moved to **Artworks** or **Photographs**.

---

## One time: moving the member lists off the website (November 2026)

The member and reviewer emails used to be public files on the website
(`member-emails.json`, `reviewers.json`). They now live only in the sheet.
If your postman shows a version lower than 5, do these steps **in this order**,
as malangbvp@gmail.com. The website update must go live **last**, because
step 3 copies the emails from those old files before they disappear.

1. Open the **Malang Upload Service** script. Replace everything in `Code.gs`
   with the new `documentation/upload-backend.gs` and press **Ctrl+S**.
   (Saving does not change the live postman yet.)
2. Run **`setup`** (B3). It adds empty **Members** and **Reviewers** tabs to the sheet.
3. In the function menu choose **`importOldListsFromSite`** > **Run**. The log should say
   ```
   OK  Members: added 53, 53 in total.
   OK  Reviewers: added 4, 4 in total.
   ```
4. Open the sheet and check the two tabs look right.
5. **Deploy** > **Manage deployments** > pencil icon > **Version: New version** > **Deploy**.
   Open the Web app URL: it should now say `"version":5`.
6. Now push the website update that deletes the two files.
7. Sign in on the website: the Account page and Upload page should work as before.

You can delete this section once it is done.

---

## Everyday changes

| I want to... | Do this |
|---|---|
| Add a new member | Open Drive > Website > **Malang Upload Submissions** > **Members** tab. Type their Gmail in **column A** on the first empty row (their name in column B if you like). Works within a minute. No push, no redeploy. |
| Remove a member | Delete their row in the **Members** tab (right-click the row number > **Delete row**). Works within a minute. |
| Add or remove a reviewer | Same, in the **Reviewers** tab. Reviewers must also be in **Members**. |
| Let another core member manage the lists | Share the *Malang Upload Submissions* sheet with their Gmail as **Editor**. Only share it with core: it holds everyone's email. |
| Add a new type (e.g. "Charcoal") | Add it to the `types` list in `resrc/data/upload-config.json` and push. |
| Update the postman code | Paste the new code > **Deploy** > **Manage deployments** > pencil icon > **Version: New version** > **Deploy**. The URL stays the same. |
| Replace an expired or leaked GitHub key | Make a new key (Part A), delete the old one on GitHub, then change `GITHUB_TOKEN` in B2. No redeploy needed. |
| Change the upload limits | In the script, edit the `LIMIT_...` lines near the top of `CONFIG`, then deploy a **New version**. |
| Let reviewers approve their own work | Set `ALLOW_SELF_APPROVAL: true` in `CONFIG` and deploy a **New version**. (Off by default, so every work is seen by someone else.) |
| See what went wrong / who approved what | Open the **Log** tab in the *Malang Upload Submissions* sheet. It keeps the last 5000 errors, decisions and withdrawals. |

### Built-in limits

| Limit | Default |
|---|---|
| Uploads per member per hour | 15 |
| Uploads per member per day | 40 |
| Works one member can have waiting for review | 25 |
| Uploads for the whole club per day | 400 |
| Requests per member per 10 minutes | 150 |
| Smallest / largest image side | 200px / 4000px |

The same image can't be submitted twice while it is waiting or live (it can
after a reviewer asks for changes).

## If something goes wrong

| Message | Meaning / fix |
|---|---|
| "Only Malang members can upload work." / "Unauthorised Access" / "This account is not on the Malang member list." | That Gmail is not in the **Members** tab, or has a typo. Fix it there; it works within a minute. |
| "Could not check your membership…" | The website could not reach the postman, or the postman has old code. Open the Web app URL (B4): it should show `"version":5` or higher. If the number is lower, paste the new code and deploy a **New version**. |
| "The "Members" tab is missing from the sheet." | Run `setup` once (B3). |
| "Session expired. Please sign in again." | Sign out and sign in again on the website. |
| "Could not publish to the website. GitHub 401" | The GitHub key expired or was deleted. Make a new one (Part A) and update `GITHUB_TOKEN`. |
| "Could not publish to the website. GitHub 403 / 404" | The key does not have **Contents: Read and write** on **malang**, or the organisation has not approved it. |
| "PENDING_FOLDER_ID is missing" | Run `setup` once (B3). |
| "You have uploaded a lot in the last hour…" / "today's limit" / "works waiting for review" | A limit was reached (see Built-in limits). It clears by itself. |
| "You uploaded this image before…" | That exact image is already waiting or live. |
| "You can't approve your own work." | Another reviewer has to approve it. |
| "Too many sign-in attempts right now." | Someone sent lots of fake sign-ins; it pauses for a minute. Check the Log tab. |
| Upload page still shows the yellow "not connected" notice | `endpoint` in `upload-config.json` is empty, or the site has not updated yet. |
