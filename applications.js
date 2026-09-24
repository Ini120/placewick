// Placewick — My Applications
// Filters the application rows by status tab and by the header search box.

(function () {

    const list = document.getElementById("applications-list");
    if (!list) return;

    const tabsWrap = document.getElementById("status-tabs");
    const searchInput = document.getElementById("app-search");
    const emptyState = document.getElementById("applications-empty");
    const rows = Array.from(list.querySelectorAll(".application-row"));

    let activeStatus = "all";

    function updateVisibility() {
        const query = (searchInput && searchInput.value || "").trim().toLowerCase();
        let visible = 0;

        rows.forEach(function (row) {
            const matchesStatus = activeStatus === "all" || row.dataset.status === activeStatus;
            const matchesQuery = !query || row.dataset.name.toLowerCase().includes(query);
            const show = matchesStatus && matchesQuery;

            row.style.display = show ? "" : "none";

            if (show) visible += 1;
        });

        if (emptyState) {
            emptyState.hidden = visible !== 0;
        }
    }

    if (tabsWrap) {
        tabsWrap.querySelectorAll(".status-tab").forEach(function (tab) {
            tab.addEventListener("click", function () {
                tabsWrap.querySelectorAll(".status-tab").forEach(function (t) {
                    t.classList.remove("is-active");
                });
                tab.classList.add("is-active");
                activeStatus = tab.dataset.status;
                updateVisibility();
            });
        });
    }

    if (searchInput) {
        searchInput.addEventListener("input", updateVisibility);
    }

    updateVisibility();

})();
