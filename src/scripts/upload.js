/* =========================================================
   Malang | Upload Your Work
   ---------------------------------------------------------
   Members pick Artwork or Photograph, drop one or more images,
   give each a type (and an optional title) and submit. Each
   image goes to the Malang upload service (a Google Apps Script
   web app, see documentation/upload-backend.gs) which files it
   in Drive and logs it for review. Reviewers approve from the
   Review tab; approving publishes it to the gallery.

   The service URL lives in /resrc/data/upload-config.json. If
   it is empty the page keeps submissions on this device only
   and says so plainly, rather than pretending they were sent.
   ========================================================= */

const MalangUpload = (() => {
    const CONFIG_URL = "/resrc/data/upload-config.json";
    const MEMBERS_URL = "/resrc/data/member-emails.json";
    const REVIEWERS_URL = "/resrc/data/reviewers.json";
    const LOCAL_KEY = "malang_artwork_submissions";

    const DEFAULTS = {
        endpoint: "",
        maxFileMb: 15,
        maxEdgePx: 2400,
        webpQuality: 0.9,
        maxFilesPerBatch: 10,
        categories: [
            {
                value: "artworks",
                label: "Artwork",
                types: ["Fine Art", "Illustration", "Sketch", "Painting", "Digital Art", "Origami", "Model"]
            },
            {
                value: "photographs",
                label: "Photograph",
                types: ["Nature", "Street", "Urban", "Architectural", "Cityscape", "Landscape", "Animal",
                    "Space", "Macro", "Portrait", "Vintage"]
            }
        ]
    };

    let config = { ...DEFAULTS };
    let members = [];
    let reviewers = [];
    let user = null;
    let signOutFn = null;
    let items = [];
    let statusFilter = "PENDING";
    let categoryFilter = "all";
    let authResolved = false;

    // Gmail is case-insensitive; a capitalised address must not lock a member out.
    const norm = (email) => String(email || "").trim().toLowerCase();

    async function loadJson(url, fallback) {
        try {
            const res = await fetch(url, { cache: "no-store" });
            if (!res.ok) throw new Error(res.status);
            return await res.json();
        } catch {
            return fallback;
        }
    }

    async function boot() {
        const [cfg, mem, rev] = await Promise.all([
            loadJson(CONFIG_URL, DEFAULTS),
            loadJson(MEMBERS_URL, []),
            loadJson(REVIEWERS_URL, [])
        ]);

        config = { ...DEFAULTS, ...(cfg || {}) };
        members = (mem || []).map(norm).filter(Boolean);
        reviewers = (rev || []).map(norm).filter(Boolean);

        renderKindSwitch();
        const sub = document.getElementById("dropSub");
        if (sub) {
            sub.textContent = `JPG, PNG or WEBP · Max ${config.maxFileMb} MB · Up to ${config.maxFilesPerBatch} at once`;
        }

        const notice = document.getElementById("offlineNotice");
        if (notice) notice.style.display = config.endpoint ? "none" : "flex";
    }

    const isMember = (email) => members.includes(norm(email));
    const isReviewer = (email) => reviewers.includes(norm(email));

    function setUser(nextUser, onSignOut) {
        authResolved = true;
        user = nextUser && isMember(nextUser.email) ? nextUser : null;
        if (onSignOut) signOutFn = onSignOut;

        const loader = document.getElementById("loader");
        if (loader) loader.style.display = "none";

        const gate = document.getElementById("authGate");
        const app = document.getElementById("uploadApp");

        if (!user) {
            if (gate) gate.style.display = "block";
            if (app) app.style.display = "none";
            items = [];
            return;
        }

        if (gate) gate.style.display = "none";
        if (app) app.style.display = "block";

        const avatar = document.getElementById("userAvatar");
        const name = document.getElementById("userName");
        const badge = document.getElementById("roleBadge");
        const reviewTab = document.getElementById("reviewTabBtn");
        const credit = document.getElementById("creditName");
        const reviewer = isReviewer(user.email);

        if (avatar) avatar.src = user.photoURL || "/resrc/images/icons/user.png";
        if (name) name.textContent = user.displayName || "Malang Member";
        if (credit) credit.textContent = user.displayName || "your account name";
        if (badge) {
            badge.textContent = reviewer ? "Reviewer" : "Member";
            badge.classList.toggle("member", !reviewer);
        }
        if (reviewTab) reviewTab.style.display = reviewer ? "block" : "none";

        if (reviewer) refreshQueue();

        // Deep link from the account page: /upload.html?view=review
        const params = new URLSearchParams(window.location.search);
        if (reviewer && params.get("view") === "review") switchTab("review");
    }

    // ---------------------------------------------------------------
    // Transport
    // ---------------------------------------------------------------
    // Apps Script has no OPTIONS handler, so a JSON content-type would
    // trigger a CORS preflight it cannot answer. text/plain keeps this a
    // simple request and still lets us read the response body back.
    // Everything is POST so the sign-in token never ends up in a URL.
    async function post(payload) {
        let res;
        try {
            res = await fetch(config.endpoint, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(payload)
            });
        } catch {
            throw new Error("Could not reach the upload service. Check your connection and try again.");
        }
        let data;
        try {
            data = await res.json();
        } catch {
            throw new Error("The upload service sent back something unexpected. Please try again.");
        }
        if (!data.ok) throw new Error(data.error || "Request failed.");
        return data;
    }

    const token = () => (user ? user.getIdToken() : Promise.resolve(""));

    // ---------------------------------------------------------------
    // Local fallback (device-only, used until the endpoint is set)
    // ---------------------------------------------------------------
    function readLocal() {
        try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || []; } catch { return []; }
    }
    function writeLocal(list) {
        try {
            localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
        } catch {
            throw new Error("This device has no room left to keep the image. The upload service is not connected yet.");
        }
    }

    // ---------------------------------------------------------------
    // Submissions
    // ---------------------------------------------------------------
    async function submit(record) {
        if (!config.endpoint) {
            const list = readLocal();
            list.unshift({
                ...record,
                artist: (user && user.displayName) || "Malang Member",
                id: "local_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
                submittedAt: new Date().toISOString(),
                status: "PENDING",
                local: true
            });
            writeLocal(list);
            return { local: true };
        }

        const data = await post({ action: "submit", idToken: await token(), ...record });
        return { local: false, id: data.id };
    }

    async function fetchQueue() {
        if (!config.endpoint) return readLocal();
        const data = await post({ action: "queue", idToken: await token() });
        return data.items || [];
    }

    async function decide(id, decision, comment) {
        if (!config.endpoint) {
            const list = readLocal();
            const i = list.findIndex((s) => s.id === id);
            if (i !== -1) {
                list[i].status = decision;
                list[i].comment = comment;
                list[i].reviewedBy = (user && user.displayName) || "Reviewer";
                list[i].reviewedAt = new Date().toISOString();
                writeLocal(list);
            }
            return { local: true };
        }
        return post({ action: "decide", idToken: await token(), id, decision, comment });
    }

    // Boot as soon as the DOM is up. If the Firebase module fails to load
    // (blocked CDN, offline), the sign-in gate still appears instead of the
    // loader spinning forever.
    let ready = null;
    function start() {
        if (!ready) {
            ready = boot().then(() => {
                setTimeout(() => {
                    if (!authResolved) setUser(null);
                }, 1500);
            });
        }
        return ready;
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }

    return {
        boot: start, setUser, isMember, isReviewer, submit, fetchQueue, decide,
        get ready() { return start(); },
        get config() { return config; },
        get user() { return user; },
        get items() { return items; },
        set items(v) { items = v; },
        get statusFilter() { return statusFilter; },
        set statusFilter(v) { statusFilter = v; },
        get categoryFilter() { return categoryFilter; },
        set categoryFilter(v) { categoryFilter = v; },
        signOut: () => signOutFn && signOutFn()
    };
})();

window.MalangUpload = MalangUpload;

/* =========================================================
   Helpers
   ========================================================= */

function escapeHtml(text) {
    return String(text == null ? "" : text).replace(/[&<>"']/g, (c) => (
        { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
}

function categoryOf(value) {
    return MalangUpload.config.categories.find((c) => c.value === value) || null;
}

function categoryLabel(value) {
    const found = categoryOf(value);
    return found ? found.label : value;
}

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/* =========================================================
   Submit form state
   ========================================================= */

const uploadState = {
    kind: "artworks",
    files: [],      // { id, file, url, title, type, status: ready|uploading|done|failed, error }
    busy: false,
    lastType: ""
};
let fileSeq = 0;

function renderKindSwitch() {
    const box = document.getElementById("kindSwitch");
    if (!box) return;
    const cats = MalangUpload.config.categories;
    if (!cats.some((c) => c.value === uploadState.kind)) uploadState.kind = cats[0].value;

    box.innerHTML = cats.map((c) => `
        <label class="kind-option">
            <input type="radio" name="kind" value="${escapeHtml(c.value)}"
                ${c.value === uploadState.kind ? "checked" : ""}>
            <span>${escapeHtml(c.label)}</span>
        </label>`).join("");

    box.querySelectorAll("input[name=kind]").forEach((input) => {
        input.addEventListener("change", () => setKind(input.value));
    });
}

function setKind(kind) {
    uploadState.kind = kind;
    const types = (categoryOf(kind) || {}).types || [];
    // A type from the other category makes no sense here; ask again.
    uploadState.files.forEach((f) => {
        if (f.status !== "done" && !types.includes(f.type)) f.type = "";
    });
    if (!types.includes(uploadState.lastType)) uploadState.lastType = "";
    renderFileList();
}

function currentTypes() {
    return (categoryOf(uploadState.kind) || {}).types || [];
}

/* =========================================================
   File picking
   ========================================================= */

function handleFileSelect(e) {
    if (e.target.files && e.target.files.length) addFiles(e.target.files);
    e.target.value = ""; // allow picking the same file again after removing it
}

function addFiles(fileList) {
    if (uploadState.busy) return;
    const cfg = MalangUpload.config;
    const skipped = [];

    // Starting a new batch after a finished one clears the old ticks.
    uploadState.files = uploadState.files.filter((f) => {
        if (f.status === "done") { URL.revokeObjectURL(f.url); return false; }
        return true;
    });

    Array.from(fileList).forEach((file) => {
        if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
            skipped.push(`${file.name} is not a JPG, PNG or WEBP`);
            return;
        }
        if (file.size > cfg.maxFileMb * 1024 * 1024) {
            skipped.push(`${file.name} is over ${cfg.maxFileMb} MB`);
            return;
        }
        if (uploadState.files.length >= cfg.maxFilesPerBatch) {
            skipped.push(`${file.name} (only ${cfg.maxFilesPerBatch} at a time)`);
            return;
        }
        uploadState.files.push({
            id: ++fileSeq,
            file,
            url: URL.createObjectURL(file),
            title: "",
            type: currentTypes().includes(uploadState.lastType) ? uploadState.lastType : "",
            status: "ready",
            error: ""
        });
    });

    renderFileList();
    if (skipped.length) {
        showAlert("Some files were skipped", skipped.join(" · "), [{ text: "OK" }]);
    }
}

function removeFile(id) {
    if (uploadState.busy) return;
    const i = uploadState.files.findIndex((f) => f.id === id);
    if (i === -1) return;
    URL.revokeObjectURL(uploadState.files[i].url);
    uploadState.files.splice(i, 1);
    renderFileList();
}

function statusText(f) {
    const size = f.file.size >= 1024 * 1024
        ? (f.file.size / (1024 * 1024)).toFixed(1) + " MB"
        : Math.max(1, Math.round(f.file.size / 1024)) + " KB";
    switch (f.status) {
        case "uploading": return "Uploading…";
        case "done": return "Sent for review ✓";
        case "failed": return "Failed: " + f.error;
        default: return `${f.file.name} · ${size}`;
    }
}

function renderFileList() {
    const list = document.getElementById("fileList");
    if (!list) return;
    const types = currentTypes();

    list.innerHTML = uploadState.files.map((f) => {
        const name = escapeHtml(f.file.name);
        const locked = uploadState.busy || f.status === "done";
        const options = [`<option value="" ${f.type ? "" : "selected"} disabled>Choose type…</option>`]
            .concat(types.map((t) =>
                `<option value="${escapeHtml(t)}" ${t === f.type ? "selected" : ""}>${escapeHtml(t)}</option>`))
            .join("");

        return `
            <li class="file-item is-${f.status}" data-id="${f.id}">
                <img class="file-thumb" src="${f.url}" alt="">
                <div class="file-fields">
                    <input type="text" class="file-title" maxlength="120" placeholder="Title (optional)"
                        aria-label="Title for ${name}" value="${escapeHtml(f.title)}" ${locked ? "disabled" : ""}>
                    <select class="file-type" aria-label="Type for ${name}" ${locked ? "disabled" : ""}>${options}</select>
                    <p class="file-status">${escapeHtml(statusText(f))}</p>
                </div>
                <button type="button" class="file-remove" aria-label="Remove ${name}"
                    ${locked ? "disabled" : ""}>&times;</button>
            </li>`;
    }).join("");

    updateSubmitButton();
}

function updateSubmitButton(progress) {
    const btn = document.getElementById("submitBtn");
    if (!btn) return;
    const waiting = uploadState.files.filter((f) => f.status !== "done").length;

    if (uploadState.busy && progress) {
        btn.textContent = `Uploading ${progress.at} of ${progress.of}…`;
        btn.disabled = true;
        return;
    }
    btn.disabled = uploadState.busy || waiting === 0;
    const failed = uploadState.files.some((f) => f.status === "failed");
    btn.textContent = waiting === 0
        ? "Choose images to submit"
        : failed ? `Retry ${plural(waiting, "upload")}` : `Submit ${plural(waiting, "work")} for review`;
}

function setFormLocked(locked) {
    document.querySelectorAll("#kindSwitch input").forEach((i) => { i.disabled = locked; });
    const zone = document.getElementById("dropzone");
    if (zone) zone.classList.toggle("is-locked", locked);
}

// Downscale and re-encode to webp, matching the gallery's own format and
// keeping the upload payload small enough for the web app to accept.
function compressToWebp(src) {
    const cfg = MalangUpload.config;
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const scale = Math.min(1, cfg.maxEdgePx / Math.max(img.width, img.height));
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
            const out = canvas.toDataURL("image/webp", cfg.webpQuality);
            if (out.startsWith("data:image/webp")) return resolve(out);
            // Browsers that cannot encode webp: send a high quality jpeg instead.
            resolve(canvas.toDataURL("image/jpeg", 0.92));
        };
        img.onerror = () => reject(new Error("Could not read that image."));
        img.src = src;
    });
}

/* =========================================================
   Submit
   ========================================================= */

async function handleFormSubmit(e) {
    e.preventDefault();
    if (uploadState.busy) return;

    const queue = uploadState.files.filter((f) => f.status !== "done");
    if (!queue.length) {
        showAlert("No Images", "Choose at least one image to upload.", [{ text: "OK" }]);
        return;
    }

    const missing = queue.filter((f) => !f.type);
    if (missing.length) {
        document.querySelectorAll(".file-item").forEach((li) => {
            const f = uploadState.files.find((x) => x.id === Number(li.dataset.id));
            li.classList.toggle("needs-type", Boolean(f && !f.type && f.status !== "done"));
        });
        const first = document.querySelector(".file-item.needs-type .file-type");
        if (first) first.focus();
        showAlert("Pick a Type",
            missing.length === 1
                ? "Choose a type for the image so it shows up under the right gallery filter."
                : `Choose a type for each of the ${missing.length} images so they show up under the right gallery filter.`,
            [{ text: "OK" }]);
        return;
    }

    uploadState.busy = true;
    setFormLocked(true);
    renderFileList();

    let sent = 0;
    let failed = 0;
    let local = false;

    for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        item.status = "uploading";
        item.error = "";
        renderFileList();
        updateSubmitButton({ at: i + 1, of: queue.length });

        try {
            const dataUrl = await compressToWebp(item.url);
            const result = await MalangUpload.submit({
                category: uploadState.kind,
                type: item.type,
                title: item.title.trim(),
                fileName: item.file.name,
                mimeType: dataUrl.substring(5, dataUrl.indexOf(";")),
                dataBase64: dataUrl.split(",")[1]
            });
            local = local || result.local;
            item.status = "done";
            sent++;
        } catch (err) {
            item.status = "failed";
            item.error = (err && err.message) || "Something went wrong.";
            failed++;
        }
    }

    uploadState.busy = false;
    setFormLocked(false);
    renderFileList();

    if (!failed) {
        vibrate(50);
        if (local) {
            showAlert("Saved On This Device",
                "The upload service is not connected yet, so your work is saved here only and has not reached the review team.",
                [{ text: "OK" }]);
        } else {
            showAlert("Sent for Review",
                sent === 1
                    ? "Your work was sent to the review team. It appears in the gallery once a reviewer approves it."
                    : `${sent} works were sent to the review team. They appear in the gallery once a reviewer approves them.`,
                [{ text: "OK" }]);
        }
    } else {
        vibrate(200);
        showAlert("Some Uploads Failed",
            `${sent} sent, ${failed} failed. The failed ones are still in the list with the reason; press Retry to try them again.`,
            [{ text: "OK" }]);
    }
}

/* =========================================================
   Form events (delegated, so re-rendering keeps them working)
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    const zone = document.getElementById("dropzone");
    const input = document.getElementById("fileInput");
    const list = document.getElementById("fileList");

    if (zone && input) {
        const open = () => { if (!uploadState.busy) input.click(); };
        zone.addEventListener("click", open);
        zone.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
        });
        ["dragenter", "dragover"].forEach((ev) =>
            zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add("dragover"); }));
        ["dragleave", "drop"].forEach((ev) =>
            zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.remove("dragover"); }));
        zone.addEventListener("drop", (e) => {
            if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        });
    }

    if (list) {
        const itemFor = (el) => {
            const li = el.closest(".file-item");
            return li ? uploadState.files.find((f) => f.id === Number(li.dataset.id)) : null;
        };
        list.addEventListener("input", (e) => {
            const f = itemFor(e.target);
            if (f && e.target.classList.contains("file-title")) f.title = e.target.value;
        });
        list.addEventListener("change", (e) => {
            const f = itemFor(e.target);
            if (!f || !e.target.classList.contains("file-type")) return;
            f.type = e.target.value;
            uploadState.lastType = f.type;
            // Fill the same type into any image still waiting for one.
            uploadState.files.forEach((other) => {
                if (!other.type && other.status !== "done") other.type = f.type;
            });
            renderFileList();
        });
        list.addEventListener("click", (e) => {
            if (!e.target.classList.contains("file-remove")) return;
            const f = itemFor(e.target);
            if (f) removeFile(f.id);
        });
    }
});

/* =========================================================
   Tabs and filters
   ========================================================= */

function switchTab(tabName) {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.getElementById("tabUpload").style.display = tabName === "upload" ? "block" : "none";
    document.getElementById("tabReview").style.display = tabName === "review" ? "block" : "none";
    document.getElementById(tabName === "review" ? "reviewTabBtn" : "uploadTabBtn").classList.add("active");
    document.getElementById("uploadApp").classList.toggle("wide", tabName === "review");
    if (tabName === "review") refreshQueue();
}

function setStatusFilter(status) {
    MalangUpload.statusFilter = status;
    document.querySelectorAll("#statusChips .chip").forEach((c) => {
        c.classList.toggle("active", c.dataset.status === status);
    });
    renderQueue();
}

function setCategoryFilter(category) {
    MalangUpload.categoryFilter = category;
    document.querySelectorAll("#categoryChips .chip").forEach((c) => {
        c.classList.toggle("active", c.dataset.category === category);
    });
    renderQueue();
}

/* =========================================================
   Review queue
   ========================================================= */

async function refreshQueue() {
    const list = document.getElementById("reviewQueueList");
    if (!list) return;
    list.innerHTML = `<p class="empty-msg">Loading submissions...</p>`;
    try {
        MalangUpload.items = await MalangUpload.fetchQueue();
    } catch (err) {
        MalangUpload.items = [];
        list.innerHTML = `<p class="empty-msg">Could not load submissions. ${escapeHtml(err.message || "")}</p>`;
        return;
    }
    renderQueue();
}

function renderQueue() {
    const list = document.getElementById("reviewQueueList");
    if (!list) return;

    const all = MalangUpload.items || [];
    const counts = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
    all.forEach((i) => { if (counts[i.status] !== undefined) counts[i.status]++; });
    document.getElementById("cPending").textContent = counts.PENDING;
    document.getElementById("cApproved").textContent = counts.APPROVED;
    document.getElementById("cRejected").textContent = counts.REJECTED;
    document.getElementById("cAll").textContent = all.length;

    const status = MalangUpload.statusFilter;
    const category = MalangUpload.categoryFilter;
    const shown = all.filter((i) =>
        (status === "ALL" || i.status === status) &&
        (category === "all" || i.category === category)
    );

    if (!shown.length) {
        list.innerHTML = `<p class="empty-msg">Nothing here. No submissions match this filter.</p>`;
        return;
    }

    list.innerHTML = shown.map((item) => {
        const src = item.imageUrl ||
            (item.dataBase64 ? `data:${item.mimeType || "image/webp"};base64,${item.dataBase64}` : "");
        const full = item.fullUrl || src;
        const id = escapeHtml(item.id);
        const title = item.title ? escapeHtml(item.title) : "<em>Untitled</em>";
        const artist = escapeHtml(item.artist || item.submitterName || "Unknown");
        const when = item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : "";
        const state = item.status || "PENDING";
        const meta = [categoryLabel(item.category), item.type, when].filter(Boolean).map(escapeHtml).join(" &middot; ");

        let footer;
        if (state === "PENDING") {
            footer = `
                <input type="text" class="review-comment-input" maxlength="300"
                    placeholder="Note for the artist (optional)" aria-label="Note for the artist">
                <div class="review-actions">
                    <button type="button" class="btn-approve" data-decision="APPROVED">Approve &amp; publish</button>
                    <button type="button" class="btn-reject" data-decision="REJECTED">Request changes</button>
                </div>`;
        } else if (state === "PUBLISHING") {
            footer = `<p class="reviewed-note">Publishing to the website…</p>`;
        } else {
            const where = state === "APPROVED" && item.galleryIndex !== "" && item.galleryIndex != null
                ? ` &middot; gallery #${escapeHtml(item.galleryIndex)}` : "";
            footer = `<p class="reviewed-note">${escapeHtml(state)} by ${escapeHtml(item.reviewedBy || "a reviewer")}${where}${
                item.comment ? ` &middot; &ldquo;${escapeHtml(item.comment)}&rdquo;` : ""}</p>`;
        }

        return `
            <div class="review-card" data-id="${id}">
                <img src="${escapeHtml(src)}" data-full="${escapeHtml(full)}" alt="${title.replace(/<[^>]+>/g, "")}"
                    class="review-thumb" loading="lazy" title="Click to enlarge">
                <div class="review-body">
                    <div class="review-title-row">
                        <p class="review-meta-title">${title}</p>
                        <span class="status-pill ${state.toLowerCase()}">${escapeHtml(state)}</span>
                    </div>
                    <p class="review-meta-artist">${artist}</p>
                    <p class="review-meta-info">${meta}</p>
                    ${footer}
                </div>
            </div>`;
    }).join("");
}

async function handleReviewDecision(card, decision) {
    const id = card.dataset.id;
    const input = card.querySelector(".review-comment-input");
    const comment = input ? input.value.trim() : "";
    const buttons = card.querySelectorAll(".review-actions button");
    const pressed = card.querySelector(`[data-decision="${decision}"]`);
    const label = pressed ? pressed.textContent : "";

    buttons.forEach((b) => { b.disabled = true; });
    if (pressed) pressed.textContent = decision === "APPROVED" ? "Publishing…" : "Saving…";

    try {
        const result = await MalangUpload.decide(id, decision, comment);
        vibrate(50);
        if (decision === "APPROVED" && result && !result.local) {
            const item = (MalangUpload.items || []).find((i) => i.id === id) || {};
            showAlert("Published",
                `It is now #${result.galleryIndex} in the ${categoryLabel(item.category)} gallery. ` +
                "The website updates in about a minute." + (result.warning ? " " + result.warning : ""),
                [{ text: "OK" }],
                result.commitUrl);
        }
        await refreshQueue();
    } catch (err) {
        vibrate(200);
        buttons.forEach((b) => { b.disabled = false; });
        if (pressed) pressed.textContent = label;
        showAlert("Action Failed", err.message || "Could not record that decision.", [{ text: "OK" }]);
        // Another reviewer may have decided it first; show the real state.
        refreshQueue();
    }
}

function viewFullImage(src) {
    if (!src) return;
    document.getElementById("fullViewImage").src = src;
    document.getElementById("fullViewModal").style.display = "flex";
}

document.addEventListener("DOMContentLoaded", () => {
    const grid = document.getElementById("reviewQueueList");
    if (!grid) return;
    grid.addEventListener("click", (e) => {
        const thumb = e.target.closest(".review-thumb");
        if (thumb) return viewFullImage(thumb.dataset.full || thumb.src);
        const btn = e.target.closest("[data-decision]");
        if (btn && !btn.disabled) handleReviewDecision(btn.closest(".review-card"), btn.dataset.decision);
    });
});
