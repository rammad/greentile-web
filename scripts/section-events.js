/* events section – observer-driven header, CTA, cards */

(function () {
    const { transitionHeader, transitionCta, staggerTime } = window.AnimationUtils || {};

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.querySelector('.events-section');
        if (!section) return;

        const title = document.getElementById('event-title');
        const cards = section.querySelectorAll('.event-card');
        const btn = section.querySelector('.cta-btn');

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    section.classList.add('is-visible');
                    if (title && transitionHeader) transitionHeader(title, 'enter');
                    if (btn && transitionCta) setTimeout(() => transitionCta(btn, 'enter'), (staggerTime || 200));
                    cards.forEach((card, i) => {
                        setTimeout(() => card.classList.add('is-visible'), (staggerTime || 200) + 100 * i);
                    });
                });
            },
            { threshold: 0.2 }
        );
        observer.observe(section);
    });
})();
