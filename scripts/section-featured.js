/* featured section – fade poster in on scroll enter + parallax background */

(function () {
    const { observeElementInOut } = window.AnimationUtils || {};
    const PARALLAX_FACTOR = 0.35;

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.querySelector('.featured-section');
        if (!section) return;

        const image = section.querySelector('.featured-img');
        const bgImg = section.querySelector('.featured-bg-img');

        if (image && observeElementInOut) {
            observeElementInOut(image, {
                onEnter() { image.classList.add('is-visible'); }
            });
        } else if (image) {
            image.classList.add('is-visible');
        }

        function tick() {
            const sectionTop = section.getBoundingClientRect().top;
            const translateY = (-sectionTop * PARALLAX_FACTOR).toFixed(2);
            bgImg.style.transform = `translateY(${translateY}px)`;
            requestAnimationFrame(tick);
        }

        requestAnimationFrame(tick);
    });
})();
