/* =========================================
   PAGE: ABOUT ("What We Do" Scroll)
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
    const menuSection = document.getElementById('menu-trigger');
    if (!menuSection) return; // Stop if not on about page

    const menuItems = document.querySelectorAll('.menu-item');
    const menuGroups = document.querySelectorAll('.menu-group');
    const ctaBlocks = document.querySelectorAll('.cta-block');
    let menuActiveGroupIndex = -1;

    function handleMenuScroll() {
        const viewportHeight = window.innerHeight;
        const menuRect = menuSection.getBoundingClientRect();
        
        let menuP = -menuRect.top / (menuRect.height - viewportHeight);
        menuP = Math.max(0, Math.min(1, menuP));

        const SELECTION_START = 0.1;
        const SELECTION_END = 0.9;

        if (menuP < SELECTION_START) {
            updateActiveState(0);
        } else {
            const totalItems = menuItems.length;
            const availableProgress = (menuP - SELECTION_START) / (SELECTION_END - SELECTION_START);
            const rawIndex = availableProgress * totalItems;
            let index = Math.floor(rawIndex);
            index = Math.max(0, Math.min(index, totalItems - 1));
            
            updateActiveState(index);
        }
    }

    function updateActiveState(index) {
        if (menuActiveGroupIndex === index) return;
        menuActiveGroupIndex = index;

        menuItems.forEach((item, i) => {
            if (i === index) item.classList.add('active'); 
            else item.classList.remove('active');
        });

        ctaBlocks.forEach((block, i) => {
            if (i === index) block.classList.add('active'); 
            else block.classList.remove('active');
        });

        menuGroups.forEach((group, i) => {
            if (i === index) group.classList.add('active'); 
            else group.classList.remove('active');
        });
    }

    window.addEventListener('scroll', handleMenuScroll);
    handleMenuScroll();
});