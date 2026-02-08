/* team section (reuses events structure) */

document.addEventListener('DOMContentLoaded', () => {
    const section = document.querySelector('.events-section');
    if(!section) return; 

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