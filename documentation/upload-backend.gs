/**
 * Malang | Upload service
 * =========================================================
 * Google Apps Script web app behind /src/pages/upload.html.
 *
 *   member uploads  ->  file lands in Drive "Website/Pending Uploads"
 *                       and a row is added to the submissions sheet
 *   reviewer approves -> image + gallery entry are committed to
 *                       MalangBvp/malang (the site redeploys itself),
 *                       and the Drive file moves to Website/Artworks
 *                       or Website/Photographs
 *   reviewer rejects  -> row is marked, file stays in Pending
 *
 * Setup steps live in documentation/upload-setup.md. In short:
 * paste this file, add 3 Script Properties, run setup() once,
 * deploy as a web app, put the URL in upload-config.json.
 *
 * Every request carries a Firebase ID token, never a plain email.
 * The token is checked against Google's identity API here, so a
 * member cannot be impersonated from the browser and reviewer
 * rights cannot be granted from the console.
 */

const CONFIG = {
  SITE: 'https://malangbvp.in',
  GITHUB_REPO: 'MalangBvp/malang',
  GITHUB_BRANCH: 'main',
  SHEET_FILE_NAME: 'Malang Upload Submissions',
  SHEET_TAB: 'Submissions',
  PENDING_FOLDER_NAME: 'Pending Uploads',
  MAX_IMAGE_BYTES: 15 * 1024 * 1024,
  MAX_TITLE: 120,
  STALE_PUBLISH_MS: 10 * 60 * 1000
};

const CATEGORIES = {
  artworks: { folder: 'Artworks', label: 'artwork' },
  photographs: { folder: 'Photographs', label: 'photograph' }
};

// Used only if the site's upload-config.json cannot be read.
const DEFAULT_TYPES = {
  artworks: ['Fine Art', 'Illustration', 'Sketch', 'Painting', 'Digital Art', 'Origami', 'Model'],
  photographs: ['Nature', 'Street', 'Urban', 'Architectural', 'Cityscape', 'Landscape',
    'Animal', 'Space', 'Macro', 'Portrait', 'Vintage']
};

const HEADERS = ['id', 'submittedAt', 'submitterEmail', 'submitterName', 'artist', 'title',
  'category', 'type', 'fileId', 'status', 'comment', 'reviewedBy', 'reviewedAt',
  'galleryIndex', 'commitUrl'];

// ---------------------------------------------------------
// Entry points
// ---------------------------------------------------------

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    switch (body.action) {
      case 'submit': return json(handleSubmit(body));
      case 'mine': return json(handleMine(body));
      case 'withdraw': return json(handleWithdraw(body));
      case 'queue': return json(handleQueue(body));
      case 'decide': return json(handleDecide(body));
      default: return json({ ok: false, error: 'Unknown action.' });
    }
  } catch (err) {
    return json({ ok: false, error: String((err && err.message) || err) });
  }
}

/** Opening the /exec URL in a browser shows this, which is a quick deploy check. */
function doGet() {
  return json({ ok: true, service: 'malang-upload', version: 3 });
}

// ---------------------------------------------------------
// Actions
// ---------------------------------------------------------

function handleSubmit(body) {
  const account = requireMember(body.idToken);

  const category = String(body.category || '');
  if (!CATEGORIES[category]) throw new Error('Choose Artwork or Photograph.');

  const type = cleanText(body.type, 40);
  if (allowedTypes(category).indexOf(type) === -1) throw new Error('Pick a type from the list.');

  const title = cleanText(body.title, CONFIG.MAX_TITLE);
  if (!body.dataBase64) throw new Error('No image received.');

  const bytes = Utilities.base64Decode(String(body.dataBase64));
  if (bytes.length > CONFIG.MAX_IMAGE_BYTES) throw new Error('That image is too large.');

  // Trust the file's own bytes, not the name or the type the browser claimed.
  const mime = sniffImage(bytes);
  if (!mime) throw new Error('That file is not a JPG, PNG or WEBP image.');

  const artist = account.displayName || account.email.split('@')[0];
  const id = 'sub_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  const ext = mime.split('/')[1].replace('jpeg', 'jpg');

  const file = folderById('PENDING_FOLDER_ID').createFile(
    Utilities.newBlob(bytes, mime, id + ' - ' + (title || 'Untitled') + ' - ' + artist + '.' + ext)
  );
  // Link-visible so reviewers' thumbnails load. The id is unguessable.
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  const row = {
    id: id,
    submittedAt: new Date().toISOString(),
    submitterEmail: account.email,
    submitterName: account.displayName || '',
    artist: artist,
    title: title,
    category: category,
    type: type,
    fileId: file.getId(),
    status: 'PENDING'
  };
  sheet().appendRow(HEADERS.map(function (h) { return row[h] === undefined ? '' : row[h]; }));

  return { ok: true, id: id };
}

/** A member's own submissions, newest first, so they can follow review status and notes. */
function handleMine(body) {
  const account = requireMember(body.idToken);

  const items = readRows(sheet())
    .filter(function (r) { return String(r.item.submitterEmail).toLowerCase() === account.email; })
    .map(function (r) { return publicItem(r.item); })
    .filter(function (item) { return item.status !== 'WITHDRAWN'; });

  items.reverse();
  return { ok: true, items: items };
}

/** Lets a member take back a work that is still waiting for review. */
function handleWithdraw(body) {
  const account = requireMember(body.idToken);

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('Busy right now. Try again in a moment.');

  try {
    const sh = sheet();
    const found = readRows(sh).filter(function (r) {
      return r.item.id === body.id && String(r.item.submitterEmail).toLowerCase() === account.email;
    })[0];
    if (!found) throw new Error('Submission not found.');

    const status = effectiveStatus(found.item);
    if (status === 'APPROVED') throw new Error('This work is already live. Ask a reviewer to take it down.');
    if (status !== 'PENDING') throw new Error('Only works still in review can be withdrawn.');

    writeFields(sh, found.rowNumber, { status: 'WITHDRAWN', reviewedAt: new Date().toISOString() });
    try {
      DriveApp.getFileById(found.item.fileId).setTrashed(true); // stays in Drive trash for 30 days
    } catch (err) { /* the row is what matters */ }

    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function handleQueue(body) {
  requireReviewer(body.idToken);

  const items = readRows(sheet())
    .map(function (r) {
      const item = publicItem(r.item);
      item.reviewedBy = r.item.reviewedBy;
      item.reviewedAt = r.item.reviewedAt;
      return item;
    })
    .filter(function (item) { return item.status !== 'WITHDRAWN'; });

  items.reverse(); // newest first
  return { ok: true, items: items };
}

/** The fields a page may see. Never includes the submitter's email. */
function publicItem(row) {
  return {
    id: row.id,
    submittedAt: row.submittedAt,
    artist: row.artist,
    title: row.title,
    category: row.category,
    type: row.type,
    status: effectiveStatus(row),
    comment: row.comment,
    galleryIndex: row.galleryIndex,
    imageUrl: row.fileId ? thumb(row.fileId, 800) : '',
    fullUrl: row.fileId ? thumb(row.fileId, 2000) : ''
  };
}

function handleDecide(body) {
  const account = requireReviewer(body.idToken);
  const decision = body.decision;
  if (decision !== 'APPROVED' && decision !== 'REJECTED') throw new Error('Invalid decision.');

  // One decision at a time, so two reviewers can never publish the same
  // work twice or claim the same gallery number.
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('Another review is being saved. Try again in a moment.');

  try {
    const sh = sheet();
    const found = readRows(sh).filter(function (r) { return r.item.id === body.id; })[0];
    if (!found) throw new Error('Submission not found.');

    const item = found.item;
    const status = effectiveStatus(item);
    if (status === 'WITHDRAWN') throw new Error('The artist withdrew this work.');
    if (status !== 'PENDING') {
      throw new Error('Already ' + status.toLowerCase() + ' by ' + (item.reviewedBy || 'another reviewer') + '.');
    }

    const reviewer = account.displayName || account.email;
    const comment = cleanText(body.comment, 300);
    const set = function (fields) { writeFields(sh, found.rowNumber, fields); };

    if (decision === 'REJECTED') {
      set({ status: 'REJECTED', comment: comment, reviewedBy: reviewer, reviewedAt: new Date().toISOString() });
      return { ok: true };
    }

    set({ status: 'PUBLISHING', reviewedBy: reviewer, reviewedAt: new Date().toISOString() });
    SpreadsheetApp.flush();

    let file;
    let published;
    try {
      file = DriveApp.getFileById(item.fileId);
      published = publishToGallery(item, file.getBlob().getBytes());
    } catch (err) {
      set({ status: 'PENDING', reviewedBy: '', reviewedAt: '' });
      throw new Error('Could not publish to the website. ' + ((err && err.message) || err));
    }

    // Filing in Drive is secondary: if it fails, the work is still live.
    let warning = '';
    try {
      file.moveTo(folderById(CATEGORIES[item.category].folder.toUpperCase() + '_FOLDER_ID'));
      file.setName(published.index + ' - ' + (item.title || 'Untitled') + ' - ' + item.artist + '.webp');
    } catch (err) {
      warning = 'Published, but the Drive file could not be moved: ' + ((err && err.message) || err);
    }

    set({
      status: 'APPROVED',
      comment: comment,
      reviewedBy: reviewer,
      reviewedAt: new Date().toISOString(),
      galleryIndex: published.index,
      commitUrl: published.commitUrl
    });

    return { ok: true, galleryIndex: published.index, commitUrl: published.commitUrl, warning: warning };
  } finally {
    lock.releaseLock();
  }
}

/** A publish that died mid-way (script timeout) should not block the work forever. */
function effectiveStatus(item) {
  const status = item.status || 'PENDING';
  if (status !== 'PUBLISHING') return status;
  const started = Date.parse(item.reviewedAt);
  return isNaN(started) || Date.now() - started > CONFIG.STALE_PUBLISH_MS ? 'PENDING' : status;
}

// ---------------------------------------------------------
// GitHub publishing
// ---------------------------------------------------------

/**
 * Adds resrc/images/<category>/<n>.webp and the matching entry in
 * resrc/data/<category>.json as one commit on main. If someone else
 * pushes in between (the sitemap bot does this after every push), the
 * ref update is rejected and the whole thing is rebuilt on the new head.
 */
function publishToGallery(item, imageBytes) {
  const repo = prop('GITHUB_REPO') || CONFIG.GITHUB_REPO;
  const branch = prop('GITHUB_BRANCH') || CONFIG.GITHUB_BRANCH;
  const jsonPath = 'resrc/data/' + item.category + '.json';
  const imageDir = 'resrc/images/' + item.category;

  const imageSha = gh('post', '/repos/' + repo + '/git/blobs', {
    content: Utilities.base64Encode(imageBytes),
    encoding: 'base64'
  }).sha;

  for (let attempt = 1; attempt <= 4; attempt++) {
    const head = gh('get', '/repos/' + repo + '/git/ref/heads/' + branch).object.sha;
    const baseTree = gh('get', '/repos/' + repo + '/git/commits/' + head).tree.sha;

    const jsonText = ghRaw('/repos/' + repo + '/contents/' + jsonPath + '?ref=' + head);
    const data = JSON.parse(jsonText);
    const listing = gh('get', '/repos/' + repo + '/contents/' + imageDir + '?ref=' + head);

    const index = nextIndex(data, listing);
    const entry = { title: item.title || '', artist: item.artist, type: item.type };
    const newJson = appendEntry(jsonText, data, String(index), entry);

    const jsonSha = gh('post', '/repos/' + repo + '/git/blobs', {
      content: Utilities.base64Encode(newJson, Utilities.Charset.UTF_8),
      encoding: 'base64'
    }).sha;

    const tree = gh('post', '/repos/' + repo + '/git/trees', {
      base_tree: baseTree,
      tree: [
        { path: imageDir + '/' + index + '.webp', mode: '100644', type: 'blob', sha: imageSha },
        { path: jsonPath, mode: '100644', type: 'blob', sha: jsonSha }
      ]
    }).sha;

    const label = CATEGORIES[item.category].label;
    const message = 'Add ' + label + ' #' + index + (item.title ? ' ' + item.title : '') + ' by ' + item.artist;

    const commit = gh('post', '/repos/' + repo + '/git/commits', {
      message: message, tree: tree, parents: [head]
    }).sha;

    const res = ghTry('patch', '/repos/' + repo + '/git/refs/heads/' + branch, { sha: commit, force: false });
    if (res.code >= 200 && res.code < 300) {
      return { index: index, commitUrl: 'https://github.com/' + repo + '/commit/' + commit };
    }
    if (res.code !== 409 && res.code !== 422) throw new Error('GitHub ' + res.code + ': ' + res.message);
    Utilities.sleep(1000 * attempt);
  }
  throw new Error('The site repo kept changing while publishing. Please try again.');
}

/**
 * Adds one entry at the end of the gallery JSON without re-serialising the
 * rest, so the commit diff is just the new lines (the files use mixed CRLF/LF
 * line endings and a full rewrite would touch every line). Falls back to a
 * clean rewrite if the text is not shaped as expected.
 */
function appendEntry(text, data, key, entry) {
  const crlf = (text.match(/\r\n/g) || []).length;
  const lf = (text.match(/\n/g) || []).length - crlf;
  const nl = crlf > lf ? '\r\n' : '\n';

  const wanted = JSON.parse(JSON.stringify(data));
  wanted[key] = entry;

  const lines = JSON.stringify({ [key]: entry }, null, 4).split('\n').slice(1, -1).join(nl);
  const end = text.lastIndexOf('}');
  if (end !== -1) {
    const head = text.slice(0, end).replace(/\s+$/, '');
    const out = head === '{'
      ? '{' + nl + lines + nl + text.slice(end)
      : head + ',' + nl + lines + nl + text.slice(end);
    try {
      if (JSON.stringify(JSON.parse(out)) === JSON.stringify(wanted)) return out;
    } catch (e) { /* fall through */ }
  }
  return JSON.stringify(wanted, null, 4) + nl;
}

/** Next free gallery number: past both the last entry and the last image file. */
function nextIndex(data, listing) {
  let max = -1;
  Object.keys(data).forEach(function (k) {
    if (/^\d+$/.test(k)) max = Math.max(max, Number(k));
  });
  (listing || []).forEach(function (f) {
    const m = /^(\d+)\.webp$/.exec(f.name || '');
    if (m) max = Math.max(max, Number(m[1]));
  });
  return max + 1;
}

function ghRequest(method, path, body, accept) {
  const token = prop('GITHUB_TOKEN');
  if (!token) throw new Error('GITHUB_TOKEN is not set in Script Properties.');
  const options = {
    method: method,
    muteHttpExceptions: true,
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: accept || 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  };
  if (body) {
    options.contentType = 'application/json';
    options.payload = JSON.stringify(body);
  }
  const res = UrlFetchApp.fetch('https://api.github.com' + path, options);
  const text = res.getContentText('UTF-8');
  let message = '';
  if (res.getResponseCode() >= 300) {
    try { message = JSON.parse(text).message; } catch (e) { message = text.slice(0, 200); }
  }
  return { code: res.getResponseCode(), text: text, message: message };
}

function ghTry(method, path, body) {
  return ghRequest(method, path, body);
}

function gh(method, path, body) {
  const res = ghRequest(method, path, body);
  if (res.code >= 300) throw new Error('GitHub ' + res.code + ': ' + res.message);
  return JSON.parse(res.text);
}

function ghRaw(path) {
  const res = ghRequest('get', path, null, 'application/vnd.github.raw');
  if (res.code >= 300) throw new Error('GitHub ' + res.code + ': ' + res.message);
  return res.text;
}

// ---------------------------------------------------------
// Auth
// ---------------------------------------------------------

/** Verifies the Firebase ID token and returns the real account behind it. */
function verifyToken(idToken) {
  if (!idToken) throw new Error('Not signed in.');

  const res = UrlFetchApp.fetch(
    'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + prop('FIREBASE_API_KEY'),
    {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ idToken: String(idToken) }),
      muteHttpExceptions: true
    }
  );
  if (res.getResponseCode() !== 200) throw new Error('Session expired. Please sign in again.');

  const users = JSON.parse(res.getContentText()).users || [];
  const account = users[0];
  if (!account || !account.email) throw new Error('No email on this account.');

  const fromProvider = (account.providerUserInfo || [])
    .map(function (p) { return p.displayName; })
    .filter(Boolean)[0];

  // The gallery builds its artist filter buttons as HTML, so a name must
  // not be able to carry quotes or markup into the page.
  return {
    email: String(account.email).trim().toLowerCase(),
    displayName: cleanText(account.displayName || fromProvider || '', 60).replace(/["'`&\\]/g, '').trim()
  };
}

function requireMember(idToken) {
  const account = verifyToken(idToken);
  if (emailList(CONFIG.SITE + '/resrc/data/member-emails.json').indexOf(account.email) === -1) {
    throw new Error('Only Malang members can upload work.');
  }
  return account;
}

function requireReviewer(idToken) {
  const account = verifyToken(idToken);
  if (emailList(CONFIG.SITE + '/resrc/data/reviewers.json').indexOf(account.email) === -1) {
    throw new Error('Reviewer access required.');
  }
  return account;
}

/** Roster lists live on the site, so access follows the repo with no redeploy here. */
function emailList(url) {
  return cachedJson(url).map(function (e) { return String(e).trim().toLowerCase(); });
}

function allowedTypes(category) {
  try {
    const cfg = cachedJson(CONFIG.SITE + '/resrc/data/upload-config.json');
    const cat = (cfg.categories || []).filter(function (c) { return c.value === category; })[0];
    if (cat && cat.types && cat.types.length) return cat.types;
  } catch (e) { /* fall back below */ }
  return DEFAULT_TYPES[category] || [];
}

function cachedJson(url) {
  const cache = CacheService.getScriptCache();
  const hit = cache.get(url);
  if (hit) return JSON.parse(hit);

  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('Could not load ' + url);
  const text = res.getContentText('UTF-8');
  const parsed = JSON.parse(text);
  cache.put(url, text, 300);
  return parsed;
}

// ---------------------------------------------------------
// One-time setup: run this from the editor (Run > setup)
// ---------------------------------------------------------

function setup() {
  const props = PropertiesService.getScriptProperties();
  const websiteId = props.getProperty('WEBSITE_FOLDER_ID');
  if (!websiteId) throw new Error('Add WEBSITE_FOLDER_ID in Project Settings > Script Properties first.');

  const website = DriveApp.getFolderById(websiteId);
  const ids = {
    ARTWORKS_FOLDER_ID: findOrCreateFolder(website, CATEGORIES.artworks.folder).getId(),
    PHOTOGRAPHS_FOLDER_ID: findOrCreateFolder(website, CATEGORIES.photographs.folder).getId(),
    PENDING_FOLDER_ID: findOrCreateFolder(website, CONFIG.PENDING_FOLDER_NAME).getId()
  };

  let sheetId = props.getProperty('SHEET_ID');
  if (!sheetId) {
    const ss = SpreadsheetApp.create(CONFIG.SHEET_FILE_NAME);
    DriveApp.getFileById(ss.getId()).moveTo(website);
    sheetId = ss.getId();
  }
  ids.SHEET_ID = sheetId;
  props.setProperties(ids);
  sheet(); // creates the tab and header row if missing

  const report = ['Folders and sheet are ready inside "' + website.getName() + '".'];
  report.push(props.getProperty('FIREBASE_API_KEY') ? 'OK  FIREBASE_API_KEY is set.' : 'MISSING  FIREBASE_API_KEY');

  if (!props.getProperty('GITHUB_TOKEN')) {
    report.push('MISSING  GITHUB_TOKEN');
  } else {
    try {
      const r = gh('get', '/repos/' + (prop('GITHUB_REPO') || CONFIG.GITHUB_REPO));
      report.push('OK  GitHub token can see ' + r.full_name + '.');
    } catch (err) {
      report.push('PROBLEM  GitHub token: ' + err.message);
    }
  }
  Logger.log(report.join('\n'));
  return report.join('\n');
}

function findOrCreateFolder(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

// ---------------------------------------------------------
// Sheet + Drive helpers
// ---------------------------------------------------------

function sheet() {
  const ss = SpreadsheetApp.openById(prop('SHEET_ID'));
  let sh = ss.getSheetByName(CONFIG.SHEET_TAB);
  if (!sh) sh = ss.insertSheet(CONFIG.SHEET_TAB);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
  }
  return sh;
}

function readRows(sh) {
  const values = sh.getDataRange().getValues();
  const header = values.shift() || [];
  return values.map(function (row, i) {
    const item = {};
    header.forEach(function (key, c) { item[key] = row[c]; });
    return { rowNumber: i + 2, item: item };
  });
}

function writeFields(sh, rowNumber, fields) {
  const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  Object.keys(fields).forEach(function (key) {
    const c = header.indexOf(key);
    if (c !== -1) sh.getRange(rowNumber, c + 1).setValue(fields[key]);
  });
}

function folderById(propName) {
  const id = prop(propName);
  if (!id) throw new Error(propName + ' is missing. Run setup() once from the script editor.');
  return DriveApp.getFolderById(id);
}

function thumb(fileId, width) {
  return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(fileId) + '&sz=w' + width;
}

/** Reads the first bytes of the file to tell real images from renamed files. */
function sniffImage(bytes) {
  const b = function (i) { return bytes[i] & 0xff; };
  if (bytes.length < 12) return '';
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return 'image/jpeg';
  if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47) return 'image/png';
  if (b(0) === 0x52 && b(1) === 0x49 && b(2) === 0x46 && b(3) === 0x46 &&
    b(8) === 0x57 && b(9) === 0x45 && b(10) === 0x42 && b(11) === 0x50) return 'image/webp';
  return '';
}

function cleanText(value, max) {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function prop(name) {
  return PropertiesService.getScriptProperties().getProperty(name);
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
