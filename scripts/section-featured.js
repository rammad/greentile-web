/* featured section */

(() => {
    const { wait, transitionHeader, transitionCta, staggerTime } = window.AnimationUtils;

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.querySelector('.featured-section');
        if(!section) return;

        const subtitle = section.querySelector('.text-mask');
        const title = section.querySelector('.animate-cascade');
        const body = section.querySelector('.type-body1');
        const btn = section.querySelector('.cta-btn');
        const image = section.querySelector('.featured-img');

        if(window.ScrollManager) {
            ScrollManager.addSteps([{
                id: 'featured',
                
                onEnter: async (direction) => {
                    section.classList.add('is-active');

                    if(subtitle) subtitle.classList.add('is-visible');

                    await wait(staggerTime);

                    if(title) transitionHeader(title, 'enter');
                    await wait(staggerTime);

                    if(body) body.classList.add('is-visible');
                    if(image) image.classList.add('is-visible');

                    await wait(staggerTime);

                    if(btn) transitionCta(btn, 'enter');
                },

                onExit: async (direction) => {
                    section.classList.remove('is-active');
                    if(title) transitionHeader(title, 'exit');
                    if(body) body.classList.remove('is-visible');
                    if(image) image.classList.remove('is-visible');
                    if(btn) transitionCta(btn, 'exit');
                }
            }]);
        }
    });
})();