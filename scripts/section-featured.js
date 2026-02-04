/* =========================================
   SECTION: FEATURED
   ========================================= */

(() => {
    const { wait, transitionHeader, transitionCta, staggerTime } = window.AnimationUtils;

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.querySelector('.featured-section');
        if(!section) return;

        // Elements
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

                    // 1. Title Cascade
                    if(title) transitionHeader(title, 'enter');
                    
                    await wait(staggerTime);

                    // 2. Body Text Fade
                    if(body) body.classList.add('is-visible');

                    // 3. Image Slide/Fade
                    if(image) image.classList.add('is-visible');

                    await wait(staggerTime);

                    // 4. Button Expand
                    if(btn) transitionCta(btn, 'enter');
                },

                onExit: async (direction) => {
                    section.classList.remove('is-active');

                    // Reset Animations
                    if(title) transitionHeader(title, 'exit');
                    if(body) body.classList.remove('is-visible');
                    if(image) image.classList.remove('is-visible');
                    if(btn) transitionCta(btn, 'exit');
                }
            }]);
        }
    });
})();