/* clients section */
(() => {
    const { observeElementInOut } = window.AnimationUtils || {};

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.querySelector('.clients-section');
        if (!section) return;

        const columns = section.querySelector('.clients-columns');

        if (columns && observeElementInOut) {
            observeElementInOut(columns, {
                onEnter: () => columns.classList.add('is-visible')
            });
        }
    });
})();
