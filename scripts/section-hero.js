/* =========================================
   HERO SECTION (Scoped & Safe)
   ========================================= */

(() => { // <--- 1. OPEN SANDBOX (Prevents "wait is already declared" error)

    const { wait, animate } = window.AnimationUtils;

    document.addEventListener('DOMContentLoaded', () => {
        
        // 1. GET ELEMENTS
        const heroSection = document.querySelector('.hero') || document.querySelector('section');
        const heroTitle = document.querySelector('.type-display-hero');

        if(!heroSection || !heroTitle) {
            console.warn("Hero: Section or Title not found.");
            return;
        }

        // 2. REGISTER STEP WITH SCROLL MANAGER
        if (window.ScrollManager) {
            ScrollManager.addSteps([{
                id: 'hero',
                
                // --- ENTER SCENE ---
                onEnter: async (direction) => {
                    
                    // A. Activate Section (Fade In Background)
                    // This fixes the "No Gradient" issue
                    heroSection.classList.add('is-active');
                    heroTitle.classList.remove('hero-hidden');

                    // B. Handle Re-Entry (If scrolling UP back to hero)
                    if (direction === 'up') {
                        // Reset Text instantly for replay
                        const chars = heroTitle.querySelectorAll('.char-reveal');
                        chars.forEach(c => {
                            c.style.transition = 'none'; 
                            c.classList.remove('is-visible'); 
                        });

                        // Force Reflow
                        void heroTitle.offsetWidth; 

                        // Restore transition
                        chars.forEach((c, i) => {
                            c.style.transition = ''; 
                            c.style.transitionDelay = `${i * 30}ms`; 
                        });
                    }

                    // C. Play Animation (Async)
                    if (window.playCascade) {
                        // Safety: Wait for text to be split by global.js
                        while (!heroTitle.classList.contains('is-initialized')) {
                            await wait(50);
                        }
                        
                        // Trigger the cascade with 0ms overlap (wait for full sequence)
                        await window.playCascade(heroTitle, 0);
                    }
                },

                // --- EXIT SCENE ---
                onExit: async (direction) => {
                    if (direction === 'down') {
                        await animate(heroTitle, 'hero-hidden');                        
                        heroSection.classList.remove('is-active');
                    }
                }
            }]);
        } else {
            // Fallback if ScrollManager isn't running (just show it)
            heroSection.classList.add('is-active');
            heroTitle.classList.remove('hero-hidden');
            if(window.playCascade) window.playCascade(heroTitle);
        }
    });

})();