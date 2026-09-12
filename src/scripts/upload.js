/* =========================================================
   Malang | Upload Your Work
   ---------------------------------------------------------
   Talks to the Malang upload service (a Google Apps Script
   web app that drops the file in the Malang Drive folder and
   logs a row in the submissions sheet). The endpoint lives in
   /resrc/data/upload-config.json so it can be changed without
   touching this file.

   If no endpoint is configured the page falls back to a local
   draft queue on this device and says so plainly, rather than
   pretending the work was delivered.
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
        categories: [
            { value: "artworks", label: "Artwork (Fine Art / Sketch / Painting)" },
            { value: "photographs", label: "Photograph" },
            { value: "digital", label: "Digital Art & Design" }
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

        renderCategoryOptions();
        const sub = document.getElementById("dropSub");
        if (sub) sub.textContent = `JPG, PNG or WEBP · Max ${config.maxFileMb} MB`;

        const notice = document.getElementById("offlineNotice");
        if (notice) notice.style.display = config.endpoint ? "none" : "flex";
    }

    function renderCategoryOptions() {
        const select = document.getElementById("workCategory");
        if (!select) return;
        select.innerHTML = config.categories
            .map((c) => `<option value="${c.value}">${c.label}</option>`)
            .join("");
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
        const artistField = document.getElementById("artistName");
        const reviewer = isReviewer(user.email);

        if (avatar) avatar.src = user.photoURL || "/resrc/images/icons/user.png";
        if (name) name.textContent = user.displayName || "Malang Member";
        if (badge) {
            badge.textContent = reviewer ? "Reviewer" : "Member";
            badge.classList.toggle("member", !reviewer);
        }
        if (reviewTab) reviewTab.style.display = reviewer ? "block" : "none";
        if (artistField && !artistField.value) artistField.value = user.displayName || "";

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
    async function post(payload) {
        const res = await fetch(config.endpoint, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "Request failed.");
        return data;
    }

    async function get(params) {
        const url = `${config.endpoint}?${new URLSearchParams(params).toString()}`;
        const res = await fetch(url);
        const data = await res.json();
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
        try { localStorage.setItem(LOCAL_KEY, JSON.stringify(list)); } catch { /* quota */ }
    }

    // ---------------------------------------------------------------
    // Submissions
    // ---------------------------------------------------------------
    async function submit(record) {
        if (!config.endpoint) {
            const list = readLocal();
            list.unshift({ ...record, id: "local_" + Date.now(), status: "PENDING", local: true });
            writeLocal(list);
            return { local: true };
        }

        await post({
            action: "submit",
            idToken: await token(),
            title: record.title,
            category: record.category,
            artist: record.artist,
            fileName: record.fileName,
            mimeType: record.mimeType,
            dataBase64: record.dataBase64
        });
        return { local: false };
    }

    async function fetchQueue() {
        if (!config.endpoint) return readLocal();
        const data = await get({ action: "queue", idToken: await token() });
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
            return;
        }
        await post({ action: "decide", idToken: await token(), id, decision, comment });
    }

    // Boot as soon as the DOM is up. If the Firebase module fails to load
    // (blocked CDN, offline), the sign-in gate still appears instead of the
    // loader spinning forever.
    let ready = null;
    let authResolved = false;
    function start() {
        if (!ready) {
            ready = boot().then(() => {
                // Don't sit on a black loader if Firebase is slow or blocked.
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
   File handling
   ========================================================= */

let selectedFile = null;

function handleFileSelect(e) {
    if (e.target.files && e.target.files.length) processFile(e.target.files[0]);
}

function processFile(file) {
    const cfg = MalangUpload.config;

    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
        showAlert("Unsupported File", "Please choose a JPG, PNG or WEBP image.", [{ text: "OK" }]);
        return;
    }
    if (file.size > cfg.maxFileMb * 1024 * 1024) {
        showAlert("File Too Large", `That image is over the ${cfg.maxFileMb} MB limit.`, [{ text: "OK" }]);
        return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
        selectedFile = { name: file.name, dataUrl: ev.target.result, size: file.size };
        const preview = document.getElementById("imagePreview");
        if (preview) preview.src = selectedFile.dataUrl;
        const nameEl = document.getElementById("previewName");
        if (nameEl) nameEl.textContent = file.name;
        const sizeEl = document.getElementById("previewSize");
        if (sizeEl) sizeEl.textContent = (file.size / (1024 * 1024)).toFixed(1) + " MB";
        document.getElementById("previewBox").style.display = "block";
        document.getElementById("dropzone").style.display = "none";
    };
    reader.readAsDataURL(file);
}

function clearSelectedFile() {
    selectedFile = null;
    const input = document.getElementById("fileInput");
    if (input) input.value = "";
    document.getElementById("previewBox").style.display = "none";
    document.getElementById("dropzone").style.display = "flex";
}

// Downscale and re-encode to webp, matching the gallery's own format and
// keeping the upload payload small enough for the web app to accept.
function compressToWebp(dataUrl) {
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
            // Browsers without webp encoding fall back to png; keep the original then.
            resolve(out.startsWith("data:image/webp") ? out : dataUrl);
        };
        img.onerror = () => reject(new Error("Could not read that image."));
        img.src = dataUrl;
    });
}

/* =========================================================
   Submit
   ========================================================= */

async function handleFormSubmit(e) {
    e.preventDefault();
    if (!selectedFile) {
        showAlert("No Image", "Please choose an image to upload.", [{ text: "OK" }]);
        return;
    }

    const artist = document.getElementById("artistName").value.trim();
    if (!artist) {
        showAlert("Missing Credit", "Please enter the name this work should be credited to.", [{ text: "OK" }]);
        return;
    }

    const btn = document.getElementById("submitBtn");
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = "Uploading...";

    try {
        const compressed = await compressToWebp(selectedFile.dataUrl);
        const result = await MalangUpload.submit({
            title: document.getElementById("workTitle").value.trim(),
            category: document.getElementById("workCategory").value,
            artist,
            fileName: selectedFile.name,
            mimeType: compressed.substring(5, compressed.indexOf(";")),
            dataBase64: compressed.split(",")[1]
        });

        document.getElementById("uploadForm").reset();
        clearSelectedFile();
        vibrate(50);

        if (result.local) {
            showAlert("Saved On This Device",
                "The upload service is not connected yet, so your work is saved here only and has not reached the review team.",
                [{ text: "OK" }]);
        } else {
            showAlert("Submitted for Review",
                "Your work has been sent to the core team. You will see it in the gallery once it is approved.",
                [{ text: "OK" }]);
        }
    } catch (err) {
        vibrate(200);
        showAlert("Upload Failed", err.message || "Something went wrong. Please try again.", [{ text: "OK" }]);
    } finally {
        btn.disabled = false;
        btn.innerHTML = original;
    }
}

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
        list.innerHTML = `<p class="empty-msg">Could not load submissions. ${err.message || ""}</p>`;
        return;
    }
    renderQueue();
}

function categoryLabel(value) {
    const found = MalangUpload.config.categories.find((c) => c.value === value);
    return found ? found.label.split(" (")[0] : value;
}

function escapeHtml(text) {
    return String(text || "").replace(/[&<>"']/g, (c) => (
        { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
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
        const src = item.imageUrl || item.image || "";
        const title = escapeHtml(item.title) || "<em>Untitled</em>";
        const artist = escapeHtml(item.artist || item.submitterName || "Unknown");
        const when = item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : "";
        const pill = (item.status || "PENDING").toLowerCase();
        const pending = item.status === "PENDING" || !item.status;

        const actions = pending
            ? `<input type="text" id="comment_${item.id}" class="review-comment-input"
                      placeholder="Note for the artist (optional)">
               <div class="review-actions">
                   <button class="btn-approve" onclick="handleReviewDecision('${item.id}','APPROVED')">Approve</button>
                   <button class="btn-reject" onclick="handleReviewDecision('${item.id}','REJECTED')">Request Changes</button>
               </div>`
            : `<p class="reviewed-note">${escapeHtml(item.status)} by ${escapeHtml(item.reviewedBy || "a reviewer")}${
                item.comment ? ` &middot; &ldquo;${escapeHtml(item.comment)}&rdquo;` : ""}</p>`;

        return `
            <div class="review-card">
                <img src="${src}" alt="" class="review-thumb" loading="lazy"
                     onclick="viewFullImage('${src}')" title="Click to enlarge">
                <div class="review-body">
                    <div class="review-title-row">
                        <p class="review-meta-title">${title}</p>
                        <span class="status-pill ${pill}">${escapeHtml(item.status || "PENDING")}</span>
                    </div>
                    <p class="review-meta-artist">${artist}</p>
                    <p class="review-meta-info">${escapeHtml(categoryLabel(item.category))}${when ? " &middot; " + when : ""}</p>
                    ${actions}
                </div>
            </div>`;
    }).join("");
}

async function handleReviewDecision(id, decision) {
    const input = document.getElementById("comment_" + id);
    const comment = input ? input.value.trim() : "";
    try {
        await MalangUpload.decide(id, decision, comment);
        vibrate(50);
        await refreshQueue();
    } catch (err) {
        vibrate(200);
        showAlert("Action Failed", err.message || "Could not record that decision.", [{ text: "OK" }]);
    }
}

function viewFullImage(src) {
    if (!src) return;
    document.getElementById("fullViewImage").src = src;
    document.getElementById("fullViewModal").style.display = "flex";
}

/* =========================================================
   Drag and drop
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    const zone = document.getElementById("dropzone");
    if (!zone) return;
    ["dragenter", "dragover"].forEach((ev) =>
        zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add("dragover"); }));
    ["dragleave", "drop"].forEach((ev) =>
        zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.remove("dragover"); }));
    zone.addEventListener("drop", (e) => {
        if (e.dataTransfer.files.length) processFile(e.dataTransfer.files[0]);
    });
});
