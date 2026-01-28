/* =========================================
   STEP 5: FOOTER (Fixed)
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
    const footerSection = document.querySelector('.footer-section');
    if(!footerSection) return;

    // HELPER: The "Hard Reset" & Play
    const resetAndPlay = (element) => {
        // Finds ALL characters, even if they are inside nested spans
        const chars = element.querySelectorAll('.char-reveal');
        
        chars.forEach(c => {
            c.style.transition = 'none'; 
            c.classList.remove('is-visible'); 
        });

        void element.offsetWidth; // Force Reflow

        requestAnimationFrame(() => {
            chars.forEach((c, i) => {
                c.style.transition = ''; 
                c.style.transitionDelay = `${i * 30}ms`; 
            });
            window.playCascade(element);
        });
    };

    if (window.ScrollManager) {
        ScrollManager.addSteps([{
            id: 'footer',
            
            onEnter: (direction) => {
                footerSection.classList.add('is-active');
                
                // Target the PARENT container
                const title = footerSection.querySelector('.animate-cascade');
                if (title) resetAndPlay(title);

                return 1000;
            },

            onExit: (direction) => {
                if (direction === 'up') {
                    footerSection.classList.remove('is-active');
                    
                    const title = footerSection.querySelector('.animate-cascade');
                    if (title) window.reverseCascade(title);
                }
                return 800;
            }
        }]);
    }
});