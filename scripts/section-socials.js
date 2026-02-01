/* =========================================
   SECTION: SOCIALS
   ========================================= */

(() => {
    const { wait, waitForTransition, lockTime, staggerTime, scrollSpeed } = window.AnimationUtils;
    document.addEventListener('DOMContentLoaded', () => {
        const section = document.querySelector('.socials-section');
        if(!section) return;

        // 1. SELF-INIT MARQUEE
        // We check if MarqueeManager exists (from global.js)
        if (typeof MarqueeManager !== 'undefined') {
            // Init specifically for THIS section's track
            new MarqueeManager('.socials-track', scrollSpeed, true);
        }

        // 2. REGISTER STEP
        if (window.ScrollManager) {
            ScrollManager.addSteps([{
                id: 'socials',
                onEnter: async (direction) => {
                    section.classList.add('is-active');
                    const title = section.querySelector('.type-h1');
                    const subtitle = section.querySelector('.type-sub1');
                    const body = section.querySelector('.type-body1');
                    const icons = section.querySelector('.socials-icons');

                    if (subtitle) subtitle.classList.add('is-visible');
                    await wait(staggerTime);

                    if (window.playCascade && title) window.playCascade(title);
                    await wait(staggerTime);

                    if (body) body.classList.add('is-visible');
                    await wait(staggerTime);

                    if (icons) icons.classList.add('is-visible');
                },
                onExit: async (direction) => {
                    section.classList.remove('is-active');
                    const title = section.querySelector('.type-h1');
                    const subtitle = section.querySelector('.type-sub1');
                    const body = section.querySelector('.type-body1');
                    const icons = section.querySelector('.socials-icons');

                    if (subtitle) subtitle.classList.remove('is-visible');

                    if (window.reverseCascade && title) window.reverseCascade(title);

                    if (body) body.classList.remove('is-visible');

                    if (icons) icons.classList.remove('is-visible');
                }
            }]);
        }
    });
})();