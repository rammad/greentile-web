/* featured section – observer-driven subtitle, title, body, image, CTA */

(function () {
    const { transitionHeader, transitionCta, staggerTime } = window.AnimationUtils || {};

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.querySelector('.featured-section');
        if (!section) return;

        const subtitle = section.querySelector('.text-mask');
        const title = section.querySelector('.animate-cascade');
        const body = section.querySelector('.type-body1');
        const btn = section.querySelector('.cta-btn');
        const image = section.querySelector('.featured-img');

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    section.classList.add('is-visible');
                    if (subtitle) subtitle.classList.add('is-visible');
                    if (title && transitionHeader) setTimeout(() => transitionHeader(title, 'enter'), staggerTime || 0);
                    if (body) setTimeout(() => body.classList.add('is-visible'), (staggerTime || 0) * 2);
                    if (image) setTimeout(() => image.classList.add('is-visible'), (staggerTime || 0) * 2);
                    if (btn && transitionCta) setTimeout(() => transitionCta(btn, 'enter'), (staggerTime || 0) * 3);
                });
            },
            { threshold: 0.2 }
        );
        observer.observe(section);
    });
})();
