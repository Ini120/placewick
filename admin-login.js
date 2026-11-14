// Placewick Admin: staff sign-in. Only accounts with the admin role are let in.
(function () {
    "use strict";
    var cfg = window.PLACEWICK_SUPABASE || {};
    var sb = (cfg.url && cfg.key && window.supabase) ? window.supabase.createClient(cfg.url, cfg.key) : null;
    var form = document.getElementById("admin-login-form");
    var errorBox = document.getElementById("admin-login-error");
    var pw = document.getElementById("admin-password");
    var toggle = document.getElementById("admin-password-toggle");

    if (toggle && pw) {
        toggle.addEventListener("click", function () {
            var hidden = pw.type === "password";
            pw.type = hidden ? "text" : "password";
            var icon = toggle.querySelector("i");
            if (icon) { icon.classList.toggle("fa-eye", !hidden); icon.classList.toggle("fa-eye-slash", hidden); }
            toggle.setAttribute("aria-label", hidden ? "Hide password" : "Show password");
        });
    }
    function showError(m) {
        document.getElementById("admin-login-error-text").textContent = m;
        errorBox.classList.add("is-visible");
    }
    if (!form) { return; }
    if (/denied=1/.test(location.search)) { showError("That account does not have admin access."); }

    // Already signed in as an admin? Go straight in.
    if (sb) {
        sb.auth.getSession().then(function (r) {
            var s = r.data && r.data.session; if (!s) { return; }
            sb.from("profiles").select("role").eq("id", s.user.id).maybeSingle().then(function (p) {
                if (p.data && p.data.role === "admin") { location.replace("admin-dashboard.html"); }
            });
        });
    }

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        errorBox.classList.remove("is-visible");
        var email = document.getElementById("admin-email").value.trim();
        if (!email || !pw.value) { showError("Please enter your work email and password."); return; }
        if (!sb) { showError("Sign-in is not connected yet."); return; }
        var btn = form.querySelector("button[type=submit]"); btn.disabled = true;
        sb.auth.signInWithPassword({ email: email, password: pw.value }).then(function (r) {
            if (r.error || !r.data.user) { btn.disabled = false; showError("Incorrect email or password. Please try again."); return; }
            sb.from("profiles").select("role").eq("id", r.data.user.id).maybeSingle().then(function (p) {
                if (p.data && p.data.role === "admin") { location.replace("admin-dashboard.html"); return; }
                sb.auth.signOut().then(function () { btn.disabled = false; showError("That account does not have admin access."); });
            });
        });
    });
})();
