// Placewick: shared behaviour for About, How It Works, Resources and Careers.
// (Scroll reveal itself is handled by script.js via the .reveal class.)

document.addEventListener("DOMContentLoaded", function () {

    /* ---------- Scroll progress + back to top ---------- */

    const bar = document.getElementById("scroll-progress");
    const toTop = document.getElementById("to-top");

    function onScroll() {
        const h = document.documentElement;
        const max = h.scrollHeight - h.clientHeight;
        const p = max > 0 ? h.scrollTop / max : 0;
        if (bar) { bar.style.transform = "scaleX(" + p + ")"; }
        if (toTop) { toTop.classList.toggle("is-visible", h.scrollTop > 600); }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    if (toTop) {
        toTop.addEventListener("click", function () {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    /* ---------- Tabs (How It Works) ---------- */

    const tabs = document.getElementById("hiw-tabs");
    if (tabs) {
        const buttons = Array.from(tabs.querySelectorAll(".tab-btn"));
        const panels = Array.from(document.querySelectorAll(".tab-panel"));

        function show(name) {
            buttons.forEach(function (b) { b.classList.toggle("is-active", b.dataset.tab === name); });
            panels.forEach(function (p) {
                const on = p.dataset.panel === name;
                p.classList.toggle("is-active", on);
                if (on) {
                    // reveal items inside a newly shown panel straight away
                    p.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("is-visible"); });
                }
            });
        }

        tabs.addEventListener("click", function (e) {
            const b = e.target.closest(".tab-btn");
            if (b) {
                show(b.dataset.tab);
                try { history.replaceState(null, "", "#" + b.dataset.tab); } catch (err) { /* ignore */ }
            }
        });

        const hash = (location.hash || "").replace("#", "");
        if (["students", "companies", "institutions"].indexOf(hash) !== -1) { show(hash); }
    }

    /* ---------- Resources: search, filter, dialog ---------- */

    const grid = document.getElementById("res-grid");
    if (grid) {
        const cards = Array.from(grid.querySelectorAll(".res-card"));
        const chips = document.getElementById("res-chips");
        const search = document.getElementById("res-search");
        const empty = document.getElementById("res-empty");
        let cat = "all";

        function apply() {
            const q = (search && search.value || "").trim().toLowerCase();
            let n = 0;
            cards.forEach(function (c) {
                const ok = (cat === "all" || c.dataset.cat === cat) && (!q || c.dataset.text.indexOf(q) !== -1);
                c.style.display = ok ? "" : "none";
                if (ok) { n += 1; }
            });
            if (empty) { empty.hidden = n !== 0; }
        }

        if (search) { search.addEventListener("input", apply); }

        if (chips) {
            chips.addEventListener("click", function (e) {
                const b = e.target.closest(".chip");
                if (!b) { return; }
                cat = b.dataset.cat;
                chips.querySelectorAll(".chip").forEach(function (c) { c.classList.toggle("is-active", c === b); });
                apply();
            });
        }

        const dialog = document.getElementById("res-dialog");
        const body = document.getElementById("res-dialog-body");
        const close = document.getElementById("res-close");

        function openCard(card) {
            if (!dialog || !body) { return; }
            body.innerHTML = card.querySelector(".res-full").innerHTML;
            if (typeof dialog.showModal === "function") { dialog.showModal(); } else { dialog.setAttribute("open", ""); }
        }

        cards.forEach(function (c) {
            c.addEventListener("click", function () { openCard(c); });
            c.addEventListener("keydown", function (e) {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openCard(c); }
            });
        });

        if (close && dialog) {
            close.addEventListener("click", function () { dialog.close(); });
            dialog.addEventListener("click", function (e) { if (e.target === dialog) { dialog.close(); } });
        }
    }

    /* ---------- Resources: checklist (saved on this device) ---------- */

    const list = document.getElementById("chk-list");
    if (list) {
        const boxes = Array.from(list.querySelectorAll("input[type=checkbox]"));
        const fill = document.getElementById("chk-fill");
        const count = document.getElementById("chk-count");
        const KEY = "placewickChecklist";
        let saved = [];

        try { saved = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (err) { saved = []; }

        boxes.forEach(function (b, i) { b.checked = saved.indexOf(i) !== -1; });

        function update(persist) {
            const done = boxes.reduce(function (acc, b, i) { if (b.checked) { acc.push(i); } return acc; }, []);
            if (fill) { fill.style.width = (done.length / boxes.length * 100) + "%"; }
            if (count) { count.textContent = done.length + " of " + boxes.length; }
            if (persist) {
                try { localStorage.setItem(KEY, JSON.stringify(done)); } catch (err) { /* ignore */ }
            }
        }

        list.addEventListener("change", function () { update(true); });
        update(false);
    }

    /* ---------- Careers: express-interest form opens an email ---------- */

    const form = document.getElementById("interest-form");
    if (form) {
        form.addEventListener("submit", function (e) {
            e.preventDefault();
            const name = document.getElementById("int-name").value.trim();
            const area = document.getElementById("int-area").value;
            const msg = document.getElementById("int-msg").value.trim();
            const subject = "Careers: " + area + " (" + name + ")";
            const text = "Name: " + name + "\nArea: " + area + "\n\n" + msg + "\n\n(Please attach your CV or portfolio.)";
            window.location.href = "mailto:hello@placewick.com?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(text);
        });
    }

});
