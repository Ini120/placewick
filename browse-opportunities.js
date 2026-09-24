// Placewick — Browse Opportunities
// Client-side filter/search/sort over the sample cards, plus a save toggle.
// "View & Apply" is a placeholder link for now — the actual apply flow
// (attaching a document from the vault) isn't built yet.

(function () {

    const grid = document.getElementById("browse-grid");
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll(".opp-card"));
    const searchInput = document.getElementById("browse-search-input");
    const categorySelect = document.getElementById("filter-category");
    const sortSelect = document.getElementById("filter-sort");
    const worktypeGroup = document.getElementById("filter-worktype");
    const paidCheckbox = document.getElementById("filter-paid");
    const resultCount = document.getElementById("browse-result-count");
    const emptyState = document.getElementById("browse-empty");

    let activeWorktype = "all";

    function applyFilters() {
        const query = (searchInput.value || "").trim().toLowerCase();
        const category = categorySelect.value;
        const paidOnly = paidCheckbox.checked;

        let visible = 0;

        cards.forEach(function (card) {
            const matchesQuery = !query || card.dataset.name.toLowerCase().includes(query);
            const matchesCategory = category === "all" || card.dataset.category === category;
            const matchesWorktype = activeWorktype === "all" || card.dataset.worktype === activeWorktype;
            const matchesPaid = !paidOnly || card.dataset.paid === "true";

            const show = matchesQuery && matchesCategory && matchesWorktype && matchesPaid;
            card.style.display = show ? "" : "none";

            if (show) visible += 1;
        });

        resultCount.textContent = visible + (visible === 1 ? " opportunity" : " opportunities");
        emptyState.hidden = visible !== 0;
        emptyState.classList.toggle("is-visible", visible === 0);

        applySort();
    }

    function applySort() {
        const sortBy = sortSelect.value;
        const sorted = cards.slice().sort(function (a, b) {
            if (sortBy === "match") {
                return Number(b.dataset.match) - Number(a.dataset.match);
            }
            if (sortBy === "newest") {
                return new Date(b.dataset.added) - new Date(a.dataset.added);
            }
            return a.dataset.name.localeCompare(b.dataset.name);
        });

        sorted.forEach(function (card) {
            grid.appendChild(card);
        });
    }

    searchInput.addEventListener("input", applyFilters);
    categorySelect.addEventListener("change", applyFilters);
    sortSelect.addEventListener("change", applyFilters);
    paidCheckbox.addEventListener("change", applyFilters);

    worktypeGroup.querySelectorAll(".browse-chip").forEach(function (chip) {
        chip.addEventListener("click", function () {
            worktypeGroup.querySelectorAll(".browse-chip").forEach(function (c) {
                c.classList.remove("is-active");
            });
            chip.classList.add("is-active");
            activeWorktype = chip.dataset.worktype;
            applyFilters();
        });
    });

    grid.addEventListener("click", function (event) {
        const saveButton = event.target.closest(".opp-save");
        if (!saveButton) return;

        const isSaved = saveButton.classList.toggle("is-saved");
        const icon = saveButton.querySelector("i");
        icon.className = isSaved ? "fa-solid fa-bookmark" : "fa-regular fa-bookmark";
    });

    applySort();

})();
