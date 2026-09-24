// Placewick — Settings
// Client-side only: switches between setting sections, "saves" each section
// with a confirmation message, and confirms before the two danger-zone
// actions. Nothing here calls a real backend or actually deletes anything.

(function () {

    const nav = document.getElementById("settings-nav");
    if (!nav) return;

    const navItems = Array.from(nav.querySelectorAll(".settings-nav-item"));
    const sections = Array.from(document.querySelectorAll(".settings-section"));

    navItems.forEach(function (item) {
        item.addEventListener("click", function () {
            navItems.forEach(function (i) {
                i.classList.remove("is-active");
            });
            item.classList.add("is-active");

            const target = item.dataset.section;
            sections.forEach(function (section) {
                section.hidden = section.id !== "section-" + target;
            });
        });
    });

    document.querySelectorAll(".settings-save").forEach(function (button) {
        button.addEventListener("click", function () {
            const status = document.querySelector(
                '.profile-save-status[data-status-for="' + button.dataset.section + '"]'
            );
            if (!status) return;

            status.textContent = "Saved just now";
            status.classList.add("is-visible");

            clearTimeout(status._timer);
            status._timer = setTimeout(function () {
                status.classList.remove("is-visible");
            }, 2500);
        });
    });

    const deactivateButton = document.getElementById("deactivate-button");
    if (deactivateButton) {
        deactivateButton.addEventListener("click", function () {
            const confirmed = window.confirm(
                "Deactivate your Placewick account? Your profile and applications will be hidden until you log back in."
            );
            if (confirmed) {
                deactivateButton.textContent = "Deactivated";
                deactivateButton.disabled = true;
            }
        });
    }

    const deleteButton = document.getElementById("delete-button");
    if (deleteButton) {
        deleteButton.addEventListener("click", function () {
            const confirmed = window.confirm(
                "Delete your Placewick account permanently? This cannot be undone."
            );
            if (confirmed) {
                deleteButton.textContent = "Account deleted";
                deleteButton.disabled = true;
            }
        });
    }

})();
