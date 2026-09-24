// Placewick — Profile
// Client-side only: adding/removing skills and "saving" the form just
// updates the DOM and shows a confirmation message. Nothing is persisted —
// a refresh resets it. A real backend would replace the submit handler
// with an actual API call.

(function () {

    const skillsWrap = document.getElementById("profile-skills");
    const skillInput = document.getElementById("profile-skill-input");
    const form = document.getElementById("profile-form");
    const saveStatus = document.getElementById("profile-save-status");

    if (!form) return;

    function addSkill(text) {
        const trimmed = text.trim();
        if (!trimmed) return;

        const existing = Array.from(skillsWrap.querySelectorAll(".profile-skill-tag")).map(function (tag) {
            return tag.textContent.replace("×", "").trim().toLowerCase();
        });
        if (existing.includes(trimmed.toLowerCase())) return;

        const tag = document.createElement("span");
        tag.className = "profile-skill-tag";
        tag.innerHTML = '<span class="skill-label"></span><button type="button" aria-label="Remove skill">&times;</button>';
        tag.querySelector(".skill-label").textContent = trimmed;
        skillsWrap.appendChild(tag);
    }

    if (skillInput) {
        skillInput.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
                event.preventDefault();
                addSkill(skillInput.value);
                skillInput.value = "";
            }
        });
    }

    if (skillsWrap) {
        skillsWrap.addEventListener("click", function (event) {
            const removeButton = event.target.closest("button");
            if (!removeButton) return;
            removeButton.closest(".profile-skill-tag").remove();
        });
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        saveStatus.textContent = "Saved just now";
        saveStatus.classList.add("is-visible");

        clearTimeout(form._statusTimer);
        form._statusTimer = setTimeout(function () {
            saveStatus.classList.remove("is-visible");
        }, 2500);
    });

})();
