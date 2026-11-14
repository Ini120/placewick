// Placewick: sign-up, login and Google sign-in (Supabase Auth).
(function () {
    "use strict";

    var cfg = window.PLACEWICK_SUPABASE || {};
    var connected = !!(cfg.url && cfg.key && cfg.key.indexOf("PASTE") === -1 && window.supabase);
    var sb = connected ? window.supabase.createClient(cfg.url, cfg.key) : null;

    var HOME = {
        student: "applicant-dashboard.html",
        company: "company-dashboard.html",
        institution: "institution-dashboard.html",
        admin: "https://admin.placewick.com"
    };

    function note(form, text, kind) {
        if (!form) { return; }
        var el = form.querySelector(".form-message");
        if (!el) {
            el = document.createElement("div");
            el.className = "form-message";
            el.setAttribute("role", "alert");
            var anchor = form.querySelector(".create-button") || form.lastElementChild;
            form.insertBefore(el, anchor);
        }
        el.className = "form-message is-" + (kind || "error");
        el.textContent = text;
        el.style.display = text ? "block" : "none";
        return el;
    }

    function friendly(err) {
        var m = (err && err.message ? err.message : "").toLowerCase();
        if (m.indexOf("invalid login") !== -1) { return "Email or password is not correct."; }
        if (m.indexOf("not confirmed") !== -1) { return "Please confirm your email address first. Check your inbox for our message."; }
        if (m.indexOf("already registered") !== -1 || m.indexOf("already exists") !== -1) { return "An account with this email already exists. Try logging in instead."; }
        if (m.indexOf("password") !== -1 && m.indexOf("least") !== -1) { return "Your password must be at least 8 characters."; }
        if (m.indexOf("rate limit") !== -1 || m.indexOf("too many") !== -1) { return "Too many attempts. Please wait a few minutes and try again."; }
        if (m.indexOf("network") !== -1 || m.indexOf("fetch") !== -1) { return "Could not reach the server. Check your internet connection and try again."; }
        return "Something went wrong. Please try again.";
    }

    function setBusy(btn, busy, label) {
        if (!btn) { return; }
        if (busy) {
            btn.dataset.original = btn.innerHTML;
            btn.innerHTML = label;
            btn.style.pointerEvents = "none";
            btn.style.opacity = "0.7";
        } else {
            if (btn.dataset.original) { btn.innerHTML = btn.dataset.original; }
            btn.style.pointerEvents = "";
            btn.style.opacity = "";
        }
    }

    function notConnected(form) {
        note(form, "Sign-in is not connected yet. Please try again later.", "error");
    }

    // ---- Sign up ----
    function handleSignup(btn) {
        var form = btn.closest("form");
        if (!form) { return; }
        if (!sb) { notConnected(form); return; }
        if (!form.reportValidity()) { return; }

        var email = form.querySelector("#email").value.trim();
        var password = form.querySelector("#password").value;
        var confirm = form.querySelector("#confirm-password");

        if (password.length < 8) { note(form, "Your password must be at least 8 characters."); return; }
        if (confirm && confirm.value !== password) { note(form, "The two passwords do not match."); return; }

        var meta = { role: form.dataset.role || "student" };
        form.querySelectorAll("[data-meta]").forEach(function (el) {
            meta[el.dataset.meta] = (el.value || "").trim();
        });

        note(form, "", "info");
        setBusy(btn, true, "Creating account...");

        sb.auth.signUp({
            email: email,
            password: password,
            options: { data: meta, emailRedirectTo: window.location.origin + "/login.html" }
        }).then(function (res) {
            if (res.error) {
                setBusy(btn, false);
                note(form, friendly(res.error));
                return;
            }
            var u = res.data && res.data.user;
            if (u && Array.isArray(u.identities) && u.identities.length === 0) {
                setBusy(btn, false);
                note(form, "An account with this email already exists. Try logging in instead.");
                return;
            }
            window.location.href = form.dataset.next || "login.html";
        }).catch(function (err) {
            setBusy(btn, false);
            note(form, friendly(err));
        });
    }

    // ---- Where each user goes after login ----
    var routing = false;
    function go(url) { window.location.href = url; }
    function route() {
        if (routing || !sb) { return; }
        routing = true;
        sb.auth.getUser().then(function (res) {
            var user = res.data && res.data.user;
            if (!user) { routing = false; return; }
            return sb.from("profiles").select("role").eq("id", user.id).maybeSingle().then(function (p) {
                var role = p.data && p.data.role ? p.data.role : "student";
                if (role === "company") {
                    return sb.from("companies").select("id").eq("owner_id", user.id).maybeSingle().then(function (c) {
                        go(c.data ? HOME.company : "company-onboarding.html");
                    });
                }
                if (role === "student") {
                    return sb.from("students").select("onboarded_at").eq("id", user.id).maybeSingle().then(function (st) {
                        go(st.data && st.data.onboarded_at ? HOME.student : "applicant-onboarding.html");
                    });
                }
                go(HOME[role] || HOME.student);
            });
        }).catch(function () { routing = false; });
    }

    function google(btn) {
        var form = btn.closest("form") || document.body;
        if (!sb) { notConnected(form); return; }
        sb.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: window.location.origin + "/login.html" }
        }).then(function (res) {
            if (res.error) { note(form, friendly(res.error)); }
        });
    }

    document.addEventListener("click", function (e) {
        var s = e.target.closest("[data-signup]");
        if (s) { e.preventDefault(); handleSignup(s); return; }
        var g = e.target.closest("[data-google]");
        if (g) { e.preventDefault(); google(g); }
    });

    window.placewickAuth = { client: sb, connected: connected, note: note, friendly: friendly, setBusy: setBusy, route: route, notConnected: notConnected };
})();
