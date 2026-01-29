/* =========================================
   SECTION: CLIENTS
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
    const section = document.querySelector('.clients-section');
    if(!section) return;

    // 1. SELF-INIT MARQUEE
    if (typeof MarqueeManager !== 'undefined') {
        new MarqueeManager('.logo-track', 80, false); 
    }

    if (window.ScrollManager) {
        ScrollManager.addSteps([{
            id: 'clients',
            onEnter: (dir) => {
                section.classList.add('is-active');
                return 1000;
            },
            onExit: (dir) => {
                section.classList.remove('is-active');
                return 800;
            }
        }]);
    }
});