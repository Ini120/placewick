// Placewick — Document Vault
// Client-side only: files picked here are NOT uploaded anywhere or persisted.
// This wires up the interactions (filtering, drag/drop, default CV, delete)
// against the sample rows so the page is demoable; a real backend would
// replace addDocRow()'s local handling with an actual upload call.

(function () {

    const vaultList = document.getElementById("vault-list");
    const vaultEmpty = document.getElementById("vault-empty");
    const vaultFilters = document.getElementById("vault-filters");
    const docCount = document.getElementById("doc-count");
    const docSearch = document.getElementById("doc-search");
    const uploadZone = document.getElementById("upload-zone");
    const fileInput = document.getElementById("file-input");
    const browseButton = document.getElementById("upload-browse-button");

    if (!vaultList) {
        return;
    }

    let activeCategory = "all";

    function formatSize(bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    }

    function iconForFile(name) {
        return /\.docx?$/i.test(name) ? "doc" : "pdf";
    }

    function faIconForFile(name) {
        return /\.docx?$/i.test(name) ? "fa-file-word" : "fa-file-pdf";
    }

    function updateVisibility() {
        const rows = vaultList.querySelectorAll(".doc-row");
        const query = (docSearch && docSearch.value || "").trim().toLowerCase();
        let visibleCount = 0;

        rows.forEach(function (row) {
            const matchesCategory = activeCategory === "all" || row.dataset.category === activeCategory;
            const name = row.querySelector(".doc-details h4").textContent.toLowerCase();
            const matchesSearch = !query || name.includes(query);
            const visible = matchesCategory && matchesSearch;

            row.style.display = visible ? "" : "none";

            if (visible) visibleCount += 1;
        });

        if (vaultEmpty) {
            vaultEmpty.classList.toggle("is-visible", visibleCount === 0);
            vaultEmpty.hidden = visibleCount !== 0;
        }

        if (docCount) {
            docCount.textContent = String(vaultList.querySelectorAll(".doc-row").length);
        }
    }

    // Category filter tabs
    if (vaultFilters) {
        vaultFilters.querySelectorAll(".vault-filter").forEach(function (button) {
            button.addEventListener("click", function () {
                vaultFilters.querySelectorAll(".vault-filter").forEach(function (b) {
                    b.classList.remove("is-active");
                });
                button.classList.add("is-active");
                activeCategory = button.dataset.category;
                updateVisibility();
            });
        });
    }

    // Search
    if (docSearch) {
        docSearch.addEventListener("input", updateVisibility);
    }

    // Default CV star (only one CV can be default)
    vaultList.addEventListener("click", function (event) {
        const star = event.target.closest(".doc-default-star");
        if (star && !star.disabled) {
            const row = star.closest(".doc-row");
            if (row.dataset.category !== "cv") return;

            vaultList.querySelectorAll('.doc-row[data-category="cv"] .doc-default-star').forEach(function (s) {
                s.classList.remove("is-default");
                s.querySelector("i").className = "fa-regular fa-star";
            });

            star.classList.add("is-default");
            star.querySelector("i").className = "fa-solid fa-star";
            return;
        }

        const deleteButton = event.target.closest(".doc-action-button.danger");
        if (deleteButton) {
            const row = deleteButton.closest(".doc-row");
            row.style.opacity = "0";
            setTimeout(function () {
                row.remove();
                updateVisibility();
            }, 150);
        }
    });

    // Add a new row from a picked/dropped File
    function addDocRow(file) {
        const category = "other";
        const iconClass = iconForFile(file.name);
        const faIcon = faIconForFile(file.name);

        const row = document.createElement("div");
        row.className = "doc-row is-new";
        row.dataset.category = category;
        row.innerHTML =
            '<div class="doc-icon ' + iconClass + '"><i class="fa-solid ' + faIcon + '"></i></div>' +
            '<div class="doc-details"><h4></h4><span>' + formatSize(file.size) + ' &middot; Uploaded just now</span></div>' +
            '<span class="doc-category-badge other">Other</span>' +
            '<button type="button" class="doc-default-star" disabled aria-label="Only CVs can be set as default" title="Only CVs can be set as default"><i class="fa-regular fa-star"></i></button>' +
            '<div class="doc-actions">' +
            '<button type="button" class="doc-action-button" aria-label="Download"><i class="fa-solid fa-arrow-down-to-line"></i></button>' +
            '<button type="button" class="doc-action-button danger" aria-label="Delete"><i class="fa-solid fa-trash-can"></i></button>' +
            '</div>';

        row.querySelector(".doc-details h4").textContent = file.name;
        vaultList.prepend(row);
    }

    function handleFiles(fileList) {
        Array.from(fileList).forEach(addDocRow);
        updateVisibility();
    }

    if (browseButton && fileInput) {
        browseButton.addEventListener("click", function () {
            fileInput.click();
        });

        fileInput.addEventListener("change", function () {
            if (fileInput.files.length) {
                handleFiles(fileInput.files);
                fileInput.value = "";
            }
        });
    }

    if (uploadZone) {
        uploadZone.addEventListener("click", function (event) {
            if (event.target === uploadZone) {
                fileInput.click();
            }
        });

        ["dragenter", "dragover"].forEach(function (evt) {
            uploadZone.addEventListener(evt, function (event) {
                event.preventDefault();
                uploadZone.classList.add("is-dragover");
            });
        });

        ["dragleave", "drop"].forEach(function (evt) {
            uploadZone.addEventListener(evt, function (event) {
                event.preventDefault();
                uploadZone.classList.remove("is-dragover");
            });
        });

        uploadZone.addEventListener("drop", function (event) {
            if (event.dataTransfer && event.dataTransfer.files.length) {
                handleFiles(event.dataTransfer.files);
            }
        });
    }

    updateVisibility();

})();
