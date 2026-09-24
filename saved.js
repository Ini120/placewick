// Placewick — Saved Opportunities
// Search over the saved cards, plus an "unsave" (remove card) action —
// clicking the filled bookmark on a saved card removes it from this page.

(function () {

    const grid = document.getElementById("saved-grid");
    if (!grid) return;

    const searchInput = document.getElementById("saved-search-input");
    const resultCount = document.getElementById("saved-result-count");
    const emptyState = document.getElementById("saved-empty");

    function updateCount() {
        const total = grid.querySelectorAll(".opp-card").length;
        resultCount.textContent = total + (total === 1 ? " saved opportunity" : " saved opportunities");
        resultCount.style.display = total === 0 ? "none" : "";
        emptyState.classList.toggle("is-visible", total === 0);
        emptyState.style.display = total === 0 ? "block" : "none";
    }

    function applyFilters() {
        const query = (searchInput.value || "").trim().toLowerCase();
        const cards = Array.from(grid.querySelectorAll(".opp-card"));
        let visible = 0;

        cards.forEach(function (card) {
            const show = !query || card.dataset.name.toLowerCase().includes(query);
            card.style.display = show ? "" : "none";
            if (show) visible += 1;
        });

        resultCount.textContent = visible + (visible === 1 ? " saved opportunity" : " saved opportunities");
    }

    searchInput.addEventListener("input", applyFilters);

    grid.addEventListener("click", function (event) {
        const saveButton = event.target.closest(".opp-save");
        if (!saveButton) return;

        const card = saveButton.closest(".opp-card");
        card.style.opacity = "0";
        setTimeout(function () {
            card.remove();
            updateCount();
        }, 150);
    });

    emptyState.style.display = "none";

})();
