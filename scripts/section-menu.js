/* menu section */

document.addEventListener('DOMContentLoaded', () => {
    const menuSection = document.querySelector('.menu-section');
    if(!menuSection) return;

    const menuItems = document.querySelectorAll('.menu-item');
    const menuGroups = document.querySelectorAll('.menu-group');
    const ctaBlocks = document.querySelectorAll('.cta-block');

    const updateMenuState = (index) => {
        menuItems.forEach((item, i) => {
            if(i === index) item.classList.add('active');
            else item.classList.remove('active');
        });
        ctaBlocks.forEach((block, i) => {
            if(i === index) block.classList.add('active');
            else block.classList.remove('active');
        });
        menuGroups.forEach((group, i) => {
            group.classList.remove('active', 'prev', 'next');
            if (i === index) group.classList.add('active');
            else if (i < index) group.classList.add('prev');
            else group.classList.add('next');
        });
    };

    if (window.ScrollManager) {
        const menuSteps = [0, 1, 2, 3].map(index => ({
            id: `menu-${index}`,
            onEnter: (dir) => {
                menuSection.classList.add('is-active');
                updateMenuState(index);
                return 800;
            },
            onExit: (dir) => {
                if ((index === 3 && dir === 'down') || (index === 0 && dir === 'up')) {
                    menuSection.classList.remove('is-active');
                }
                return 800;
            }
        }));

        ScrollManager.addSteps(menuSteps);
    }
});