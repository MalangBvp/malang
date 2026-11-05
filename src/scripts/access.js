/* =========================================================
   Malang | Who am I?
   ---------------------------------------------------------
   Asks the upload service (documentation/upload-backend.gs)
   what the signed-in person may do. The member and reviewer
   lists are kept privately in that service's spreadsheet, so
   the website never downloads anyone else's email.

     malangAccess(user)                 -> { member, reviewer }
     malangAccess(user, { fresh: true }) skips the saved answer
                                          (use right after sign-in)

   A yes is remembered for this browser tab for 10 minutes, so
   moving between pages does not ask again every time. If the
   service cannot be reached it throws; callers then keep what
   they showed before instead of locking a member out.
   ========================================================= */

(() => {
    const CONFIG_URL = "/resrc/data/upload-config.json";
    const SAVED_KEY = "malang_access";
    const SAVED_MS = 10 * 60 * 1000;
    const NONE = Object.freeze({ member: false, reviewer: false });

    let endpoint = null;
    const asking = new Map(); // uid -> promise, so two callers share one request

    function getEndpoint() {
        if (!endpoint) {
            endpoint = fetch(CONFIG_URL, { cache: "no-store" })
                .then((res) => {
                    if (!res.ok) throw new Error(res.status);
                    return res.json();
                })
                .then((cfg) => {
                    if (!cfg.endpoint) throw new Error("The membership check is not set up yet.");
                    return cfg.endpoint;
                })
                .catch((err) => {
                    endpoint = null; // try again next time
                    throw err;
                });
        }
        return endpoint;
    }

    // text/plain keeps this a "simple" request: Apps Script cannot answer a CORS preflight.
    async function post(user, refresh) {
        const url = await getEndpoint();
        let data;
        try {
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ action: "whoami", idToken: await user.getIdToken(refresh) })
            });
            data = await res.json();
        } catch {
            throw new Error("Could not reach the Malang membership check. Check your connection and try again.");
        }
        if (!data.ok) {
            const err = new Error(data.error || "The membership check failed.");
            err.code = data.code || "";
            throw err;
        }
        return { member: !!data.member, reviewer: !!data.reviewer };
    }

    /** If the sign-in went stale, refresh it once and ask again (same as call() in upload.js). */
    async function ask(user) {
        try {
            return await post(user, false);
        } catch (err) {
            if (err.code !== "AUTH" || !/expired/i.test(err.message)) throw err;
            return post(user, true);
        }
    }

    function saved(user) {
        try {
            const s = JSON.parse(sessionStorage.getItem(SAVED_KEY) || "null");
            if (s && s.uid === user.uid && s.email === user.email && Date.now() - s.at < SAVED_MS) return s.access;
        } catch { /* storage blocked or bad data: just ask */ }
        return null;
    }

    function remember(user, access) {
        try {
            if (access.member || access.reviewer) {
                sessionStorage.setItem(SAVED_KEY, JSON.stringify({ uid: user.uid, email: user.email, at: Date.now(), access }));
            } else {
                // Only a yes is kept, so someone added a moment ago is let in on their next try.
                sessionStorage.removeItem(SAVED_KEY);
            }
        } catch { /* fine */ }
    }

    function forget() {
        try { sessionStorage.removeItem(SAVED_KEY); } catch { /* fine */ }
    }

    function malangAccess(user, options) {
        if (!user) {
            forget();
            return Promise.resolve(NONE);
        }
        if (!user.email) return Promise.resolve(NONE); // e.g. a GitHub account with a private email

        if (!(options && options.fresh)) {
            const hit = saved(user);
            if (hit) return Promise.resolve(hit);
        }
        if (!asking.has(user.uid)) {
            const request = ask(user)
                .then((access) => { remember(user, access); return access; })
                .finally(() => asking.delete(user.uid));
            asking.set(user.uid, request);
        }
        return asking.get(user.uid);
    }

    malangAccess.forget = forget;
    window.malangAccess = malangAccess;
})();
