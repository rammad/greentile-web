/* hero section – observer-driven cascade */

(function () {
    document.addEventListener('DOMContentLoaded', () => {
        const heroSection = document.querySelector('.hero') || document.querySelector('#hero');
        const heroTitle = document.querySelector('.type-display-hero');

        if (!heroSection || !heroTitle) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    heroSection.classList.add('is-visible');
                    heroTitle.classList.remove('header-hidden');
                    if (window.playCascade) window.playCascade(heroTitle);
                });
            },
            { threshold: 0.2, rootMargin: '0px' }
        );
        observer.observe(heroSection);
    });
})();
