/* =========================================
   SECTION: CLIENTS
   ========================================= */
(() => {
    const { wait, waitForTransition, lockTime, staggerTime, scrollSpeed } = window.AnimationUtils;
    document.addEventListener('DOMContentLoaded', () => {
        const section = document.querySelector('.clients-section');
        if(!section) return;

        if (window.ScrollManager) {
            ScrollManager.addSteps([{
                id: 'clients',
                onEnter: async (direction) => {
                    section.classList.add('is-active');
                    const subtitle = section.querySelector('.text-mask');
                    const gallery = section.querySelector('.logo-track');

                    if (subtitle) subtitle.classList.add('is-visible');

                    await wait(staggerTime);

                    if(gallery) gallery.classList.add('is-visible');
                },
                onExit: () => {}
            }])
        }
    });
})();