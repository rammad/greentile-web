/* =========================================
   SECTION: MISSION
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
    const section = document.querySelector('.mission-section');
    if(!section) return;

    if (window.ScrollManager) {
        ScrollManager.addSteps([{
            id: 'mission',
            onEnter: (dir) => {
                section.classList.add('is-active');
                const title = section.querySelector('.animate-cascade');
                if(title) window.playCascade(title);
                return 1000;
            },
            onExit: (dir) => {
                section.classList.remove('is-active');
                const title = section.querySelector('.animate-cascade');
                if(title) window.reverseCascade(title);
                return 800;
            }
        }]);
    }
});