/* hero section */

(() => { 
    const { wait, transitionHeader, lockTime } = window.AnimationUtils;

    document.addEventListener('DOMContentLoaded', () => {
        const heroSection = document.querySelector('.hero') || document.querySelector('section');
        const heroTitle = document.querySelector('.type-display-hero');

        if(!heroSection || !heroTitle) return;

        if (window.ScrollManager) {
            ScrollManager.addSteps([{
                id: 'hero',
                onEnter: async (direction) => {
                    heroSection.classList.add('is-active');
                    transitionHeader(heroTitle, 'enter');
                    await wait(lockTime);
                },
                onExit: async (direction) => {
                    if (direction === 'down') {
                        await transitionHeader(heroTitle, 'exit');
                        heroSection.classList.remove('is-active');
                    }
                }
            }]);
        } else {
            heroSection.classList.add('is-active');
            heroTitle.classList.remove('header-hidden');
            if(window.playCascade) window.playCascade(heroTitle);
        }
    });
})();