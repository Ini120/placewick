// Placewick Admin: shared helpers (real data from Supabase, admin accounts only).
(function () {
    "use strict";
    var cfg = window.PLACEWICK_SUPABASE || {};
    var sb = (cfg.url && cfg.key && window.supabase) ? window.supabase.createClient(cfg.url, cfg.key) : null;
    var M = { sb: sb };
    window.placewickAdmin = M;

    M.esc = function (s) {
        return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    };
    M.initials = function (n) {
        var w = String(n || "").trim().split(/\s+/).filter(Boolean);
        return w.length ? (w[0][0] + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase() : "?";
    };
    M.ago = function (d) {
        var s = (Date.now() - new Date(d).getTime()) / 1000;
        if (s < 60) { return "just now"; }
        var m = Math.floor(s / 60); if (m < 60) { return m + " min ago"; }
        var h = Math.floor(m / 60); if (h < 24) { return h + (h === 1 ? " hour ago" : " hours ago"); }
        var dd = Math.floor(h / 24);
        return dd < 30 ? dd + (dd === 1 ? " day ago" : " days ago") : new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    };
    var timer;
    M.toast = function (msg) {
        var el = document.getElementById("toast"); if (!el) { return; }
        el.textContent = msg; el.classList.add("is-visible");
        clearTimeout(timer); timer = setTimeout(function () { el.classList.remove("is-visible"); }, 2800);
    };
    M.fail = function (msg) {
        var el = document.getElementById("page-error");
        if (el) { el.textContent = msg || "Something went wrong. Please refresh the page."; el.hidden = false; }
    };
    M.empty = function (icon, title, text) {
        return '<div class="empty-state"><i class="fa-solid ' + icon + '"></i><h4>' + title + "</h4><p>" + text + "</p></div>";
    };
    M.statusBadge = function (st) {
        var m = { pending: ["pending", "Pending"], verified: ["verified", "Verified"], rejected: ["rejected", "Rejected"] }[st] || ["pending", st];
        return '<span class="verify-type-badge st-' + m[0] + '">' + m[1] + "</span>";
    };

    function wireChrome() {
        var t = document.getElementById("menu-toggle"), o = document.getElementById("sidebar-overlay"),
            sidebar = document.getElementById("sidebar"), c = document.getElementById("sidebar-close");
        function set(open) { if (sidebar) { sidebar.classList.toggle("is-open", open); } if (o) { o.classList.toggle("is-visible", open); } }
        if (t) { t.addEventListener("click", function () { set(true); }); }
        if (o) { o.addEventListener("click", function () { set(false); }); }
        if (c) { c.addEventListener("click", function () { set(false); }); }
        var lo = document.getElementById("admin-logout");
        if (lo) { lo.addEventListener("click", function (e) { e.preventDefault(); sb.auth.signOut().then(function () { location.href = "admin-login.html"; }); }); }
    }

    // Only a signed-in account with the admin role gets through.
    M.init = function () {
        wireChrome();
        return new Promise(function (resolve) {
            if (!sb) { M.fail("Sign-in is not connected yet."); return; }
            sb.auth.getSession().then(function (r) {
                var session = r.data && r.data.session;
                if (!session) { location.replace("admin-login.html"); return; }
                sb.from("profiles").select("role,full_name,email").eq("id", session.user.id).maybeSingle().then(function (p) {
                    if (!p.data || p.data.role !== "admin") {
                        sb.auth.signOut().then(function () { location.replace("admin-login.html?denied=1"); });
                        return;
                    }
                    M.profile = p.data;
                    var name = p.data.full_name || p.data.email || "Admin";
                    document.querySelectorAll(".sidebar-user-info h4").forEach(function (e) { e.textContent = name; });
                    document.querySelectorAll(".sidebar-avatar, .header-avatar").forEach(function (e) { e.textContent = M.initials(name); });
                    resolve(p.data);
                });
            });
        });
    };

    M.counts = function () {
        function n(table, filter) {
            var q = sb.from(table).select("id", { count: "exact", head: true });
            if (filter) { q = q.eq(filter[0], filter[1]); }
            return q.then(function (r) { return r.count || 0; });
        }
        return Promise.all([n("institutions", ["status", "pending"]), n("companies", ["status", "pending"])]);
    };
    M.badges = function () {
        return M.counts().then(function (c) {
            [["inst", c[0]], ["comp", c[1]]].forEach(function (x) {
                document.querySelectorAll('[data-badge="' + x[0] + '"]').forEach(function (e) { e.textContent = x[1]; e.hidden = !x[1]; });
            });
        }).catch(function () {});
    };

    // Verification rows shared by the institutions and companies pages.
    M.setStatus = function (kind, id, status) {
        var fn = kind === "institution" ? "admin_set_institution_status" : "admin_set_company_status";
        return sb.rpc(fn, kind === "institution" ? { iid: id, new_status: status } : { cid: id, new_status: status });
    };
})();
