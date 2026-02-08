/* =========================================
   SECTION: MISSION
   ========================================= */
(() => {
    const { wait, staggerTime, lockTime, observeElementInOut } = window.AnimationUtils || {};

    async function playMissionEnter(section) {
        if (!section) return;
        section.classList.add('is-active');

        const subtitle = section.querySelector('.text-mask');
        if (subtitle) subtitle.classList.add('is-visible');

        await wait(staggerTime);

        const titles = section.querySelectorAll('.animate-cascade');
        if (titles.length > 0) {
            for (let i = 0; i < titles.length; i++) {
                if (typeof transitionHeader === 'function') transitionHeader(titles[i], 'enter');
                await wait(staggerTime);
            }
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.querySelector('.mission-section');
        if (!section) return;

        if (window.ScrollManager) {
            ScrollManager.addSteps([{
                id: 'mission',
                onEnter: async () => {
                    await playMissionEnter(section);
                },
                onExit: async () => {
                    section.classList.remove('is-active');
                    const subtitle = section.querySelector('.text-mask');
                    if (subtitle) subtitle.classList.remove('is-visible');
                    const titles = section.querySelectorAll('.animate-cascade');
                    if (titles.length > 0) {
                        for (let i = 0; i < titles.length; i++) {
                            if (typeof transitionHeader === 'function') transitionHeader(titles[i], 'exit');
                        }
                    }
                    await wait(lockTime);
                }
            }]);
        } else {
            /* Continuous scroll (e.g. about-us): play entrance once when section enters view */
            observeElementInOut(section, {
                onEnter: () => playMissionEnter(section)
            });
        }
    });
})();
