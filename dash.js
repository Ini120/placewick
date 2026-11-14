// Placewick: shared helpers for company dashboard pages (real data from Supabase).
(function () {
    "use strict";

    var A = window.placewickAuth;
    var sb = A && A.client;
    var D = { sb: sb };
    window.placewickDash = D;

    D.esc = function (s) {
        return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    };
    D.initials = function (n) {
        var w = String(n || "").trim().split(/\s+/).filter(Boolean);
        if (!w.length) { return "?"; }
        return (w[0][0] + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase();
    };
    D.ago = function (d) {
        var s = (Date.now() - new Date(d).getTime()) / 1000;
        if (s < 60) { return "just now"; }
        var m = Math.floor(s / 60);
        if (m < 60) { return m + " min ago"; }
        var h = Math.floor(m / 60);
        if (h < 24) { return h + (h === 1 ? " hour ago" : " hours ago"); }
        var dd = Math.floor(h / 24);
        if (dd < 30) { return dd + (dd === 1 ? " day ago" : " days ago"); }
        return D.date(d);
    };
    D.date = function (d) {
        if (!d) { return ""; }
        return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    };
    var STATUS = {
        applied: ["applied", "Applied"], reviewing: ["reviewing", "Reviewing"], interview: ["interview", "Interview"],
        accepted: ["accepted", "Accepted"], rejected: ["rejected", "Not selected"], withdrawn: ["closed", "Withdrawn"]
    };
    D.badge = function (st) {
        var s = STATUS[st] || ["applied", st];
        return '<span class="status-badge ' + s[0] + '"><span class="dot"></span>' + D.esc(s[1]) + "</span>";
    };
    D.oppBadge = function (st) {
        var cls = { open: "accepted", draft: "draft", closed: "closed" }[st] || "draft";
        var label = { open: "Open", draft: "Draft", closed: "Closed" }[st] || st;
        return '<span class="status-badge ' + cls + '"><span class="dot"></span>' + label + "</span>";
    };
    D.typeLabel = function (t) { return t === "siwes" ? "SIWES" : "Internship"; };
    D.modeLabel = function (m) { return { "on-site": "On-site", hybrid: "Hybrid", remote: "Remote" }[m] || ""; };

    var toastTimer;
    D.toast = function (msg) {
        var el = document.getElementById("toast");
        if (!el) { return; }
        el.textContent = msg;
        el.classList.add("is-visible");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { el.classList.remove("is-visible"); }, 2800);
    };

    D.fail = function (msg) {
        var el = document.getElementById("page-error");
        if (el) { el.textContent = msg || "Something went wrong. Please refresh the page."; el.hidden = false; }
    };

    function never() { return new Promise(function () {}); }

    function chrome() {
        var c = D.company;
        document.querySelectorAll(".sidebar-user-info h4").forEach(function (e) { e.textContent = c.name; });
        document.querySelectorAll(".sidebar-user-info span").forEach(function (e) {
            e.textContent = [c.industry, c.location].filter(Boolean).join(" · ") || "Company";
        });
        document.querySelectorAll(".sidebar-avatar, .header-avatar").forEach(function (e) { e.textContent = D.initials(c.name); });
        document.querySelectorAll(".sidebar-logout").forEach(function (a) {
            a.addEventListener("click", function (e) {
                e.preventDefault();
                sb.auth.signOut().then(function () { location.href = "login.html"; });
            });
        });
    }

    // Signs the user in (or sends them away), then resolves with their company.
    D.init = function () {
        if (!sb) { D.fail("Sign-in is not connected yet."); return never(); }
        return sb.auth.getSession().then(function (r) {
            var session = r.data && r.data.session;
            if (!session) { location.href = "login.html"; return never(); }
            var uid = session.user.id;
            return sb.from("profiles").select("role,full_name,email").eq("id", uid).maybeSingle().then(function (p) {
                if (!p.data || p.data.role !== "company") { A.route(); return never(); }
                return sb.from("companies").select("*").eq("owner_id", uid).maybeSingle().then(function (c) {
                    if (!c.data) { location.href = "company-onboarding.html"; return never(); }
                    D.user = session.user; D.profile = p.data; D.company = c.data;
                    chrome();
                    return D.company;
                });
            });
        });
    };

    function badges(d) {
        var open = d.opps.filter(function (o) { return o.status === "open"; }).length;
        var fresh = d.apps.filter(function (a) { return a.status === "applied"; }).length;
        [["open", open], ["new", fresh]].forEach(function (x) {
            document.querySelectorAll('[data-badge="' + x[0] + '"]').forEach(function (e) {
                e.textContent = x[1]; e.hidden = !x[1];
            });
        });
    }

    // Loads this company's opportunities, applications and the applicants' details.
    D.loadAll = function () {
        var cid = D.company.id;
        return sb.from("opportunities").select("*").eq("company_id", cid).order("created_at", { ascending: false }).then(function (o) {
            if (o.error) { throw o.error; }
            var opps = o.data || [];
            var ids = opps.map(function (x) { return x.id; });
            var appsP = ids.length
                ? sb.from("applications").select("id,opportunity_id,student_id,status,cover_note,created_at").in("opportunity_id", ids).order("created_at", { ascending: false })
                : Promise.resolve({ data: [] });
            return appsP.then(function (a) {
                if (a.error) { throw a.error; }
                var apps = a.data || [];
                var sids = Array.from(new Set(apps.map(function (x) { return x.student_id; })));
                if (!sids.length) { return { opps: opps, apps: apps, students: {}, names: {} }; }
                return Promise.all([
                    sb.from("students").select("id,course,department,level,matric_no,institution_id,institution_name_other").in("id", sids),
                    sb.from("profiles").select("id,full_name,email").in("id", sids)
                ]).then(function (r) {
                    var st = {}, nm = {};
                    (r[0].data || []).forEach(function (s) { st[s.id] = s; });
                    (r[1].data || []).forEach(function (p) { nm[p.id] = p; });
                    return { opps: opps, apps: apps, students: st, names: nm };
                });
            });
        }).then(function (d) { D.data = d; badges(d); return d; });
    };

    D.studentName = function (d, sid) {
        var p = d.names[sid];
        return (p && (p.full_name || p.email)) || "Student";
    };
    D.studentSchool = function (d, sid) {
        var s = d.students[sid];
        return (s && s.institution_name_other) || "";
    };
    D.oppTitle = function (d, oid) {
        for (var i = 0; i < d.opps.length; i++) { if (d.opps[i].id === oid) { return d.opps[i].title; } }
        return "Opportunity";
    };
})();
