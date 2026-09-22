/* ================================
   PLACEWICK — SITE SCRIPTS
   Smooth scrolling + scroll-reveal
================================ */

document.addEventListener('DOMContentLoaded', () => {

    /* ---------------------------------
       STICKY HEADER SCROLL STATE
       Adds a slightly more opaque
       background + shadow once the page
       has scrolled past the top.
    --------------------------------- */

    const header = document.querySelector('.header');

    if (header) {
        const SCROLL_THRESHOLD = 12;

        const updateHeaderState = () => {
            header.classList.toggle('is-scrolled', window.scrollY > SCROLL_THRESHOLD);
        };

        updateHeaderState();
        window.addEventListener('scroll', updateHeaderState, { passive: true });
    }


    /* ---------------------------------
       SMOOTH SCROLL FOR IN-PAGE ANCHORS
       (CSS already sets scroll-behavior:
       smooth; this adds a JS fallback and
       accounts for the fixed header height)
    --------------------------------- */

    const HEADER_OFFSET = 90;

    document.querySelectorAll('a[href^="#"]').forEach((link) => {
        const targetId = link.getAttribute('href');

        // Skip bare "#" placeholder links (used as buttons elsewhere on the site)
        if (!targetId || targetId.length < 2) return;

        const target = document.querySelector(targetId);
        if (!target) return;

        link.addEventListener('click', (event) => {
            event.preventDefault();

            const targetPosition =
                target.getBoundingClientRect().top +
                window.pageYOffset -
                HEADER_OFFSET;

            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });

            // Keep the URL hash in sync without jumping
            history.pushState(null, '', targetId);
        });
    });


    /* ---------------------------------
       SCROLL REVEAL
       Fades/slides elements with class
       "reveal" into view as they enter
       the viewport.
    --------------------------------- */

    const revealElements = document.querySelectorAll('.reveal');

    if (!revealElements.length) return;

    // If the browser doesn't support IntersectionObserver, just show everything
    if (!('IntersectionObserver' in window)) {
        revealElements.forEach((el) => el.classList.add('is-visible'));
        return;
    }

    const revealObserver = new IntersectionObserver(
        (entries, observer) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    // Reveal once, then stop watching this element
                    observer.unobserve(entry.target);
                }
            });
        },
        {
            root: null,
            rootMargin: '0px 0px -80px 0px',
            threshold: 0.15
        }
    );

    revealElements.forEach((el, index) => {
        // Small staggered delay for elements revealing together
        el.style.transitionDelay = `${(index % 4) * 90}ms`;
        revealObserver.observe(el);
    });

});