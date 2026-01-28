/* =========================================
   STEP 5: FOOTER (Fixed Selectors & Logic)
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
    const footerSection = document.querySelector('.footer-section');
    if(!footerSection) return;

    // FIX: Scope the selector to the footer section so we don't grab the Hero title.
    // We target '.animate-cascade' to find the specific element global.js initialized.
    const footerTitle = footerSection.querySelector('.animate-cascade');

    if (window.ScrollManager) {
        ScrollManager.addSteps([{
            id: 'footer',
            
            onEnter: (direction) => {
                footerSection.classList.add('is-active');
                
                if (footerTitle) {
                    // HERO-MATCHING RESET LOGIC
                    // We grab all chars (even inside nested spans)
                    const chars = footerTitle.querySelectorAll('.char-reveal');
            
                    // 1. Snap to hidden (Kill transitions)
                    chars.forEach(c => {
                        c.style.transition = 'none'; 
                        c.classList.remove('is-visible'); 
                    });

                    // 2. Force Reflow (Flush CSS)
                    void footerTitle.offsetWidth; 

                    // 3. Play (Next Frame)
                    requestAnimationFrame(() => {
                        chars.forEach((c, i) => {
                            c.style.transition = ''; 
                            c.style.transitionDelay = `${i * 30}ms`; 
                        });
                        window.playCascade(footerTitle);
                    });
                }

                return 1000;
            },

            onExit: (direction) => {
                if (direction === 'up') {
                    footerSection.classList.remove('is-active');
                    
                    if (footerTitle) window.reverseCascade(footerTitle);
                }
                return 800;
            }
        }]);
    }
});