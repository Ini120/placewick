// Placewick: shared helpers for student pages (real data from Supabase).
(function () {
    "use strict";

    var A = window.placewickAuth;
    var sb = A && A.client;
    var S = { sb: sb };
    window.placewickStudent = S;

    S.esc = function (s) {
        return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    };
    S.initials = function (n) {
        var w = String(n || "").trim().split(/\s+/).filter(Boolean);
        if (!w.length) { return "?"; }
        return (w[0][0] + (w.length > 1 ? w[w.length - 1][0] : (w[0][1] || ""))).toUpperCase();
    };
    S.date = function (d) {
        return d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
    };
    S.ago = function (d) {
        var s = (Date.now() - new Date(d).getTime()) / 1000;
        if (s < 60) { return "just now"; }
        var m = Math.floor(s / 60);
        if (m < 60) { return m + " min ago"; }
        var h = Math.floor(m / 60);
        if (h < 24) { return h + (h === 1 ? " hour ago" : " hours ago"); }
        var dd = Math.floor(h / 24);
        if (dd < 30) { return dd + (dd === 1 ? " day ago" : " days ago"); }
        return S.date(d);
    };
    var STATUS = {
        applied: ["applied", "Applied"], reviewing: ["reviewing", "Reviewing"], interview: ["interview", "Interview"],
        accepted: ["accepted", "Accepted"], rejected: ["rejected", "Not Selected"], withdrawn: ["closed", "Withdrawn"]
    };
    S.badge = function (st) {
        var s = STATUS[st] || ["applied", st];
        return '<span class="status-badge ' + s[0] + '"><span class="dot"></span>' + S.esc(s[1]) + "</span>";
    };
    S.MODE = { "on-site": "On-site", hybrid: "Hybrid", remote: "Remote" };
    S.where = function (o) { return [o.location, S.MODE[o.work_mode]].filter(Boolean).join(", "); };
    S.paid = function (o) {
        var a = String(o.allowance || "").trim();
        return !!a && !/unpaid|^(none|nil|no|n\/a)$/i.test(a);
    };

    var toastTimer;
    S.toast = function (msg) {
        var el = document.getElementById("toast");
        if (!el) { return; }
        el.textContent = msg;
        el.classList.add("is-visible");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { el.classList.remove("is-visible"); }, 2800);
    };
    S.fail = function (msg) {
        var el = document.getElementById("page-error");
        if (el) { el.textContent = msg || "Something went wrong. Please refresh the page."; el.hidden = false; }
    };
    function never() { return new Promise(function () {}); }

    function chrome() {
        var name = S.profile.full_name || (S.profile.email || "").split("@")[0] || "Student";
        S.name = name;
        document.querySelectorAll(".sidebar-user-info h4").forEach(function (e) { e.textContent = name; });
        document.querySelectorAll(".sidebar-user-info span").forEach(function (e) { e.textContent = S.student.institution_name_other || "Student"; });
        document.querySelectorAll(".sidebar-avatar, .header-avatar").forEach(function (e) { e.textContent = S.initials(name); });
        document.querySelectorAll(".sidebar-logout").forEach(function (a) {
            a.addEventListener("click", function (e) {
                e.preventDefault();
                sb.auth.signOut().then(function () { location.href = "login.html"; });
            });
        });
    }

    S.init = function () {
        if (!sb) { S.fail("Sign-in is not connected yet."); return never(); }
        return sb.auth.getSession().then(function (r) {
            var session = r.data && r.data.session;
            if (!session) { location.href = "login.html"; return never(); }
            var uid = session.user.id;
            return sb.from("profiles").select("role,full_name,email,phone").eq("id", uid).maybeSingle().then(function (p) {
                if (!p.data || p.data.role !== "student") { A.route(); return never(); }
                return sb.from("students").select("*").eq("id", uid).maybeSingle().then(function (st) {
                    if (!st.data) { S.fail("We could not load your student profile."); return never(); }
                    S.user = session.user; S.profile = p.data; S.student = st.data;
                    chrome();
                    return S.student;
                });
            });
        });
    };

    function companiesFor(opps) {
        var ids = Array.from(new Set(opps.map(function (o) { return o.company_id; })));
        if (!ids.length) { return Promise.resolve({}); }
        return sb.from("companies").select("id,name,industry").in("id", ids).then(function (c) {
            var by = {}; (c.data || []).forEach(function (x) { by[x.id] = x; });
            return by;
        });
    }
    function attach(opps, by) {
        return opps.filter(function (o) { return by[o.company_id]; }).map(function (o) {
            o.company_name = by[o.company_id].name; o.industry = by[o.company_id].industry; return o;
        });
    }

    // Open opportunities from verified companies that have not passed their deadline.
    S.loadOpps = function () {
        var today = new Date().toISOString().slice(0, 10);
        return sb.from("opportunities").select("*").eq("status", "open").order("created_at", { ascending: false }).then(function (r) {
            if (r.error) { throw r.error; }
            var opps = (r.data || []).filter(function (o) { return !o.deadline || o.deadline >= today; });
            return companiesFor(opps).then(function (by) { return attach(opps, by); });
        });
    };

    // My applications, each with its opportunity and company.
    S.loadApps = function () {
        return sb.from("applications").select("id,opportunity_id,status,cover_note,created_at").eq("student_id", S.user.id).order("created_at", { ascending: false }).then(function (a) {
            if (a.error) { throw a.error; }
            var apps = a.data || [];
            var ids = apps.map(function (x) { return x.opportunity_id; });
            if (!ids.length) { return []; }
            return sb.from("opportunities").select("*").in("id", ids).then(function (o) {
                var opps = o.data || [];
                return companiesFor(opps).then(function (by) {
                    var om = {}; opps.forEach(function (x) { om[x.id] = x; });
                    return apps.map(function (ap) {
                        var op = om[ap.opportunity_id] || {};
                        var c = by[op.company_id] || {};
                        ap.title = op.title || "Opportunity"; ap.company_name = c.name || "Company";
                        ap.location = S.where(op); ap.opp = op;
                        return ap;
                    });
                });
            });
        });
    };

    S.loadSavedIds = function () {
        return sb.from("saved_opportunities").select("opportunity_id").eq("student_id", S.user.id).then(function (r) {
            return (r.data || []).map(function (x) { return x.opportunity_id; });
        });
    };

    S.toggleSave = function (oid, makeSaved) {
        if (makeSaved) { return sb.from("saved_opportunities").insert({ student_id: S.user.id, opportunity_id: oid }); }
        return sb.from("saved_opportunities").delete().eq("student_id", S.user.id).eq("opportunity_id", oid);
    };

    // Share of the posting's wanted skills that the student already lists.
    S.match = function (o) {
        var want = (o.skills || []).map(function (x) { return String(x).toLowerCase(); });
        var have = ((S.student && S.student.skills) || []).map(function (x) { return String(x).toLowerCase(); });
        if (!want.length || !have.length) { return null; }
        var n = want.filter(function (x) { return have.indexOf(x) !== -1; }).length;
        return n ? Math.round(n / want.length * 100) : null;
    };

    S.card = function (o, saved, applied) {
        var m = S.match(o), paid = S.paid(o), w = S.where(o);
        return '<article class="opp-card" data-id="' + o.id + '">' +
            '<div class="opp-card-top"><div class="opp-logo">' + S.esc(S.initials(o.company_name)) + "</div>" +
            '<button type="button" class="opp-save' + (saved ? " is-saved" : "") + '" data-save="' + o.id + '" aria-label="' + (saved ? "Remove from saved" : "Save opportunity") + '"><i class="' + (saved ? "fa-solid" : "fa-regular") + ' fa-bookmark"></i></button></div>' +
            (m ? '<span class="opp-match">' + m + "% match</span>" : "") +
            "<h3>" + S.esc(o.title) + "</h3>" +
            '<div class="opp-company">' + S.esc(o.company_name) + ' <i class="fa-solid fa-circle-check verified-badge" title="Verified company"></i></div>' +
            '<div class="opp-tags">' +
            '<span class="opp-tag">' + (o.type === "siwes" ? "SIWES" : "Internship") + "</span>" +
            (w ? '<span class="opp-tag"><i class="fa-solid fa-location-dot"></i> ' + S.esc(w) + "</span>" : "") +
            (o.allowance ? '<span class="opp-tag' + (paid ? " paid" : "") + '"><i class="fa-solid fa-sack-dollar"></i> ' + S.esc(paid ? o.allowance : "Unpaid") + "</span>" : "") +
            "</div>" +
            '<p class="opp-desc">' + S.esc(String(o.description || "").slice(0, 140)) + (String(o.description || "").length > 140 ? "..." : "") + "</p>" +
            (applied ? '<a href="applications.html" class="opp-apply is-applied">Applied</a>' : '<a href="#" class="opp-apply" data-open="' + o.id + '">View &amp; Apply</a>') +
            "</article>";
    };

    // Details and apply dialog.
    S.openModal = function (o, applied, onApplied) {
        var old = document.getElementById("apply-modal");
        if (old) { old.remove(); }
        var m = S.match(o), w = S.where(o);
        var rows = [["Type", o.type === "siwes" ? "SIWES (industrial training)" : "Internship"], ["Location", w], ["Duration", o.duration], ["Allowance", o.allowance], ["Deadline", o.deadline ? S.date(o.deadline) : "No deadline"]]
            .filter(function (r) { return r[1]; })
            .map(function (r) { return "<li><span>" + r[0] + "</span><strong>" + S.esc(r[1]) + "</strong></li>"; }).join("");
        var skills = (o.skills || []).map(function (x) { return '<span class="opp-tag">' + S.esc(x) + "</span>"; }).join("");
        var el = document.createElement("div");
        el.id = "apply-modal"; el.className = "modal-overlay";
        el.innerHTML = '<div class="modal-card" role="dialog" aria-modal="true" aria-label="' + S.esc(o.title) + '">' +
            '<button type="button" class="modal-close" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>' +
            '<div class="modal-head"><div class="opp-logo">' + S.esc(S.initials(o.company_name)) + "</div><div><h2>" + S.esc(o.title) + "</h2><p>" + S.esc(o.company_name) + (m ? " &middot; " + m + "% match" : "") + "</p></div></div>" +
            '<ul class="modal-facts">' + rows + "</ul>" +
            '<h4>About this role</h4><p class="modal-desc">' + S.esc(o.description || "No description provided.") + "</p>" +
            (skills ? '<h4>Skills wanted</h4><div class="opp-tags">' + skills + "</div>" : "") +
            (applied
                ? '<div class="modal-applied">You have already applied to this opportunity.</div>'
                : '<h4>Cover note <span class="optional">(optional)</span></h4><textarea id="cover-note" maxlength="1500" placeholder="Tell the company why you are a good fit."></textarea>' +
                  '<div class="modal-error" id="modal-error" hidden></div>' +
                  '<div class="modal-actions"><button type="button" class="btn btn-primary" id="submit-apply">Submit application</button></div>') +
            "</div>";
        document.body.appendChild(el);
        function close() { el.remove(); document.removeEventListener("keydown", esc); }
        function esc(e) { if (e.key === "Escape") { close(); } }
        document.addEventListener("keydown", esc);
        el.addEventListener("click", function (e) { if (e.target === el || e.target.closest(".modal-close")) { close(); } });
        var submit = el.querySelector("#submit-apply");
        if (submit) {
            submit.addEventListener("click", function () {
                var err = el.querySelector("#modal-error"); err.hidden = true;
                submit.disabled = true; submit.textContent = "Submitting...";
                sb.from("applications").insert({
                    opportunity_id: o.id, student_id: S.user.id,
                    cover_note: (el.querySelector("#cover-note").value || "").trim() || null
                }).then(function (r) {
                    if (r.error) {
                        submit.disabled = false; submit.textContent = "Submit application";
                        err.textContent = r.error.code === "23505" ? "You have already applied to this opportunity." : "We could not submit your application. Please try again.";
                        err.hidden = false; return;
                    }
                    close(); S.toast("Application submitted");
                    if (onApplied) { onApplied(o.id); }
                });
            });
        }
    };

    S.badges = function () {
        return sb.from("applications").select("status").eq("student_id", S.user.id).then(function (r) {
            var n = (r.data || []).filter(function (a) { return ["applied", "reviewing", "interview"].indexOf(a.status) !== -1; }).length;
            document.querySelectorAll('[data-badge="apps"]').forEach(function (e) { e.textContent = n; e.hidden = !n; });
        });
    };
})();
