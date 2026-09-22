// Placewick — Dashboard mobile sidebar
// Shared by applicant-dashboard.html and company-dashboard.html

(function () {

    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    const openButton = document.getElementById("menu-toggle");
    const closeButton = document.getElementById("sidebar-close");

    if (!sidebar || !overlay || !openButton || !closeButton) {
        return;
    }

    function openSidebar() {
        sidebar.classList.add("is-open");
        overlay.classList.add("is-open");
        document.body.style.overflow = "hidden";
    }

    function closeSidebar() {
        sidebar.classList.remove("is-open");
        overlay.classList.remove("is-open");
        document.body.style.overflow = "";
    }

    openButton.addEventListener("click", openSidebar);
    closeButton.addEventListener("click", closeSidebar);
    overlay.addEventListener("click", closeSidebar);

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            closeSidebar();
        }
    });

    // Close the sidebar after tapping a nav link on mobile
    sidebar.querySelectorAll(".sidebar-link, .sidebar-logout").forEach(function (link) {
        link.addEventListener("click", closeSidebar);
    });

})();
