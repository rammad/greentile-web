document.addEventListener('DOMContentLoaded', () => {
    if(window.ScrollManager) {
        var scrollZones = document.querySelectorAll('.natural-scroll-section');

        for(let i = 0; i < scrollZones.length; i++) {
            ScrollManager.addSteps([{

            id: `scroll-zone-${i}`,

            onEnter: (dir) => {
                const el = document.getElementById(`scroll-zone-${i}`);
                el.classList.add('is-active');
                return 800;
            },
            onExit: (dir) => {
                const el = document.getElementById(`scroll-zone-${i}`);
                el.classList.remove('is-active');
                return 800;
            }

            }]);
        }
    }
});