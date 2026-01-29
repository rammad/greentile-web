/* =========================================
   SECTION: FOOTER
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
    const footerSection = document.querySelector('.footer-section');
    if(!footerSection) return;

    // 1. SELF-INIT MARQUEE
    if (typeof MarqueeManager !== 'undefined') {
        new MarqueeManager('.marquee-content', 100, false);
    }

    // 2. HELPER: The "Hard Reset" & Play
    const resetAndPlay = (element) => {
        const chars = element.querySelectorAll('.char-reveal');
        chars.forEach(c => { c.style.transition = 'none'; c.classList.remove('is-visible'); });
        void element.offsetWidth; 
        requestAnimationFrame(() => {
            chars.forEach((c, i) => { c.style.transition = ''; c.style.transitionDelay = `${i * 30}ms`; });
            window.playCascade(element);
        });
    };

    // 3. REGISTER STEP
    if (window.ScrollManager) {
        ScrollManager.addSteps([{
            id: 'footer',
            onEnter: (direction) => {
                footerSection.classList.add('is-active');
                const title = footerSection.querySelector('.animate-cascade');
                if (title) setTimeout(() => resetAndPlay(title), 50);
                return 1000;
            },
            onExit: (direction) => {
                if (direction === 'up') {
                    footerSection.classList.remove('is-active');
                    const title = footerSection.querySelector('.animate-cascade');
                    if (title) window.reverseCascade(title);
                }
                return 800;
            }
        }]);
    }
});