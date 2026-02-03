/* =========================================
   SECTION: FOOTER
   ========================================= */

(() => {
    const { wait, staggerTime, scrollSpeed, lockTime } = window.AnimationUtils;
        
    document.addEventListener('DOMContentLoaded', () => {
        const footerSection = document.querySelector('.footer-section');
        if(!footerSection) return;

        // 1. SELF-INIT MARQUEE
        if (typeof MarqueeManager !== 'undefined') {
            new MarqueeManager('.marquee-content', scrollSpeed, false);
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

                
                onEnter: async (direction) => {
                    footerSection.classList.add('is-active');
                    const title = footerSection.querySelector('.animate-cascade');
                    const links = footerSection.querySelectorAll('.ui-roll');

                    resetAndPlay(title);

                    await wait(staggerTime);

                    for ( let i = 0; i < links.length; i++){
                        links[i].classList.add('is-visible');
                        await wait(staggerTime);
                    }

                    await wait(lockTime);
                },
                onExit: async (direction) => {
                    footerSection.classList.remove('is-active');
                    const title = footerSection.querySelector('.animate-cascade');
                    const links = footerSection.querySelectorAll('.ui-roll');
                    
                    if (title) window.reverseCascade(title);
                    for ( let i = 0; i < links.length; i++) links[i].classList.add('is-visible');
                    await wait(lockTime)
                }
            }]);
        }
    });
})();