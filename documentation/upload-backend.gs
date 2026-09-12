/**
 * Malang | Upload service
 * =========================================================
 * Google Apps Script web app that receives gallery submissions
 * from /src/pages/upload.html, stores the image in the Malang
 * Drive folder, and keeps one row per submission in a sheet.
 *
 * ---------------------------------------------------------
 * SETUP (once)
 * ---------------------------------------------------------
 * 1. Create a Google Sheet. Add a tab named "Submissions".
 *    Row 1 headers, in this order:
 *      id | submittedAt | submitterEmail | submitterName | artist |
 *      title | category | fileId | imageUrl | status | comment |
 *      reviewedBy | reviewedAt
 *
 * 2. Create (or pick) a Drive folder for incoming work.
 *
 * 3. script.google.com -> New project -> paste this file.
 *
 * 4. Project Settings -> Script Properties, add:
 *      SHEET_ID         the sheet's id from its URL
 *      DRIVE_FOLDER_ID  the folder's id from its URL
 *      FIREBASE_API_KEY AIzaSyD20pmHMSjDirK1CFEz1EIrUJWwqbVLev4
 *
 * 5. Deploy -> New deployment -> Web app.
 *      Execute as:       Me
 *      Who has access:   Anyone
 *    Copy the /exec URL.
 *
 * 6. Paste that URL into /resrc/data/upload-config.json as
 *    "endpoint", then commit. The upload page picks it up on
 *    the next load; no other code change is needed.
 *
 * ---------------------------------------------------------
 * WHY IT IS SHAPED THIS WAY
 * ---------------------------------------------------------
 * Every request carries a Firebase ID token, never a plain
 * email. The token is verified against Google's identity API
 * here on the server, so a member cannot be impersonated by
 * editing the request, and the reviewer check cannot be
 * bypassed from the browser console.
 */

var SHEET_NAME = 'Submissions';
var MEMBERS_URL = 'https://malangbvp.in/resrc/data/member-emails.json';
var REVIEWERS_URL = 'https://malangbvp.in/resrc/data/reviewers.json';

// ---------------------------------------------------------
// Entry points
// ---------------------------------------------------------

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.action === 'submit') return json(handleSubmit(body));
    if (body.action === 'decide') return json(handleDecide(body));
    return json({ ok: false, error: 'Unknown action.' });
  } catch (err) {
    return json({ ok: false, error: String(err.message || err) });
  }
}

function doGet(e) {
  try {
    if (e.parameter.action === 'queue') return json(handleQueue(e.parameter.idToken));
    return json({ ok: false, error: 'Unknown action.' });
  } catch (err) {
    return json({ ok: false, error: String(err.message || err) });
  }
}

// ---------------------------------------------------------
// Actions
// ---------------------------------------------------------

function handleSubmit(body) {
  var account = requireMember(body.idToken);

  if (!body.dataBase64) throw new Error('No image received.');
  if (!body.artist) throw new Error('Missing artist credit.');

  var props = PropertiesService.getScriptProperties();
  var folder = DriveApp.getFolderById(props.getProperty('DRIVE_FOLDER_ID'));

  var id = 'sub_' + new Date().getTime();
  var ext = (body.mimeType || 'image/webp').split('/')[1];
  var blob = Utilities.newBlob(
    Utilities.base64Decode(body.dataBase64),
    body.mimeType || 'image/webp',
    id + '.' + ext
  );

  var file = folder.createFile(blob);
  // Link-visible so the review grid can render thumbnails.
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  sheet().appendRow([
    id,
    new Date().toISOString(),
    account.email,
    account.displayName || '',
    body.artist,
    body.title || '',
    body.category || 'artworks',
    file.getId(),
    'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1200',
    'PENDING',
    '',
    '',
    ''
  ]);

  return { ok: true, id: id };
}

function handleQueue(idToken) {
  requireReviewer(idToken);

  var rows = sheet().getDataRange().getValues();
  var header = rows.shift();
  var items = rows.map(function (row) {
    var item = {};
    header.forEach(function (key, i) { item[key] = row[i]; });
    item.submitterName = item.submitterName || item.artist;
    return item;
  });

  // Newest first.
  items.reverse();
  return { ok: true, items: items };
}

function handleDecide(body) {
  var account = requireReviewer(body.idToken);

  if (['APPROVED', 'REJECTED'].indexOf(body.decision) === -1) {
    throw new Error('Invalid decision.');
  }

  var sh = sheet();
  var rows = sh.getDataRange().getValues();
  var header = rows[0];
  var col = {};
  header.forEach(function (key, i) { col[key] = i; });

  for (var r = 1; r < rows.length; r++) {
    if (rows[r][col.id] !== body.id) continue;
    sh.getRange(r + 1, col.status + 1).setValue(body.decision);
    sh.getRange(r + 1, col.comment + 1).setValue(body.comment || '');
    sh.getRange(r + 1, col.reviewedBy + 1).setValue(account.displayName || account.email);
    sh.getRange(r + 1, col.reviewedAt + 1).setValue(new Date().toISOString());
    return { ok: true };
  }

  throw new Error('Submission not found.');
}

// ---------------------------------------------------------
// Auth
// ---------------------------------------------------------

/** Verifies the Firebase ID token and returns the real account behind it. */
function verifyToken(idToken) {
  if (!idToken) throw new Error('Not signed in.');

  var apiKey = PropertiesService.getScriptProperties().getProperty('FIREBASE_API_KEY');
  var res = UrlFetchApp.fetch(
    'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + apiKey,
    {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ idToken: idToken }),
      muteHttpExceptions: true
    }
  );

  if (res.getResponseCode() !== 200) throw new Error('Session expired. Please sign in again.');

  var account = JSON.parse(res.getContentText()).users[0];
  if (!account || !account.email) throw new Error('No email on this account.');

  return { email: String(account.email).trim().toLowerCase(), displayName: account.displayName };
}

function requireMember(idToken) {
  var account = verifyToken(idToken);
  if (list(MEMBERS_URL).indexOf(account.email) === -1) {
    throw new Error('Only Malang members can upload work.');
  }
  return account;
}

function requireReviewer(idToken) {
  var account = verifyToken(idToken);
  if (list(REVIEWERS_URL).indexOf(account.email) === -1) {
    throw new Error('Reviewer access required.');
  }
  return account;
}

/** Roster lists live on the site, so access follows the repo with no redeploy here. */
function list(url) {
  var cache = CacheService.getScriptCache();
  var hit = cache.get(url);
  if (hit) return JSON.parse(hit);

  var text = UrlFetchApp.fetch(url).getContentText();
  var emails = JSON.parse(text).map(function (e) { return String(e).trim().toLowerCase(); });
  cache.put(url, JSON.stringify(emails), 300);
  return emails;
}

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------

function sheet() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  return SpreadsheetApp.openById(id).getSheetByName(SHEET_NAME);
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
