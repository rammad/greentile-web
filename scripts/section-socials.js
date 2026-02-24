/* socials section – one-time entrance when visible, then stay */

(function () {
    const { observeElementInOut, staggerTime } = window.AnimationUtils || {};

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.querySelector('.socials-section');
        if (!section) return;

        const title = section.querySelector('.animate-cascade');
        const subtitle = section.querySelector('.text-mask');
        const body = section.querySelector('.type-body1');
        const icons = section.querySelector('.socials-icons');
        const gallery = section.querySelector('.socials-track');

        const stagger = staggerTime || 200;

        if (subtitle) {
            observeElementInOut(subtitle, {
                onEnter() { subtitle.classList.add('is-visible'); }
            });
        }

        if (title) {
            observeElementInOut(title, {
                onEnter() {
                    if (window.playCascade) window.playCascade(title);
                }
            });
        }

        if (body) {
            observeElementInOut(body, {
                onEnter() { setTimeout(() => body.classList.add('is-visible'), stagger); }
            });
        }

        if (icons) {
            observeElementInOut(icons, {
                onEnter() { setTimeout(() => icons.classList.add('is-visible'), stagger * 2); }
            });
        }

        if (gallery) {
            const imgs = gallery.querySelectorAll('.social-img');
            observeElementInOut(gallery, {
                onEnter() {
                    imgs.forEach((img, i) => {
                        setTimeout(() => img.classList.add('is-visible'), stagger * 3 + i * 100);
                    });
                }
            });
        }
    });
})();
