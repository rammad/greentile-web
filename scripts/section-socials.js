/* socials section – observer-driven cascade, body, icons, gallery */

(function () {
    const { staggerTime } = window.AnimationUtils || {};

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.querySelector('.socials-section');
        if (!section) return;

        const title = section.querySelector('.animate-cascade');
        const subtitle = section.querySelector('.text-mask');
        const body = section.querySelector('.type-body1');
        const icons = section.querySelector('.socials-icons');
        const gallery = section.querySelector('.socials-track');

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    section.classList.add('is-visible');
                    if (subtitle) subtitle.classList.add('is-visible');
                    if (title && window.playCascade) window.playCascade(title);
                    if (body) setTimeout(() => body.classList.add('is-visible'), staggerTime || 0);
                    if (icons) setTimeout(() => icons.classList.add('is-visible'), (staggerTime || 0) * 2);
                    if (gallery) setTimeout(() => gallery.classList.add('is-visible'), (staggerTime || 0) * 3);
                });
            },
            { threshold: 0.2 }
        );
        observer.observe(section);
    });
})();
