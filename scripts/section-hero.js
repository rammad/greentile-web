/* =========================================
   HERO SECTION (Global Timing)
   ========================================= */

(() => { 
    // Destructure lockTime here
    const { wait, animate, lockTime } = window.AnimationUtils;

    document.addEventListener('DOMContentLoaded', () => {
        const heroSection = document.querySelector('.hero') || document.querySelector('section');
        const heroTitle = document.querySelector('.type-display-hero');

        if(!heroSection || !heroTitle) return;

        if (window.ScrollManager) {
            ScrollManager.addSteps([{
                id: 'hero',
                onEnter: async (direction) => {
                    heroSection.classList.add('is-active');
                    heroTitle.classList.remove('hero-hidden');

                    if (direction === 'up') {
                        const chars = heroTitle.querySelectorAll('.char-reveal');
                        chars.forEach(c => { c.style.transition = 'none'; c.classList.remove('is-visible'); });
                        void heroTitle.offsetWidth; 
                        chars.forEach((c, i) => { c.style.transition = ''; c.style.transitionDelay = `${i * 30}ms`; });
                    }

                    if (window.playCascade) {
                        while (!heroTitle.classList.contains('is-initialized')) await wait(50);
                        
                        // Start animation (Fire & Forget)
                        window.playCascade(heroTitle, 0);
                        
                        // GLOBAL LOCK
                        await wait(lockTime);
                    }
                },
                onExit: async (direction) => {
                    if (direction === 'down') {
                        await animate(heroTitle, 'hero-hidden');
                        heroSection.classList.remove('is-active');
                    }
                }
            }]);
        } else {
            heroSection.classList.add('is-active');
            heroTitle.classList.remove('hero-hidden');
            if(window.playCascade) window.playCascade(heroTitle);
        }
    });
})();