// Placewick: shared helpers for institution dashboard pages (real data from Supabase).
(function () {
    "use strict";

    var A = window.placewickAuth;
    var sb = A && A.client;
    var I = { sb: sb };
    window.placewickInst = I;

    I.esc = function (s) {
        return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    };
    I.initials = function (n) {
        var w = String(n || "").trim().split(/\s+/).filter(Boolean);
        if (!w.length) { return "?"; }
        return (w[0][0] + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase();
    };
    I.date = function (d) {
        if (!d) { return ""; }
        return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    };
    I.ago = function (d) {
        var s = (Date.now() - new Date(d).getTime()) / 1000;
        if (s < 60) { return "just now"; }
        var m = Math.floor(s / 60);
        if (m < 60) { return m + " min ago"; }
        var h = Math.floor(m / 60);
        if (h < 24) { return h + (h === 1 ? " hour ago" : " hours ago"); }
        var dd = Math.floor(h / 24);
        return dd < 30 ? dd + (dd === 1 ? " day ago" : " days ago") : I.date(d);
    };
    I.pct = function (a, b) { return b ? Math.round((a / b) * 100) : 0; };

    var toastTimer;
    I.toast = function (msg) {
        var el = document.getElementById("toast");
        if (!el) { return; }
        el.textContent = msg;
        el.classList.add("is-visible");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { el.classList.remove("is-visible"); }, 2800);
    };
    I.fail = function (msg) {
        var el = document.getElementById("page-error");
        if (el) { el.textContent = msg || "Something went wrong. Please refresh the page."; el.hidden = false; }
    };

    // Status badges for a student's overall placement state.
    var STATE = {
        placed: ["placed", "Placed"], interview: ["interview", "Interviewing"],
        applied: ["applied", "Applied"], none: ["neutral", "Not started"]
    };
    I.stateBadge = function (k) {
        var s = STATE[k] || STATE.none;
        return '<span class="status-badge ' + s[0] + '"><span class="dot"></span>' + s[1] + "</span>";
    };
    I.appBadge = function (st) {
        var m = { applied: ["applied", "Applied"], reviewing: ["reviewing", "Reviewing"], interview: ["interview", "Interview"],
                  accepted: ["accepted", "Accepted"], rejected: ["rejected", "Not selected"], withdrawn: ["neutral", "Withdrawn"] }[st] || ["applied", st];
        return '<span class="status-badge ' + m[0] + '"><span class="dot"></span>' + I.esc(m[1]) + "</span>";
    };
    I.logBadge = function (st) {
        var m = { submitted: ["interview", "To review"], approved: ["accepted", "Approved"], returned: ["rejected", "Returned"], draft: ["neutral", "Draft"] }[st] || ["neutral", st];
        return '<span class="status-badge ' + m[0] + '"><span class="dot"></span>' + m[1] + "</span>";
    };

    function never() { return new Promise(function () {}); }

    function chrome() {
        var n = I.inst;
        document.querySelectorAll(".sidebar-user-info h4").forEach(function (e) { e.textContent = n.name; });
        document.querySelectorAll(".sidebar-user-info span").forEach(function (e) {
            e.textContent = [n.state, n.status === "verified" ? "Verified" : "Awaiting verification"].filter(Boolean).join(" · ");
        });
        document.querySelectorAll(".sidebar-avatar, .header-avatar").forEach(function (e) { e.textContent = I.initials(n.name); });
        document.querySelectorAll(".sidebar-logout").forEach(function (a) {
            a.addEventListener("click", function (e) {
                e.preventDefault();
                sb.auth.signOut().then(function () { location.href = "login.html"; });
            });
        });
        var note = document.getElementById("verify-note");
        if (note && n.status !== "verified") {
            note.hidden = false;
            note.innerHTML = n.status === "rejected"
                ? "<strong>Verification was not approved.</strong> Please contact support@placewick.com."
                : "<strong>Your institution is awaiting verification.</strong> Students can only choose your school once Placewick has verified it. We will email you when it is done.";
        }
    }

    I.init = function () {
        if (!sb) { I.fail("Sign-in is not connected yet."); return never(); }
        return sb.auth.getSession().then(function (r) {
            var session = r.data && r.data.session;
            if (!session) { location.href = "login.html"; return never(); }
            var uid = session.user.id;
            return sb.from("profiles").select("role,full_name,email").eq("id", uid).maybeSingle().then(function (p) {
                if (!p.data || p.data.role !== "institution") { A.route(); return never(); }
                return sb.from("institutions").select("*").eq("owner_id", uid).maybeSingle().then(function (c) {
                    if (!c.data) { I.fail("We could not find your institution record. Please contact support@placewick.com."); return never(); }
                    I.user = session.user; I.profile = p.data; I.inst = c.data;
                    chrome();
                    return I.inst;
                });
            });
        });
    };

    function ids(arr, key) {
        return Array.from(new Set(arr.map(function (x) { return x[key]; }).filter(Boolean)));
    }
    function by(arr) { var m = {}; (arr || []).forEach(function (x) { m[x.id] = x; }); return m; }
    function rows(r) { if (r.error) { throw r.error; } return r.data || []; }
    function inList(table, cols, col, list) {
        return list.length ? sb.from(table).select(cols).in(col, list) : Promise.resolve({ data: [] });
    }

    // Loads everything this institution can see, then works out each student's state.
    I.load = function () {
        var iid = I.inst.id;
        return Promise.all([
            sb.from("students").select("id,matric_no,department,course,level,institution_name_other").eq("institution_id", iid),
            sb.from("placements").select("*").eq("institution_id", iid).order("created_at", { ascending: false }),
            sb.from("institution_supervisors").select("*").eq("institution_id", iid).order("name"),
            sb.from("supervisor_visits").select("*").eq("institution_id", iid).order("visit_date", { ascending: false })
        ]).then(function (r) {
            var students = rows(r[0]), placements = rows(r[1]), sups = rows(r[2]), visits = rows(r[3]);
            var sids = ids(students.concat(placements.map(function (p) { return { id: p.student_id }; })), "id");
            var pids = placements.map(function (p) { return p.id; });
            return Promise.all([
                inList("profiles", "id,full_name,email", "id", sids),
                inList("applications", "id,opportunity_id,student_id,status,created_at", "student_id", sids),
                inList("logbook_entries", "*", "placement_id", pids)
            ]).then(function (r2) {
                var names = by(rows(r2[0])), apps = rows(r2[1]).sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; }), logs = rows(r2[2]);
                var oppIds = ids(apps, "opportunity_id");
                return inList("opportunities", "id,title,company_id,location,type", "id", oppIds).then(function (o) {
                    var opps = by(rows(o));
                    var cids = ids(Object.keys(opps).map(function (k) { return opps[k]; }).concat(placements), "company_id");
                    return inList("companies", "id,name,industry,location", "id", cids).then(function (c) {
                        var d = { students: students, placements: placements, sups: sups, visits: visits, names: names,
                                  apps: apps, logs: logs, opps: opps, companies: by(rows(c)), studentMap: by(students), supMap: by(sups) };
                        I.derive(d);
                        I.data = d;
                        return d;
                    });
                });
            });
        });
    };

    I.derive = function (d) {
        d.placementByStudent = {}; d.placementMap = by(d.placements);
        d.placements.forEach(function (p) {
            if (p.status === "cancelled") { return; }
            if (!d.placementByStudent[p.student_id]) { d.placementByStudent[p.student_id] = p; }
        });
        d.appsByStudent = {};
        d.apps.forEach(function (a) { (d.appsByStudent[a.student_id] = d.appsByStudent[a.student_id] || []).push(a); });
        d.state = {};
        d.students.forEach(function (s) {
            var k = "none";
            if (d.placementByStudent[s.id]) { k = "placed"; }
            else {
                var mine = d.appsByStudent[s.id] || [];
                if (mine.some(function (a) { return a.status === "interview"; })) { k = "interview"; }
                else if (mine.some(function (a) { return a.status === "applied" || a.status === "reviewing"; })) { k = "applied"; }
            }
            d.state[s.id] = k;
        });
        d.count = { placed: 0, interview: 0, applied: 0, none: 0 };
        d.students.forEach(function (s) { d.count[d.state[s.id]]++; });
        d.toReview = d.logs.filter(function (l) { return l.status === "submitted"; });
        d.activePlacements = d.placements.filter(function (p) { return p.status === "active"; });
        d.unassigned = d.activePlacements.filter(function (p) { return !p.academic_supervisor_id; });
    };

    I.name = function (d, sid) { var p = d.names[sid]; return (p && (p.full_name || p.email)) || "Student"; };
    I.dept = function (d, sid) { var s = d.studentMap[sid]; return (s && (s.department || s.course)) || ""; };
    I.matric = function (d, sid) { var s = d.studentMap[sid]; return (s && s.matric_no) || ""; };
    I.company = function (d, p) { var c = p && d.companies[p.company_id]; return (c && c.name) || ""; };
    I.companyLoc = function (d, p) { var c = p && d.companies[p.company_id]; return (c && c.location) || ""; };

    I.csv = function (filename, head, body) {
        function cell(v) { v = String(v == null ? "" : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
        var text = [head].concat(body).map(function (r) { return r.map(cell).join(","); }).join("\r\n");
        var blob = new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = filename;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    };

    // Small modal used for viewing a logbook, logging a visit and so on.
    I.modal = function (html, onReady) {
        var ov = document.createElement("div");
        ov.className = "modal-overlay";
        ov.innerHTML = '<div class="modal-card" role="dialog" aria-modal="true"><button type="button" class="modal-close" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>' + html + "</div>";
        document.body.appendChild(ov);
        function close() { ov.remove(); document.removeEventListener("keydown", key); }
        function key(e) { if (e.key === "Escape") { close(); } }
        document.addEventListener("keydown", key);
        ov.addEventListener("click", function (e) { if (e.target === ov || e.target.closest(".modal-close")) { close(); } });
        if (onReady) { onReady(ov, close); }
        return close;
    };

    I.empty = function (icon, title, text) {
        return '<div class="empty-state"><i class="fa-solid ' + icon + '"></i><h4>' + title + "</h4><p>" + text + "</p></div>";
    };
    I.noStudents = function () {
        return I.empty("fa-user-graduate", "No students yet",
            "Students appear here when they choose " + I.esc(I.inst.name) + " as their school in their Placewick profile.");
    };
})();
