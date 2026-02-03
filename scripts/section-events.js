/* =========================================
   STEP 3: EVENTS (Universal Header Mode)
   ========================================= */

(() => {
    const { wait, transitionHeader, transitionCta, lockTime, staggerTime } = window.AnimationUtils;

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.querySelector('.events-section');
        if(!section) return;

        const title = document.getElementById('event-title');
        const cards = document.querySelectorAll('.event-card');
        const btn = section.querySelector('.cta-btn');

        if(window.ScrollManager) {
            ScrollManager.addSteps([{
                id: 'events',
                
                onEnter: async (direction) => {
                    section.classList.add('is-active');

                    await transitionHeader(title, 'enter');

                    await wait(staggerTime);

                    if(btn) transitionCta(btn, 'enter')

                    await wait(staggerTime);

                    for (let i = 0; i < cards.length; i++) {
                        cards[i].classList.add('is-visible');
                        await wait(100); 
                    }
                },

                onExit: async (direction) => {
                    transitionHeader(title, 'exit');
                    if(btn) transitionCta(btn, 'exit')
                    
                    const reversedCards = Array.from(cards).reverse();
                    for (const card of reversedCards) {
                        card.classList.remove('is-visible');
                    }

                    section.classList.remove('is-active');

                    await wait(lockTime);
                }
            }]);
        }
    });
})();