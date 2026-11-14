// Placewick: saves onboarding answers to Supabase (company setup and student steps).
(function () {
    "use strict";

    var A = window.placewickAuth;
    var page = location.pathname.split("/").pop() || "";

    function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; }
    function label(id) {
        var el = document.getElementById(id);
        if (!el) { return ""; }
        if (el.tagName === "SELECT") { return el.selectedIndex > 0 ? el.options[el.selectedIndex].text.trim() : ""; }
        return el.value.trim();
    }
    function picked(selector) {
        return Array.prototype.map.call(document.querySelectorAll(selector + ".selected"), function (c) { return c.dataset.value; });
    }
    function tags() {
        return Array.prototype.map.call(document.querySelectorAll("#skill-tags .skill-tag"), function (t) {
            return t.firstChild ? t.firstChild.textContent.trim() : "";
        }).filter(Boolean);
    }
    function banner(text) {
        var form = document.querySelector("form") || document.body;
        var el = document.querySelector(".form-message");
        if (!el) {
            el = document.createElement("div");
            el.className = "form-message";
            el.setAttribute("role", "alert");
            var cb = document.querySelector(".continue-button");
            var nav = (cb && cb.parentNode) || form.lastElementChild;
            nav.parentNode.insertBefore(el, nav);
        }
        el.className = "form-message is-error";
        el.textContent = text;
        el.style.display = text ? "block" : "none";
    }

    // What each page saves. Each returns a promise that resolves to an error (or null).
    var steps = {
        "graduate-onboarding.html": function (sb, uid) {
            var name = (val("first-name") + " " + val("last-name")).trim();
            return Promise.all([
                sb.from("profiles").update({ full_name: name }).eq("id", uid),
                sb.from("students").update({ age_range: val("age") }).eq("id", uid)
            ]);
        },
        "graduate-education.html": function (sb, uid) {
            return sb.from("students").update({
                institution_name_other: label("institution"),
                degree: label("degree"),
                course: val("course"),
                class_of_degree: label("class-of-degree"),
                graduation_year: label("graduation-year")
            }).eq("id", uid);
        },
        "graduate-opportunities.html": function (sb, uid) {
            return sb.from("students").update({ opportunity_types: picked(".opportunity-card") }).eq("id", uid);
        },
        "graduate-skills.html": function (sb, uid) {
            return sb.from("students").update({ skills: tags(), interests: picked(".interest-card") }).eq("id", uid);
        },
        "graduate-preferences.html": function (sb, uid) {
            return sb.from("students").update({
                location_pref: label("preferred-state"),
                work_mode_pref: label("work-type"),
                relocation: label("relocation"),
                onboarded_at: new Date().toISOString()
            }).eq("id", uid);
        },
        "company-onboarding.html": function (sb, uid, opts) {
            var row = {
                name: val("company-name"),
                industry: label("industry"),
                website: val("website") || null
            };
            if (opts.withVerification) {
                row.rc_number = val("rc-number") || null;
                row.official_email = val("official-email") || null;
            }
            return sb.from("companies").select("id").eq("owner_id", uid).maybeSingle().then(function (r) {
                if (r.error) { return r; }
                if (r.data) { return sb.from("companies").update(row).eq("owner_id", uid); }
                row.owner_id = uid;
                return sb.from("companies").insert(row);
            });
        }
    };

    var save = steps[page];
    if (!save) { return; }
    if (!A || !A.client) { return; }
    var sb = A.client;

    function go(link, opts) {
        var form = document.querySelector("form");
        if (form && !form.reportValidity()) { return; }
        banner("");
        sb.auth.getUser().then(function (r) {
            var user = r.data && r.data.user;
            if (!user) { location.href = "login.html"; return; }
            return Promise.resolve(save(sb, user.id, opts)).then(function (res) {
                var results = Array.isArray(res) ? res : [res];
                var failed = results.filter(function (x) { return x && x.error; })[0];
                if (failed) { banner("We could not save this step. Please try again."); return; }
                location.href = link.getAttribute("href");
            });
        }).catch(function () { banner("Something went wrong. Please try again."); });
    }

    document.addEventListener("click", function (e) {
        var cont = e.target.closest(".continue-button");
        if (cont && cont.closest("form, .onboarding-buttons, .onboarding-actions, main")) {
            e.preventDefault();
            go(cont, { withVerification: true });
            return;
        }
        var skip = e.target.closest(".skip-link");
        if (skip) {
            e.preventDefault();
            go(skip, { withVerification: false });
        }
    });

    // Anyone who is not logged in goes to the login page.
    sb.auth.getSession().then(function (r) { if (!(r.data && r.data.session)) { location.href = "login.html"; } });
})();
