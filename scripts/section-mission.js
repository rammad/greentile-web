/* =========================================
   SECTION: MISSION
   ========================================= */
(() => { 
    const { wait, transitionCta, staggerTime, lockTime } = window.AnimationUtils;

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.querySelector('.mission-section');


        if(!section) return;

        if (window.ScrollManager) {
            ScrollManager.addSteps([{
                id: 'mission',
                onEnter: async (dir) => {
                    section.classList.add('is-active');

                    const subtitle = section.querySelector('.text-mask');
                    if(subtitle) subtitle.classList.add('is-visible');

                    await wait(staggerTime);
                    
                    const titles = section.querySelectorAll('.animate-cascade');
                    if(titles.length > 0) {
                        for (let i = 0; i < titles.length; i++){
                            transitionHeader(titles[i], 'enter');
                            await wait(staggerTime);
                        }
                    }
                },
                onExit: async (dir) => {
                    section.classList.remove('is-active');
                    
                    const subtitle = section.querySelector('.text-mask');
                    if(subtitle) subtitle.classList.add('is-visible');

                    const titles = section.querySelectorAll('.animate-cascade');
                    if(titles.length > 0) {
                        for (let i = 0; i < titles.length; i++){
                            transitionHeader(titles[i], 'exit');
                        }
                    }

                    await wait(lockTime);
                }
            }]);
        }
    });
})();
