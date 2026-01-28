/* =========================================
   STEP 4: SOCIALS (Director Mode)
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
    // 1. SELECTORS
    const section = document.querySelector('.socials-section');
    const title = section.querySelector('.type-h1'); // "Socials"
    
    if(!section) return;

    // 2. DEFINE STEP
    const socialStep = {
        id: 'socials',
        
        onEnter: (direction) => {
            section.classList.add('is-active');
            
            // Trigger Title Cascade (Standard Animation)
            if (window.playCascade && title) {
                window.playCascade(title);
            }

            return 1000; // Duration
        },

        onExit: (direction) => {
            section.classList.remove('is-active');
            
            if (window.reverseCascade && title) {
                window.reverseCascade(title);
            }
            
            return 800;
        }
    };

    // 3. REGISTER
    if (window.ScrollManager) {
        ScrollManager.addSteps([socialStep]);
    } else {
        console.error("ScrollManager not found.");
    }
});