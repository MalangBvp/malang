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
 *
 * Who is a member or reviewer is kept private, in the Members and
 * Reviewers tabs of the submissions sheet. Pages ask "whoami" and
 * only ever learn about the person who is signed in.
 */

const CONFIG = {
  SITE: 'https://malangbvp.in',
  GITHUB_REPO: 'MalangBvp/malang',
  GITHUB_BRANCH: 'main',
  SHEET_FILE_NAME: 'Malang Upload Submissions',
  SHEET_TAB: 'Submissions',
  MEMBERS_TAB: 'Members',
  REVIEWERS_TAB: 'Reviewers',
  UPLOADERS_TAB: 'Uploaders', // upload-only access (e.g. new recruits); no member-only pages
  ROSTER_CACHE_SEC: 60, // a change to Members or Reviewers works within this many seconds
  PENDING_FOLDER_NAME: 'Pending Uploads',
  MAX_IMAGE_BYTES: 15 * 1024 * 1024,
  MAX_TITLE: 120,
  STALE_PUBLISH_MS: 10 * 60 * 1000,

  // Images: the page shrinks to 2400px, so anything far outside this range
  // did not come from the page (tiny icons, or huge "decompression bombs").
  MIN_EDGE_PX: 200,
  MAX_EDGE_PX: 4000,

  // Limits, per member unless noted. Tune here; no other change needed.
  LIMIT_UPLOADS_PER_HOUR: 15,
  LIMIT_UPLOADS_PER_DAY: 40,
  LIMIT_PENDING: 25,
  LIMIT_ALL_UPLOADS_PER_DAY: 400, // whole club, protects Drive space
  LIMIT_REQUESTS_PER_10_MIN: 150,
  LIMIT_FAILED_SIGNINS_PER_MIN: 40, // everyone together

  // A reviewer approving their own work skips review, so it is off.
  ALLOW_SELF_APPROVAL: false,

  LOG_TAB: 'Log',
  LOG_MAX_ROWS: 5000
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

// New columns go at the end; sheet() adds any that an older sheet is missing.
const HEADERS = ['id', 'submittedAt', 'submitterEmail', 'submitterName', 'artist', 'title',
  'category', 'type', 'fileId', 'status', 'comment', 'reviewedBy', 'reviewedAt',
  'galleryIndex', 'commitUrl', 'hash'];

const LOG_HEADERS = ['time', 'email', 'action', 'id', 'result'];

// Members and Reviewers tabs: one Gmail per row in column A. Column B is a
// note for people (a name, the year); the script never reads it.
const ROSTER_HEADERS = ['email', 'name'];
const EMAIL_RE = /^[a-z0-9_][a-z0-9._%+-]*@[a-z0-9-]+(\.[a-z0-9-]+)+$/; // checked after lower-casing

// Who is making this request, once their token is verified (for the log).
let currentEmail = '';

// ---------------------------------------------------------
// Entry points
// ---------------------------------------------------------

function doPost(e) {
  let action = '';
  let id = '';
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    action = String(body.action || '');
    id = String(body.id || '');
    switch (action) {
      case 'whoami': return json(handleWhoami(body));
      case 'submit': return json(handleSubmit(body));
      case 'mine': return json(handleMine(body));
      case 'withdraw': return json(handleWithdraw(body));
      case 'queue': return json(handleQueue(body));
      case 'decide': return json(handleDecide(body));
      default: return json({ ok: false, error: 'Unknown action.' });
    }
  } catch (err) {
    const message = String((err && err.message) || err);
    logEvent(action || 'request', id, (err && err.code ? err.code + ': ' : 'error: ') + message);
    const out = { ok: false, error: message };
    if (err && err.code) out.code = err.code;
    if (err && err.retryAfter) out.retryAfter = err.retryAfter;
    return json(out);
  }
}

/** Opening the /exec URL in a browser shows this, which is a quick deploy check. */
function doGet() {
  return json({ ok: true, service: 'malang-upload', version: 6 });
}

/** An error meant for the person using the page, optionally with a code the page acts on. */
function userError(message, code, retryAfter) {
  const err = new Error(message);
  if (code) err.code = code;
  if (retryAfter) err.retryAfter = retryAfter;
  return err;
}

// ---------------------------------------------------------
// Actions
// ---------------------------------------------------------

/** What the signed-in person may do. Says nothing about anyone else. */
function handleWhoami(body) {
  const account = verifyToken(body.idToken);
  return {
    ok: true,
    member: isOnRoster(CONFIG.MEMBERS_TAB, account.email),
    reviewer: isOnRoster(CONFIG.REVIEWERS_TAB, account.email),
    uploader: canUpload(account.email),
    displayName: account.displayName
  };
}

function handleSubmit(body) {
  const account = requireUploader(body.idToken);

  const category = String(body.category || '');
  if (!CATEGORIES[category]) throw new Error('Choose Artwork or Photograph.');

  const type = cleanText(body.type, 40);
  if (allowedTypes(category).indexOf(type) === -1) throw new Error('Pick a type from the list.');

  const title = cleanText(body.title, CONFIG.MAX_TITLE);
  if (!body.dataBase64) throw new Error('No image received.');

  // Refuse oversize data before spending time decoding it.
  const encoded = String(body.dataBase64);
  if (encoded.length > Math.ceil(CONFIG.MAX_IMAGE_BYTES / 3) * 4 + 4) throw new Error('That image is too large.');
  const bytes = Utilities.base64Decode(encoded);
  if (bytes.length > CONFIG.MAX_IMAGE_BYTES) throw new Error('That image is too large.');

  // Trust the file's own bytes, not the name or the type the browser claimed.
  const mime = sniffImage(bytes);
  if (!mime) throw new Error('That file is not a JPG, PNG or WEBP image.');

  const size = imageSize(bytes, mime);
  if (!size) throw new Error('Could not read the size of that image. Try saving it again as JPG.');
  const shortEdge = Math.min(size.width, size.height);
  const longEdge = Math.max(size.width, size.height);
  if (shortEdge < CONFIG.MIN_EDGE_PX) {
    throw new Error('That image is too small (' + size.width + '×' + size.height + '). Upload one at least ' +
      CONFIG.MIN_EDGE_PX + 'px on each side.');
  }
  if (longEdge > CONFIG.MAX_EDGE_PX) throw new Error('That image is too large (' + size.width + '×' + size.height + ').');

  const sh = sheet();
  const rows = readRows(sh).map(function (r) { return r.item; });
  checkUploadLimits(account.email, rows);

  const hash = sha256Hex(bytes);
  const twin = rows.filter(function (r) {
    return r.hash === hash && ['PENDING', 'PUBLISHING', 'APPROVED'].indexOf(effectiveStatus(r)) !== -1;
  })[0];
  if (twin) {
    const mine = String(twin.submitterEmail).toLowerCase() === account.email;
    const where = effectiveStatus(twin) === 'APPROVED' ? 'already in the gallery' : 'already waiting for review';
    throw userError(mine ? 'You uploaded this image before; it is ' + where + '.' : 'This image is ' + where + '.', 'DUPLICATE');
  }

  const artist = account.displayName || account.email.split('@')[0];
  const id = 'sub_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  const ext = mime.split('/')[1].replace('jpeg', 'jpg');

  const file = folderById('PENDING_FOLDER_ID').createFile(
    Utilities.newBlob(bytes, mime, id + ' - ' + (title || 'Untitled') + ' - ' + artist + '.' + ext)
  );
  // Link-visible so reviewers' thumbnails load. The id is unguessable.
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  appendObject(sh, {
    id: id,
    submittedAt: new Date().toISOString(),
    submitterEmail: account.email,
    submitterName: account.displayName || '',
    artist: artist,
    title: title,
    category: category,
    type: type,
    fileId: file.getId(),
    status: 'PENDING',
    hash: hash
  });

  return { ok: true, id: id };
}

/** Hourly burst limit (cache), plus daily, pending and club-wide limits counted from the sheet. */
function checkUploadLimits(email, rows) {
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recent = function (r) { return new Date(r.submittedAt).getTime() > dayAgo; };
  const own = rows.filter(function (r) { return String(r.submitterEmail).toLowerCase() === email; });

  if (rows.filter(recent).length >= CONFIG.LIMIT_ALL_UPLOADS_PER_DAY) {
    throw userError('The club has reached today\'s upload limit. Please try again tomorrow.', 'RATE_LIMIT', 3600);
  }
  if (own.filter(recent).length >= CONFIG.LIMIT_UPLOADS_PER_DAY) {
    throw userError('You have reached today\'s limit of ' + CONFIG.LIMIT_UPLOADS_PER_DAY +
      ' uploads. Please try again tomorrow.', 'RATE_LIMIT', 3600);
  }
  const pending = own.filter(function (r) { return effectiveStatus(r) === 'PENDING'; }).length;
  if (pending >= CONFIG.LIMIT_PENDING) {
    throw userError('You already have ' + pending + ' works waiting for review. Please wait for some to be reviewed.',
      'RATE_LIMIT', 3600);
  }
  rateLimit('up:' + email, CONFIG.LIMIT_UPLOADS_PER_HOUR, 3600, 'You have uploaded a lot in the last hour.');
}

/** A member's own submissions, newest first, so they can follow review status and notes. */
function handleMine(body) {
  const account = requireUploader(body.idToken);

  const items = readRows(sheet())
    .filter(function (r) { return String(r.item.submitterEmail).toLowerCase() === account.email; })
    .map(function (r) { return publicItem(r.item); })
    .filter(function (item) { return item.status !== 'WITHDRAWN'; });

  items.reverse();
  return { ok: true, items: items };
}

/** Lets a member take back a work that is still waiting for review. */
function handleWithdraw(body) {
  const account = requireUploader(body.idToken);

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

    logEvent('withdraw', body.id, 'withdrawn');
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

    if (decision === 'APPROVED' && !CONFIG.ALLOW_SELF_APPROVAL &&
      String(item.submitterEmail).toLowerCase() === account.email) {
      throw userError('You can\'t approve your own work. Ask another reviewer.', 'SELF_APPROVAL');
    }

    const reviewer = account.displayName || account.email;
    const comment = cleanText(body.comment, 300);
    const set = function (fields) { writeFields(sh, found.rowNumber, fields); };

    if (decision === 'REJECTED') {
      set({ status: 'REJECTED', comment: comment, reviewedBy: reviewer, reviewedAt: new Date().toISOString() });
      logEvent('decide', body.id, 'REJECTED');
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

    logEvent('decide', body.id, 'APPROVED as #' + published.index + (warning ? ' · ' + warning : ''));
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

/**
 * Verifies the Firebase ID token and returns the real account behind it.
 * A verified token is remembered for 5 minutes (by its hash), so a batch
 * of uploads costs one lookup, not ten. Lots of bad tokens in a short time
 * means someone is hammering the service, so lookups pause for a minute.
 */
function verifyToken(idToken) {
  if (!idToken) throw userError('Not signed in.', 'AUTH');

  const cache = CacheService.getScriptCache();
  const key = 'tok:' + sha256Hex(String(idToken));
  const hit = cache.get(key);
  let account = hit ? JSON.parse(hit) : null;

  if (!account) {
    const failKey = 'authfail:' + Math.floor(Date.now() / 60000);
    if (Number(cache.get(failKey) || 0) >= CONFIG.LIMIT_FAILED_SIGNINS_PER_MIN) {
      throw userError('Too many sign-in attempts right now. Try again in a minute.', 'RATE_LIMIT', 60);
    }

    const res = UrlFetchApp.fetch(
      'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + prop('FIREBASE_API_KEY'),
      {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({ idToken: String(idToken) }),
        muteHttpExceptions: true
      }
    );
    if (res.getResponseCode() !== 200) {
      cache.put(failKey, String(Number(cache.get(failKey) || 0) + 1), 120);
      throw userError('Session expired. Please sign in again.', 'AUTH');
    }

    const user = (JSON.parse(res.getContentText()).users || [])[0];
    if (!user || !user.email) throw userError('No email on this account.', 'AUTH');

    const fromProvider = (user.providerUserInfo || [])
      .map(function (p) { return p.displayName; })
      .filter(Boolean)[0];

    // The gallery builds its artist filter buttons as HTML, so a name must
    // not be able to carry quotes or markup into the page.
    account = {
      email: String(user.email).trim().toLowerCase(),
      displayName: cleanText(user.displayName || fromProvider || '', 60).replace(/["'`&\\]/g, '').trim()
    };
    cache.put(key, JSON.stringify(account), 300);
  }

  currentEmail = account.email;
  rateLimit('req:' + account.email, CONFIG.LIMIT_REQUESTS_PER_10_MIN, 600, 'Too many requests.');
  return account;
}

/**
 * Fixed-window counter in the script cache. Approximate under heavy
 * parallel use, which is fine for keeping one person from flooding it.
 */
function rateLimit(name, limit, windowSec, message) {
  const cache = CacheService.getScriptCache();
  const now = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(now / windowSec);
  const key = 'rl:' + sha256Hex(name).slice(0, 24) + ':' + windowSec + ':' + bucket;
  const count = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(count), Math.min(windowSec + 60, 21600));
  if (count > limit) {
    const wait = (bucket + 1) * windowSec - now;
    throw userError(message + ' Try again in ' + humanWait(wait) + '.', 'RATE_LIMIT', wait);
  }
}

function humanWait(seconds) {
  if (seconds < 90) return 'a minute';
  const minutes = Math.ceil(seconds / 60);
  return minutes < 60 ? minutes + ' minutes' : 'about ' + Math.ceil(minutes / 60) + ' hour' + (minutes > 60 ? 's' : '');
}

function requireMember(idToken) {
  const account = verifyToken(idToken);
  if (!isOnRoster(CONFIG.MEMBERS_TAB, account.email)) {
    throw userError('Only Malang members can upload work.', 'FORBIDDEN');
  }
  return account;
}

/** Members, plus the upload-only Uploaders list. */
function requireUploader(idToken) {
  const account = verifyToken(idToken);
  if (!canUpload(account.email)) {
    throw userError('Only Malang members can upload work.', 'FORBIDDEN');
  }
  return account;
}

function canUpload(email) {
  return isOnRoster(CONFIG.MEMBERS_TAB, email) || isOnRoster(CONFIG.UPLOADERS_TAB, email);
}

function requireReviewer(idToken) {
  const account = verifyToken(idToken);
  if (!isOnRoster(CONFIG.REVIEWERS_TAB, account.email)) {
    throw userError('Reviewer access required.', 'FORBIDDEN');
  }
  return account;
}

function isOnRoster(tab, email) {
  return rosterEmails(tab).indexOf(String(email).trim().toLowerCase()) !== -1;
}

/**
 * The emails in the Members or Reviewers tab, lower-cased. Kept for a minute
 * in the script cache so busy pages do not open the sheet on every request.
 */
function rosterEmails(tab) {
  const cache = CacheService.getScriptCache();
  const key = 'roster:' + tab;
  const hit = cache.get(key);
  if (hit) return JSON.parse(hit);

  const sh = spreadsheet().getSheetByName(tab);
  if (!sh && tab === CONFIG.UPLOADERS_TAB) return []; // optional list; setup() creates it
  if (!sh) throw new Error('The "' + tab + '" tab is missing from the sheet. Run setup() once from the script editor.');
  const last = sh.getLastRow();
  const emails = last < 2 ? [] : sh.getRange(2, 1, last - 1, 1).getDisplayValues()
    .map(function (row) { return String(row[0]).trim().toLowerCase(); })
    .filter(function (e) { return EMAIL_RE.test(e); });

  cache.put(key, JSON.stringify(emails), CONFIG.ROSTER_CACHE_SEC);
  return emails;
}

/** The Members or Reviewers tab, created with its header row if missing. */
function rosterSheet(tab) {
  const ss = spreadsheet();
  let sh = ss.getSheetByName(tab);
  if (!sh) sh = ss.insertSheet(tab);
  if (sh.getLastRow() === 0) {
    sh.appendRow(ROSTER_HEADERS);
    sh.setFrozenRows(1);
    sh.getRange('A:A').setNumberFormat('@'); // plain text, so an email is never read as a formula
  }
  return sh;
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
  [CONFIG.MEMBERS_TAB, CONFIG.REVIEWERS_TAB, CONFIG.UPLOADERS_TAB].forEach(function (tab) {
    rosterSheet(tab);
    CacheService.getScriptCache().remove('roster:' + tab);
    const count = rosterEmails(tab).length;
    report.push((count ? 'OK  ' : 'EMPTY  ') + tab + ' tab has ' + count + ' email' + (count === 1 ? '' : 's') + '.');
  });
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

/**
 * One time only, when moving to the private lists: copies the old public
 * member-emails.json and reviewers.json from the live site into the
 * Members and Reviewers tabs. Run it BEFORE the site update that deletes
 * those files goes live. Emails already in a tab are skipped, so running
 * it twice is harmless. Once the files are gone it only says so.
 */
function importOldListsFromSite() {
  const jobs = [[CONFIG.MEMBERS_TAB, 'member-emails.json'], [CONFIG.REVIEWERS_TAB, 'reviewers.json']];
  const cache = CacheService.getScriptCache();
  const report = jobs.map(function (job) {
    const tab = job[0];
    let list = null;
    try {
      const res = UrlFetchApp.fetch(CONFIG.SITE + '/resrc/data/' + job[1], { muteHttpExceptions: true });
      if (res.getResponseCode() === 200) list = JSON.parse(res.getContentText('UTF-8'));
    } catch (e) { /* handled below */ }
    if (!Array.isArray(list)) {
      return 'SKIPPED  ' + job[1] + ' is no longer on the site. Add emails to the ' + tab + ' tab by hand.';
    }

    const sh = rosterSheet(tab);
    cache.remove('roster:' + tab);
    const have = rosterEmails(tab);
    const add = [];
    list.forEach(function (e) {
      const email = String(e).trim().toLowerCase();
      if (EMAIL_RE.test(email) && have.indexOf(email) === -1 && add.indexOf(email) === -1) add.push(email);
    });
    if (add.length) {
      sh.getRange(sh.getLastRow() + 1, 1, add.length, 1).setNumberFormat('@')
        .setValues(add.map(function (e) { return [e]; }));
    }
    cache.remove('roster:' + tab);
    return 'OK  ' + tab + ': added ' + add.length + ', ' + rosterEmails(tab).length + ' in total.';
  });
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

let openSpreadsheet = null;

function spreadsheet() {
  if (!openSpreadsheet) openSpreadsheet = SpreadsheetApp.openById(prop('SHEET_ID'));
  return openSpreadsheet;
}

function sheet() {
  const ss = spreadsheet();
  let sh = ss.getSheetByName(CONFIG.SHEET_TAB);
  if (!sh) sh = ss.insertSheet(CONFIG.SHEET_TAB);
  ensureHeaders(sh, HEADERS);
  return sh;
}

/** Writes the header row on a new tab, and adds any newer columns an older sheet lacks. */
function ensureHeaders(sh, headers) {
  if (sh.getLastRow() === 0) {
    sh.appendRow(headers);
    sh.setFrozenRows(1);
    return;
  }
  const have = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  let col = have.length;
  headers.forEach(function (h) {
    if (have.indexOf(h) === -1) sh.getRange(1, ++col).setValue(h);
  });
}

/** Appends a row by column name, so it lands right whatever order the sheet's columns are in. */
function appendObject(sh, obj) {
  const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  sh.appendRow(header.map(function (h) { return obj[h] === undefined ? '' : obj[h]; }));
}

/** Errors, decisions and withdrawals go to a Log tab for debugging. Never breaks a request. */
function logEvent(action, id, result) {
  try {
    if (!prop('SHEET_ID')) return;
    const ss = spreadsheet();
    let sh = ss.getSheetByName(CONFIG.LOG_TAB);
    if (!sh) sh = ss.insertSheet(CONFIG.LOG_TAB);
    ensureHeaders(sh, LOG_HEADERS);
    sh.appendRow([new Date().toISOString(), currentEmail, cleanText(action, 30), cleanText(id, 60),
      cleanText(result, 300)]);
    const extra = sh.getLastRow() - 1 - CONFIG.LOG_MAX_ROWS;
    if (extra > 0) sh.deleteRows(2, extra);
  } catch (err) { /* logging is best effort */ }
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

/**
 * Width and height from the file header, without decoding the image.
 * Covers what browsers produce: PNG, baseline/progressive JPEG, and
 * WEBP in its three forms (lossy VP8, lossless VP8L, extended VP8X).
 */
function imageSize(bytes, mime) {
  const b = function (i) { return bytes[i] & 0xff; };
  const u16be = function (i) { return (b(i) << 8) | b(i + 1); };
  const u32be = function (i) { return b(i) * 16777216 + ((b(i + 1) << 16) | (b(i + 2) << 8) | b(i + 3)); };
  const u16le = function (i) { return b(i) | (b(i + 1) << 8); };
  const u24le = function (i) { return b(i) | (b(i + 1) << 8) | (b(i + 2) << 16); };
  const tag = function (i) { return String.fromCharCode(b(i), b(i + 1), b(i + 2), b(i + 3)); };

  if (mime === 'image/png') {
    if (bytes.length < 24 || tag(12) !== 'IHDR') return null;
    return { width: u32be(16), height: u32be(20) };
  }

  if (mime === 'image/webp') {
    if (bytes.length < 30) return null;
    const chunk = tag(12);
    if (chunk === 'VP8 ') {
      if (b(23) !== 0x9d || b(24) !== 0x01 || b(25) !== 0x2a) return null;
      return { width: u16le(26) & 0x3fff, height: u16le(28) & 0x3fff };
    }
    if (chunk === 'VP8L') {
      if (b(20) !== 0x2f) return null;
      const bits = b(21) | (b(22) << 8) | (b(23) << 16) | ((b(24) & 0x0f) << 24);
      return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
    }
    if (chunk === 'VP8X') return { width: u24le(24) + 1, height: u24le(27) + 1 };
    return null;
  }

  if (mime === 'image/jpeg') {
    let i = 2;
    while (i + 9 < bytes.length) {
      if (b(i) !== 0xff) { i++; continue; }
      const marker = b(i + 1);
      if (marker === 0xff) { i++; continue; }
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) { i += 2; continue; }
      if (marker === 0xd9 || marker === 0xda) return null; // reached the image data without a size
      // Start-of-frame markers carry the size (C4, C8 and CC are not frames).
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { width: u16be(i + 7), height: u16be(i + 5) };
      }
      i += 2 + u16be(i + 2);
    }
    return null;
  }
  return null;
}

function sha256Hex(data) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, data)
    .map(function (x) { return ('0' + (x & 0xff).toString(16)).slice(-2); })
    .join('');
}

function cleanText(value, max) {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[=+\-@]+\s*/, '') // a leading = + - @ would run as a formula in the sheet
    .slice(0, max);
}

function prop(name) {
  return PropertiesService.getScriptProperties().getProperty(name);
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
