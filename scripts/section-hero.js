/* =========================================
   HERO SECTION (Global & Universal)
   ========================================= */

(() => { 
    const { wait, transitionHeader, lockTime } = window.AnimationUtils;

    document.addEventListener('DOMContentLoaded', () => {
        const heroSection = document.querySelector('.hero') || document.querySelector('section');
        const heroTitle = document.querySelector('.type-display-hero');

        if(!heroSection || !heroTitle) return;

        if (window.ScrollManager) {
            ScrollManager.addSteps([{
                id: 'hero',
                
                // --- ENTER ---
                onEnter: async (direction) => {
                    heroSection.classList.add('is-active');

                    // 1. Universal Header Animation
                    transitionHeader(heroTitle, 'enter');

                    // 2. Global Safety Lock
                    await wait(lockTime);
                },

                // --- EXIT ---
                onExit: async (direction) => {
                    if (direction === 'down') {
                        // 1. Universal Exit (Blur Out)
                        await transitionHeader(heroTitle, 'exit');
                        
                        // 2. Hide Section
                        heroSection.classList.remove('is-active');
                    }
                }
            }]);
        } else {
            // Fallback
            heroSection.classList.add('is-active');
            heroTitle.classList.remove('header-hidden');
            if(window.playCascade) window.playCascade(heroTitle);
        }
    });
})();