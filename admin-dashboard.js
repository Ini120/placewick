// Placewick — Admin dashboard access guard + interactions
//
// ACCESS MODEL (prototype stage):
// Every admin-*.html page is meant to be reached only through
// admin-login.html, never linked from the public site or the student/
// company dashboards. This script checks for a sessionStorage flag set
// by admin-login.js; if it's missing, this tab never went through the
// (demo) sign-in step, so we bounce back to admin-login.html.
//
// This is NOT real access control — sessionStorage is fully readable
// and writable by anyone with devtools, and nothing here talks to a
// server. It only stops a page from silently rendering admin data when
// someone hasn't gone through the login screen. Once there's a real
// backend, this whole check should be replaced by a server-side
// requirement (a valid session/JWT with an admin role, verified on
// every request, with the login screen actually checking credentials).

(function () {

    let isAdminSession = false;

    try {
        isAdminSession = sessionStorage.getItem("placewickAdminSession") === "true";
    } catch (err) {
        // sessionStorage unavailable — fail closed and send to login.
        isAdminSession = false;
    }

    if (!isAdminSession) {
        window.location.replace("admin-login.html");
        return;
    }

    document.addEventListener("DOMContentLoaded", init);

    function init() {

        wireLogout();
        wireVerifyFilters();
        wireVerifyActions();

    }

    function wireLogout() {
        const logoutLink = document.getElementById("admin-logout");
        if (!logoutLink) {
            return;
        }

        logoutLink.addEventListener("click", function () {
            try {
                sessionStorage.removeItem("placewickAdminSession");
                sessionStorage.removeItem("placewickAdminEmail");
            } catch (err) {
                // ignore — navigation to admin-login.html still happens
            }
        });
    }

    function wireVerifyFilters() {
        const filterBar = document.getElementById("verify-filters");
        const list = document.getElementById("verify-list");
        const emptyState = document.getElementById("verify-empty");

        if (!filterBar || !list) {
            return;
        }

        const filterButtons = Array.from(filterBar.querySelectorAll(".panel-filter"));
        const rows = Array.from(list.querySelectorAll(".verify-row"));

        filterBar.addEventListener("click", function (event) {
            const button = event.target.closest(".panel-filter");
            if (!button) {
                return;
            }

            filterButtons.forEach(function (btn) {
                btn.classList.toggle("is-active", btn === button);
            });

            const filter = button.dataset.filter;
            let visibleCount = 0;

            rows.forEach(function (row) {
                const matches = filter === "all" || row.dataset.type === filter;
                row.style.display = matches ? "" : "none";
                if (matches) {
                    visibleCount += 1;
                }
            });

            if (emptyState) {
                emptyState.style.display = visibleCount === 0 ? "block" : "none";
            }
        });
    }

    function wireVerifyActions() {
        const list = document.getElementById("verify-list");
        if (!list) {
            return;
        }

        list.addEventListener("click", function (event) {
            const button = event.target.closest("[data-action]");
            if (!button) {
                return;
            }

            const row = button.closest(".verify-row");
            if (!row) {
                return;
            }

            const action = button.dataset.action;

            row.classList.add("is-resolved");

            const resolvedTag = row.querySelector(".verify-resolved-tag");
            if (resolvedTag) {
                const isApproved = action === "approve";
                resolvedTag.classList.toggle("approved", isApproved);
                resolvedTag.classList.toggle("rejected", !isApproved);
                resolvedTag.innerHTML = isApproved
                    ? '<i class="fa-solid fa-circle-check"></i> Approved'
                    : '<i class="fa-solid fa-circle-xmark"></i> Rejected';
            }
        });
    }

})();
