/* =========================================
   SECTION: TEAM (Reusing Events Structure)
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
    // Specifically target the section labeled "The Team" or just the events-section on this page
    const section = document.querySelector('.events-section');
    if(!section) return;

    // Check if this is actually the Team section to avoid conflict with Home Page
    // (Optional safety check if you load both scripts)
    // const title = section.querySelector('#event-title');
    // if(title && title.innerText !== 'The Team') return; 

    if (window.ScrollManager) {
        ScrollManager.addSteps([{
            id: 'team',
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