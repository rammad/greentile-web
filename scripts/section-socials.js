/* =========================================
   SECTION: SOCIALS
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
    const section = document.querySelector('.socials-section');
    if(!section) return;

    // 1. SELF-INIT MARQUEE
    // We check if MarqueeManager exists (from global.js)
    if (typeof MarqueeManager !== 'undefined') {
        // Init specifically for THIS section's track
        new MarqueeManager('.socials-track', 60, true);
    }

    // 2. REGISTER STEP
    if (window.ScrollManager) {
        ScrollManager.addSteps([{
            id: 'socials',
            onEnter: (direction) => {
                section.classList.add('is-active');
                const title = section.querySelector('.type-h1');
                if (window.playCascade && title) window.playCascade(title);
                return 1000;
            },
            onExit: (direction) => {
                section.classList.remove('is-active');
                const title = section.querySelector('.type-h1');
                if (window.reverseCascade && title) window.reverseCascade(title);
                return 800;
            }
        }]);
    }
});