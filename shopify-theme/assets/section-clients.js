/* clients section */
(() => {
    const { observeElementInOut } = window.AnimationUtils || {};

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.querySelector('.clients-section');
        if (!section) return;

        const previous = section.querySelector('.clients-previous');
        const pressLogos = section.querySelector('.press-logos');

        [previous, pressLogos].forEach(el => {
            if (el && observeElementInOut) {
                observeElementInOut(el, {
                    onEnter: () => el.classList.add('is-visible')
                });
            }
        });
    });
})();
