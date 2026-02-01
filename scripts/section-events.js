/* =========================================
   STEP 3: EVENTS (Universal Header Mode)
   ========================================= */

(() => {
    const { wait, transitionHeader, lockTime } = window.AnimationUtils;

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.querySelector('.events-section');
        if(!section) return;

        const title = document.getElementById('event-title');
        const cards = document.querySelectorAll('.event-card');
        const btn = document.getElementById('event-btn');

        if(window.ScrollManager) {
            ScrollManager.addSteps([{
                id: 'events-enter',
                
                // --- ENTER ---
                onEnter: async (direction) => {
                    section.classList.add('is-active');

                    // 1. UNIVERSAL HEADER ENTRANCE
                    transitionHeader(title, 'enter');

                    // 2. WAIT FOR TITLE (500ms lead time)
                    await wait(500);

                    // 3. STAGGER CARDS IN
                    for (let i = 0; i < cards.length; i++) {
                        cards[i].classList.add('is-visible');
                        await wait(100); 
                    }

                    // 4. SHOW BUTTON
                    if(btn) {
                        void btn.offsetWidth;
                        // Add the class that triggers the Circle -> Expand -> Text sequence
                        btn.classList.add('is-visible');
                    }

                    // 5. GLOBAL LOCK
                    await wait(lockTime);
                },

                // --- EXIT ---
                onExit: async (direction) => {
                    
                    // 1. UNIVERSAL HEADER EXIT
                    await transitionHeader(title, 'exit');

                    // 2. HIDE CARDS (Fast)
                    const reversedCards = Array.from(cards).reverse();
                    for (const card of reversedCards) {
                        card.classList.remove('is-visible');
                    }
                    
                    if(btn) btn.classList.remove('is-visible');

                    // 3. GLOBAL LOCK
                    await wait(lockTime);

                    section.classList.remove('is-active');
                }
            }]);
        }
    });
})();