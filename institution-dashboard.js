// Placewick: institution dashboard interactions (prototype, no backend yet)
(function () {

    document.addEventListener("DOMContentLoaded", function () {
        wireToast();
        wirePlacements();
        wireTabs();
        wireReview();
        wireAssign();
    });

    let toastTimer;

    function toast(message) {
        const el = document.getElementById("toast");
        if (!el) { return; }
        el.textContent = message;
        el.classList.add("is-visible");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { el.classList.remove("is-visible"); }, 2600);
    }

    function wireToast() {
        document.addEventListener("click", function (e) {
            const t = e.target.closest("[data-toast]");
            if (t) { toast(t.dataset.toast); }
        });
    }

    function wirePlacements() {
        const table = document.getElementById("placement-table");
        if (!table) { return; }

        const rows = Array.from(table.querySelectorAll("tbody tr"));
        const search = document.getElementById("placement-search");
        const filters = document.getElementById("placement-filters");
        const empty = document.getElementById("placement-empty");
        const count = document.getElementById("placement-count");
        let status = "all";

        function apply() {
            const q = search.value.trim().toLowerCase();
            let n = 0;
            rows.forEach(function (r) {
                const ok = (status === "all" || r.dataset.status === status) &&
                           (!q || r.dataset.search.indexOf(q) !== -1);
                r.style.display = ok ? "" : "none";
                if (ok) { n += 1; }
            });
            empty.classList.toggle("is-visible", n === 0);
            count.textContent = "Showing " + n + " student" + (n === 1 ? "" : "s");
        }

        search.addEventListener("input", apply);
        filters.addEventListener("click", function (e) {
            const b = e.target.closest(".chip");
            if (!b) { return; }
            status = b.dataset.filter;
            filters.querySelectorAll(".chip").forEach(function (c) { c.classList.toggle("is-active", c === b); });
            apply();
        });
    }

    function wireTabs() {
        const tabs = document.getElementById("log-tabs");
        if (!tabs) { return; }
        tabs.addEventListener("click", function (e) {
            const b = e.target.closest(".tab");
            if (!b) { return; }
            tabs.querySelectorAll(".tab").forEach(function (t) { t.classList.toggle("is-active", t === b); });
            document.querySelectorAll(".tab-panel").forEach(function (p) {
                p.hidden = p.id !== "tab-" + b.dataset.tab;
            });
        });
    }

    function wireReview() {
        document.addEventListener("click", function (e) {
            const b = e.target.closest("[data-resolve]");
            if (!b) { return; }
            const row = b.closest(".review-row");
            const approved = b.dataset.resolve === "approved";
            row.classList.add("is-resolved");
            const tag = row.querySelector(".resolved-tag");
            tag.hidden = false;
            tag.className = "status-badge resolved-tag " + (approved ? "placed" : "rejected");
            tag.innerHTML = '<span class="dot"></span>' + (approved ? "Approved" : "Returned");
            toast(approved ? "Approved" : "Returned to student for changes");
        });
    }

    function wireAssign() {
        function assignRow(row, name) {
            row.classList.add("is-assigned");
            row.querySelector(".assigned-name").textContent = name;
        }

        document.addEventListener("click", function (e) {
            const b = e.target.closest("[data-assign]");
            if (!b) { return; }
            const row = b.closest(".assign-row");
            const sel = row.querySelector("select");
            if (!sel.value) { toast("Choose a supervisor first"); return; }
            assignRow(row, sel.value);
            toast("Supervisor assigned");
        });

        const auto = document.getElementById("auto-assign");
        if (auto) {
            auto.addEventListener("click", function () {
                document.querySelectorAll(".assign-row:not(.is-assigned)").forEach(function (row) {
                    const hint = row.querySelector(".hint").textContent.replace(/^\s*Suggested:\s*/, "").trim();
                    assignRow(row, hint);
                });
                toast("Assigned by location");
            });
        }
    }

})();
