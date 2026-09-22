/* ================================
   PLACEWICK — GRADUATE ONBOARDING
   Shared interactivity for the
   opportunities and skills steps.
================================ */

document.addEventListener('DOMContentLoaded', () => {

    /* ---------------------------------
       OPPORTUNITY CARDS (multi-select)
       Used on graduate-opportunities.html
    --------------------------------- */

    document.querySelectorAll('.opportunity-card').forEach((card) => {
        card.addEventListener('click', () => {
            card.classList.toggle('selected');
        });
    });


    /* ---------------------------------
       INTEREST CARDS (multi-select)
       Used on graduate-skills.html
    --------------------------------- */

    document.querySelectorAll('.interest-card').forEach((card) => {
        card.addEventListener('click', () => {
            card.classList.toggle('selected');
        });
    });


    /* ---------------------------------
       SKILL TAGS
       Used on graduate-skills.html
    --------------------------------- */

    const skillInput = document.getElementById('skill-input');
    const addSkillButton = document.getElementById('add-skill-button');
    const skillTags = document.getElementById('skill-tags');

    const createSkillTag = (text) => {
        const trimmed = text.trim();

        if (!trimmed) return;

        // Avoid adding the same skill twice
        const existing = Array.from(skillTags.querySelectorAll('.skill-tag'))
            .map((tag) => tag.textContent.trim().toLowerCase());

        if (existing.includes(trimmed.toLowerCase())) {
            skillInput.value = '';
            return;
        }

        const tag = document.createElement('span');
        tag.className = 'skill-tag';
        tag.textContent = trimmed + ' ';

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.setAttribute('aria-label', 'Remove skill');
        removeButton.innerHTML = '<i class="fa-solid fa-xmark"></i>';

        removeButton.addEventListener('click', () => {
            tag.remove();
        });

        tag.appendChild(removeButton);
        skillTags.appendChild(tag);

        skillInput.value = '';
        skillInput.focus();
    };

    if (skillInput && addSkillButton && skillTags) {

        addSkillButton.addEventListener('click', () => {
            createSkillTag(skillInput.value);
        });

        skillInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                createSkillTag(skillInput.value);
            }
        });

        // Wire up remove buttons on any tags already present in the markup
        skillTags.querySelectorAll('.skill-tag button').forEach((button) => {
            button.addEventListener('click', () => {
                button.closest('.skill-tag')?.remove();
            });
        });

    }

});
