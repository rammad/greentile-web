/* =========================================
   STEP 1: HERO (Fixed Re-Entry & Class Names)
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. GET ELEMENTS
    const heroSection = document.querySelector('.hero') || document.querySelector('section');
    const heroTitle = document.querySelector('.type-display-hero');

    if(!heroSection || !heroTitle) {
        console.error("Hero: Section or Title not found.");
        return;
    }

    // 2. IMMEDIATE LAUNCH
    // Show immediately so it doesn't flash
    heroSection.classList.add('is-active');
    heroTitle.classList.remove('hero-hidden'); 
    
    if (!heroTitle.classList.contains('is-visible')) {
        window.playCascade(heroTitle);
    }

    // 3. REGISTER STEP
    if (window.ScrollManager) {
        ScrollManager.addSteps([{
            id: 'hero',
            
            onEnter: (direction) => {
                heroSection.classList.add('is-active');

                // RE-ENTRY FROM BOTTOM
                if (direction === 'up') {
                    // 1. Un-fade the parent container
                    heroTitle.classList.remove('hero-hidden');
                    
                    // 2. RESET CHILDREN (The Fix)
                    const chars = heroTitle.querySelectorAll('.char-reveal');
                    
                    chars.forEach(c => {
                        // Kill transition so it snaps to hidden instantly
                        c.style.transition = 'none'; 
                        // Remove the visible class (CSS will handle hiding)
                        c.classList.remove('is-visible'); 
                    });

                    // 3. FORCE REFLOW (Flush the 'hidden' state)
                    void heroTitle.offsetWidth;

                    // 4. RESTORE & PLAY (Next Frame)
                    // We restore the transition property, then trigger the cascade
                    requestAnimationFrame(() => {
                        chars.forEach((c, i) => {
                            c.style.transition = ''; // Remove inline override
                            c.style.transitionDelay = `${i * 30}ms`; // Restore staggered delay
                        });
                        window.playCascade(heroTitle);
                    });
                }
                
                return 1000;
            },

            onExit: (direction) => {
                if (direction === 'down') {
                    // Fade out parent
                    heroTitle.classList.add('hero-hidden');
                    
                    // Hide section layer after fade completes
                    setTimeout(() => {
                        heroSection.classList.remove('is-active');
                    }, 800); 
                }
                return 800; 
            }
        }]);
    } else {
        console.error("Hero: ScrollManager not found!");
    }
});