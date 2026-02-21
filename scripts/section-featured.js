/* featured section – fade poster in on scroll enter */

(function () {
    const { observeElementInOut } = window.AnimationUtils || {};

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.querySelector('.featured-section');
        if (!section) return;

        const image = section.querySelector('.featured-img');

        if (image && observeElementInOut) {
            observeElementInOut(image, {
                onEnter() { image.classList.add('is-visible'); }
            });
        } else if (image) {
            image.classList.add('is-visible');
        }
    });
})();
