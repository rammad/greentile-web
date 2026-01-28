/* =========================================
   SECTION: HERO
   Handles: Fade Out & Re-Triggering Entrance
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
    initHeroScroll();
});

function initHeroScroll() {
    const heroTitle = document.querySelector('.type-display-hero');
    if (!heroTitle) return;

    let isHidden = false;

    // We define the logic as a reusable function so we can call it immediately
    const checkScroll = () => {
        const scrollY = window.scrollY;
        
        // --- ZONE 1: SCROLLED DOWN (EXIT) ---
        if (scrollY > 100) {
            // Only trigger if we aren't already hidden
            if (!isHidden) {
                isHidden = true;
                heroTitle.classList.add('hero-faded');
            }
        } 
        
        // --- ZONE 2: AT THE TOP (RE-ENTER) ---
        else if (scrollY < 20) {
            // Only trigger if we were previously hidden (Re-entry)
            if (isHidden) {
                isHidden = false;
                
                // 1. Un-fade parent
                heroTitle.classList.remove('hero-faded');
                
                // 2. RESET CHILDREN
                const chars = heroTitle.querySelectorAll('.char-reveal');
                
                chars.forEach(char => {
                    char.style.transition = 'none'; // Snap mode
                    char.classList.remove('is-visible');
                });

                // 3. FLUSH (Force browser to apply 'none')
                void heroTitle.offsetWidth;

                // 4. RESTORE & RE-APPLY DELAYS
                chars.forEach((char, index) => {
                    char.style.transition = ''; 
                    char.style.transitionDelay = `${index * 30}ms`;
                });

                // 5. PLAY
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                         window.playCascade(heroTitle);
                    });
                });
            }
        }
    };

    // 1. Listen for future scrolling
    window.addEventListener('scroll', checkScroll, { passive: true });

    // 2. THE FIX: Check immediately on load!
    // This catches the case where you refresh the page while halfway down.
    checkScroll();
}