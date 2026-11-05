/* =========================================================
   Malang | Upload Your Work
   ---------------------------------------------------------
   Upload tab:  pick Artwork or Photograph, drop or paste one or
                more images, tap a type, submit. Each image shows
                its own progress and any problem right next to it.
   My uploads:  every work you sent, its review status, the
                reviewer's note, and a link once it is live.
   Review tab:  reviewers approve (publishes to the gallery) or
                ask for changes.

   The upload service is a Google Apps Script web app (see
   documentation/upload-backend.gs). Its URL lives in
   /resrc/data/upload-config.json. If it is empty the page keeps
   submissions on this device only and says so plainly.
   ========================================================= */

const KIND_KEY = "malang_upload_kind";

const uploadState = {
    kind: "artworks",
    files: [],      // { id, file, url, title, type, status, progress, error, problem }
    busy: false,
    lastType: ""
};
let fileSeq = 0;

try {
    const saved = localStorage.getItem(KIND_KEY);
    if (saved) uploadState.kind = saved;
} catch { /* storage blocked: default is fine */ }

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
            sub.textContent = `JPG, PNG or WEBP · Max ${config.maxFileMb} MB · Up to ${config.maxFilesPerBatch} at once · or paste with Ctrl+V`;
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

        // Deep links: /upload.html?view=review or ?view=mine
        const view = new URLSearchParams(window.location.search).get("view");
        if (view === "review" && reviewer) switchTab("review");
        else if (view === "mine") switchTab("mine");
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
    // Calls
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

    async function fetchMine() {
        if (!config.endpoint) return readLocal();
        const data = await post({ action: "mine", idToken: await token() });
        return data.items || [];
    }

    async function withdraw(id) {
        if (!config.endpoint) {
            writeLocal(readLocal().filter((s) => s.id !== id));
            return { local: true };
        }
        return post({ action: "withdraw", idToken: await token(), id });
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
        boot: start, setUser, isMember, isReviewer, submit, fetchMine, withdraw, fetchQueue, decide,
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

const $ = (id) => document.getElementById(id);

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

function formatSize(bytes) {
    return bytes >= 1024 * 1024
        ? (bytes / (1024 * 1024)).toFixed(1) + " MB"
        : Math.max(1, Math.round(bytes / 1024)) + " KB";
}

function formatDate(value) {
    const d = new Date(value);
    return isNaN(d) ? "" : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function setMessage(text, tone) {
    const el = $("formMessage");
    if (!el) return;
    el.hidden = !text;
    el.textContent = text || "";
    el.className = "form-message" + (tone ? " " + tone : "");
}

/* =========================================================
   Artwork / Photograph and type
   ========================================================= */

function currentTypes() {
    return (categoryOf(uploadState.kind) || {}).types || [];
}

const pendingFiles = () => uploadState.files.filter((f) => f.status !== "done");

function renderKindSwitch() {
    const box = $("kindSwitch");
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
    renderTypePicker();
}

function setKind(kind) {
    uploadState.kind = kind;
    try { localStorage.setItem(KIND_KEY, kind); } catch { /* fine */ }
    const types = currentTypes();
    // A type from the other category makes no sense here; ask again.
    pendingFiles().forEach((f) => { if (!types.includes(f.type)) f.type = ""; });
    if (!types.includes(uploadState.lastType)) uploadState.lastType = "";
    renderFileList();
}

function renderTypePicker() {
    const picker = $("typePicker");
    const chips = $("typeChips");
    if (!picker || !chips) return;

    const waiting = pendingFiles();
    picker.hidden = waiting.length === 0;
    if (!waiting.length) return;

    const types = currentTypes();
    const first = waiting[0].type;
    const shared = waiting.every((f) => f.type === first) ? first : "";
    const mixed = !shared && waiting.some((f) => f.type);

    chips.innerHTML = types.map((t) => `
        <label class="type-chip">
            <input type="radio" name="batchType" value="${escapeHtml(t)}"
                ${t === shared ? "checked" : ""} ${uploadState.busy ? "disabled" : ""}>
            <span>${escapeHtml(t)}</span>
        </label>`).join("");

    const hint = $("typeHint");
    if (hint) {
        hint.textContent = waiting.length < 2 ? "" : mixed ? "mixed · change single images below" : "applies to all images";
    }
}

function clearTypeError() {
    const err = $("typeError");
    if (err) err.hidden = true;
    const picker = $("typePicker");
    if (picker) picker.classList.remove("has-error");
}

/* =========================================================
   Picking files
   ========================================================= */

function handleFileSelect(e) {
    if (e.target.files && e.target.files.length) addFiles(e.target.files);
    e.target.value = ""; // allow picking the same file again after removing it
}

function addFiles(fileList) {
    if (uploadState.busy) return;
    if (!$("doneState").hidden) startNewBatch();

    const cfg = MalangUpload.config;
    const skipped = [];

    // A new pick after a finished batch clears the old ticks.
    uploadState.files = uploadState.files.filter((f) => {
        if (f.status === "done") { URL.revokeObjectURL(f.url); return false; }
        return true;
    });

    const waiting = pendingFiles();
    const sharedType = waiting.length && waiting.every((f) => f.type === waiting[0].type) ? waiting[0].type : "";
    const defaultType = sharedType || (currentTypes().includes(uploadState.lastType) ? uploadState.lastType : "");

    Array.from(fileList).forEach((file) => {
        if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
            skipped.push(`${file.name} (not a JPG, PNG or WEBP)`);
            return;
        }
        if (file.size > cfg.maxFileMb * 1024 * 1024) {
            skipped.push(`${file.name} (over ${cfg.maxFileMb} MB)`);
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
            type: defaultType,
            status: "ready",
            progress: 0,
            error: "",
            problem: ""
        });
    });

    renderFileList();
    setMessage(skipped.length ? "Skipped: " + skipped.join(", ") + "." : "", "warn");
}

function removeFile(id) {
    if (uploadState.busy) return;
    const i = uploadState.files.findIndex((f) => f.id === id);
    if (i === -1) return;
    URL.revokeObjectURL(uploadState.files[i].url);
    uploadState.files.splice(i, 1);
    if (!uploadState.files.length) setMessage("");
    renderFileList();
}

/* =========================================================
   File list
   ========================================================= */

function statusText(f) {
    switch (f.status) {
        case "preparing": return "Preparing…";
        case "uploading": return "Uploading…";
        case "done": return "Sent for review";
        case "failed": return "Didn't upload: " + f.error;
        default: return `${f.file.name} · ${formatSize(f.file.size)}`;
    }
}

function renderFileList() {
    const list = $("fileList");
    if (!list) return;
    const types = currentTypes();
    const many = uploadState.files.length > 1;

    list.innerHTML = uploadState.files.map((f) => {
        const name = escapeHtml(f.file.name);
        const locked = uploadState.busy || f.status === "done";
        const select = many ? `
            <select class="file-type" aria-label="Type for ${name}" aria-describedby="problem-${f.id}"
                ${locked ? "disabled" : ""}>
                <option value="" ${f.type ? "" : "selected"} disabled>Choose type…</option>
                ${types.map((t) => `<option value="${escapeHtml(t)}" ${t === f.type ? "selected" : ""}>${escapeHtml(t)}</option>`).join("")}
            </select>` : "";

        return `
            <li class="file-item is-${f.status}${f.problem ? " has-problem" : ""}" data-id="${f.id}">
                <img class="file-thumb" src="${f.url}" alt="">
                <div class="file-fields">
                    <input type="text" class="file-title" maxlength="120" placeholder="Title (optional)"
                        aria-label="Title for ${name}" value="${escapeHtml(f.title)}" ${locked ? "disabled" : ""}>
                    ${select}
                    <p class="field-error" id="problem-${f.id}" ${f.problem ? "" : "hidden"}>${escapeHtml(f.problem)}</p>
                    <p class="file-status">${escapeHtml(statusText(f))}</p>
                    <div class="file-progress" aria-hidden="true"><span style="width:${f.progress}%"></span></div>
                </div>
                <button type="button" class="file-remove" aria-label="Remove ${name}"
                    ${locked ? "disabled" : ""}>&times;</button>
            </li>`;
    }).join("");

    const zone = $("dropzone");
    if (zone) zone.classList.toggle("compact", uploadState.files.length > 0);
    const label = $("dropLabel");
    if (label) label.textContent = uploadState.files.length ? "+ Add more images" : "Drop images here or click to browse";

    renderTypePicker();
    updateSubmitButton();
}

/** Updates one row in place while uploading, so thumbnails don't flicker. */
function updateRow(f) {
    const li = document.querySelector(`.file-item[data-id="${f.id}"]`);
    if (!li) return;
    li.className = `file-item is-${f.status}`;
    li.querySelector(".file-status").textContent = statusText(f);
    li.querySelector(".file-progress span").style.width = f.progress + "%";
}

function updateSubmitButton(progress) {
    const btn = $("submitBtn");
    if (!btn) return;
    const waiting = pendingFiles().length;

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
    document.querySelectorAll("#kindSwitch input, #typeChips input").forEach((i) => { i.disabled = locked; });
    const zone = $("dropzone");
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
        img.onerror = () => reject(new Error("could not read this image."));
        img.src = src;
    });
}

/* =========================================================
   Submit
   ========================================================= */

/** Every image needs a type. Returns true when the form can go. */
function checkTypes(queue) {
    clearTypeError();
    queue.forEach((f) => { f.problem = ""; });
    const missing = queue.filter((f) => !f.type);
    if (!missing.length) return true;

    if (missing.length === queue.length) {
        // Nothing chosen at all: the chips are the place to fix it.
        renderFileList();
        $("typePicker").classList.add("has-error");
        $("typeError").hidden = false;
        const chip = document.querySelector("#typeChips input");
        if (chip) chip.focus();
    } else {
        missing.forEach((f) => { f.problem = "Choose a type for this image."; });
        renderFileList();
        const select = document.querySelector(".file-item.has-problem .file-type");
        if (select) select.focus();
    }
    setMessage("");
    return false;
}

async function handleFormSubmit(e) {
    e.preventDefault();
    if (uploadState.busy) return;

    const queue = pendingFiles();
    if (!queue.length) {
        setMessage("Choose at least one image first.", "error");
        return;
    }
    if (!checkTypes(queue)) return;

    uploadState.busy = true;
    setFormLocked(true);
    setMessage("");
    queue.forEach((f) => { f.error = ""; f.progress = 0; });
    renderFileList();

    let sent = 0;
    let failed = 0;
    let local = false;

    for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        updateSubmitButton({ at: i + 1, of: queue.length });

        item.status = "preparing";
        item.progress = 8;
        updateRow(item);

        let ticker = null;
        try {
            const dataUrl = await compressToWebp(item.url);
            item.status = "uploading";
            item.progress = 30;
            updateRow(item);

            // The upload service gives no byte progress, so ease toward the
            // end while waiting; it jumps to full when the server answers.
            ticker = setInterval(() => {
                item.progress += (92 - item.progress) * 0.07;
                updateRow(item);
            }, 200);

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
            item.progress = 100;
            sent++;
        } catch (err) {
            item.status = "failed";
            item.progress = 0;
            item.error = (err && err.message) || "something went wrong.";
            failed++;
        } finally {
            clearInterval(ticker);
            updateRow(item);
        }
    }

    uploadState.busy = false;
    setFormLocked(false);
    renderFileList();

    if (!failed) {
        vibrate(50);
        showDone(sent, local);
    } else {
        vibrate(200);
        setMessage(
            `${failed} of ${queue.length} didn't upload. The reason is under each image; press Retry to try again.`,
            "error");
    }
}

function showDone(sent, local) {
    $("uploadForm").hidden = true;
    const done = $("doneState");
    done.hidden = false;
    $("doneTitle").textContent = local ? "Saved on this device" : "Sent for review";
    $("doneText").textContent = local
        ? "The upload service is not connected yet, so your work is saved here only and has not reached the review team."
        : sent === 1
            ? "Your work is with the review team. It appears in the gallery once a reviewer approves it."
            : `${sent} works are with the review team. They appear in the gallery once a reviewer approves them.`;
    done.focus();
}

function startNewBatch() {
    uploadState.files = uploadState.files.filter((f) => {
        if (f.status === "done") { URL.revokeObjectURL(f.url); return false; }
        return true;
    });
    $("doneState").hidden = true;
    $("uploadForm").hidden = false;
    setMessage("");
    renderFileList();
}

/* =========================================================
   Form events
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    const zone = $("dropzone");
    const input = $("fileInput");
    const list = $("fileList");
    const chips = $("typeChips");

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

    if (chips) {
        chips.addEventListener("change", (e) => {
            if (e.target.name !== "batchType") return;
            uploadState.lastType = e.target.value;
            pendingFiles().forEach((f) => { f.type = e.target.value; f.problem = ""; });
            clearTypeError();
            renderFileList();
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
            f.problem = "";
            uploadState.lastType = f.type;
            renderFileList();
        });
        list.addEventListener("click", (e) => {
            if (!e.target.classList.contains("file-remove")) return;
            const f = itemFor(e.target);
            if (f) removeFile(f.id);
        });
    }

    // Paste an image straight from the clipboard.
    document.addEventListener("paste", (e) => {
        if (!MalangUpload.user || $("tabUpload").style.display === "none" || uploadState.busy) return;
        const files = Array.from((e.clipboardData && e.clipboardData.files) || [])
            .filter((f) => f.type.startsWith("image/"));
        if (!files.length) return;
        e.preventDefault();
        addFiles(files);
    });

    // Leaving mid-upload would drop the rest of the batch.
    window.addEventListener("beforeunload", (e) => {
        if (!uploadState.busy) return;
        e.preventDefault();
        e.returnValue = "";
    });
});

/* =========================================================
   Tabs
   ========================================================= */

const TABS = { upload: ["tabUpload", "uploadTabBtn"], mine: ["tabMine", "mineTabBtn"], review: ["tabReview", "reviewTabBtn"] };

function switchTab(tabName) {
    Object.entries(TABS).forEach(([name, [panel, btn]]) => {
        $(panel).style.display = name === tabName ? "block" : "none";
        $(btn).classList.toggle("active", name === tabName);
        $(btn).setAttribute("aria-selected", String(name === tabName));
    });
    $("uploadApp").classList.toggle("wide", tabName === "review");
    if (tabName === "review") refreshQueue();
    if (tabName === "mine") refreshMine();
}

/* =========================================================
   My uploads
   ========================================================= */

const MEMBER_STATUS = {
    PENDING: { label: "In review", tone: "pending" },
    PUBLISHING: { label: "In review", tone: "pending" },
    APPROVED: { label: "Live", tone: "approved" },
    REJECTED: { label: "Changes requested", tone: "rejected" }
};

function galleryLink(item) {
    const p = new URLSearchParams({ page: "gallery" });
    if (item.category === "photographs") p.set("mode", "photographs");
    if (item.artist) p.set("artist", String(item.artist).replace(/\s+/g, "-"));
    return "/index.html?" + p.toString();
}

async function refreshMine() {
    const list = $("mineList");
    const summary = $("mineSummary");
    if (!list) return;
    list.innerHTML = `<li class="empty-msg">Loading your uploads…</li>`;
    if (summary) summary.textContent = "";

    let mine;
    try {
        mine = await MalangUpload.fetchMine();
    } catch (err) {
        const msg = /Unknown action/.test(err.message || "")
            ? "Your uploads will show here once the tech team updates the upload service."
            : "Could not load your uploads. " + (err.message || "");
        list.innerHTML = `<li class="empty-msg">${escapeHtml(msg)}</li>`;
        return;
    }
    renderMine(mine);
}

function renderMine(mine) {
    const list = $("mineList");
    const summary = $("mineSummary");

    const count = (s) => mine.filter((i) => (MEMBER_STATUS[i.status] || {}).tone === s).length;
    if (summary) {
        summary.textContent = mine.length
            ? [
                count("pending") && `${count("pending")} in review`,
                count("approved") && `${count("approved")} live`,
                count("rejected") && `${count("rejected")} ${count("rejected") === 1 ? "needs" : "need"} changes`
            ].filter(Boolean).join(" · ")
            : "";
    }

    if (!mine.length) {
        list.innerHTML = `
            <li class="empty-msg">
                Nothing yet. Works you upload show up here with their review status.
                <button type="button" class="link-btn" onclick="switchTab('upload')">Upload your first work</button>
            </li>`;
        return;
    }

    list.innerHTML = mine.map((item) => {
        const st = MEMBER_STATUS[item.status] || { label: item.status, tone: "pending" };
        const src = item.imageUrl ||
            (item.dataBase64 ? `data:${item.mimeType || "image/webp"};base64,${item.dataBase64}` : "");
        const meta = [categoryLabel(item.category), item.type, formatDate(item.submittedAt)]
            .filter(Boolean).map(escapeHtml).join(" &middot; ");

        let extra = "";
        if (item.status === "REJECTED") {
            extra = item.comment
                ? `<p class="mine-note"><span>Reviewer note</span>${escapeHtml(item.comment)}</p>`
                : `<p class="mine-note">A reviewer asked for changes.</p>`;
            extra += `<p class="mine-hint">You can upload an improved version anytime.</p>`;
        } else if (item.status === "APPROVED") {
            const num = item.galleryIndex !== "" && item.galleryIndex != null ? ` #${escapeHtml(item.galleryIndex)}` : "";
            extra = `<a class="mine-link" href="${escapeHtml(galleryLink(item))}" target="_top">View in gallery${num}</a>`;
        } else if (item.status === "PENDING") {
            extra = `<button type="button" class="withdraw-btn" data-id="${escapeHtml(item.id)}">Withdraw</button>`;
        }

        return `
            <li class="mine-item">
                <img class="mine-thumb" src="${escapeHtml(src)}" alt="" loading="lazy">
                <div class="mine-body">
                    <div class="mine-title-row">
                        <p class="mine-title">${item.title ? escapeHtml(item.title) : "<em>Untitled</em>"}</p>
                        <span class="status-pill ${st.tone}">${escapeHtml(st.label)}</span>
                    </div>
                    <p class="mine-meta">${meta}</p>
                    ${extra}
                </div>
            </li>`;
    }).join("");
}

document.addEventListener("DOMContentLoaded", () => {
    const list = $("mineList");
    if (!list) return;
    list.addEventListener("click", (e) => {
        const btn = e.target.closest(".withdraw-btn");
        if (!btn || btn.disabled) return;
        showAlert("Withdraw this upload?",
            "It leaves the review queue and the file is removed. You can upload it again later.",
            [{ text: "Keep it" }, { text: "Withdraw", focus: true, onClick: () => withdrawUpload(btn) }]);
    });
});

async function withdrawUpload(btn) {
    btn.disabled = true;
    btn.textContent = "Withdrawing…";
    try {
        await MalangUpload.withdraw(btn.dataset.id);
        vibrate(50);
    } catch (err) {
        vibrate(200);
        showAlert("Could Not Withdraw", err.message || "Please try again.", [{ text: "OK" }]);
    }
    refreshMine();
}

/* =========================================================
   Review queue
   ========================================================= */

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

async function refreshQueue() {
    const list = $("reviewQueueList");
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
    const list = $("reviewQueueList");
    if (!list) return;

    const all = MalangUpload.items || [];
    const counts = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
    all.forEach((i) => { if (counts[i.status] !== undefined) counts[i.status]++; });
    $("cPending").textContent = counts.PENDING;
    $("cApproved").textContent = counts.APPROVED;
    $("cRejected").textContent = counts.REJECTED;
    $("cAll").textContent = all.length;

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
        const state = item.status || "PENDING";
        const meta = [categoryLabel(item.category), item.type, formatDate(item.submittedAt)]
            .filter(Boolean).map(escapeHtml).join(" &middot; ");

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
    $("fullViewImage").src = src;
    $("fullViewModal").style.display = "flex";
}

document.addEventListener("DOMContentLoaded", () => {
    const grid = $("reviewQueueList");
    if (!grid) return;
    grid.addEventListener("click", (e) => {
        const thumb = e.target.closest(".review-thumb");
        if (thumb) return viewFullImage(thumb.dataset.full || thumb.src);
        const btn = e.target.closest("[data-decision]");
        if (btn && !btn.disabled) handleReviewDecision(btn.closest(".review-card"), btn.dataset.decision);
    });
});
