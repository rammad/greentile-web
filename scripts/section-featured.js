/* featured section – one-time entrance when visible, then stay */

(function () {
    const { transitionHeader, transitionCta, observeElementInOut, staggerTime } = window.AnimationUtils || {};

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.querySelector('.featured-section');
        if (!section) return;

        const subtitle = section.querySelector('.text-mask');
        const title = section.querySelector('.animate-cascade');
        const body = section.querySelector('.type-body1');
        const btn = section.querySelector('.cta-btn');
        const image = section.querySelector('.featured-img');

        const stagger = staggerTime || 200;

        if (subtitle) {
            observeElementInOut(subtitle, {
                onEnter() { subtitle.classList.add('is-visible'); }
            });
        }

        if (title) {
            observeElementInOut(title, {
                onEnter() {
                    setTimeout(() => transitionHeader && transitionHeader(title, 'enter'), stagger);
                }
            });
        }

        if (body) {
            observeElementInOut(body, {
                onEnter() { setTimeout(() => body.classList.add('is-visible'), stagger * 2); }
            });
        }

        if (image) {
            observeElementInOut(image, {
                onEnter() { setTimeout(() => image.classList.add('is-visible'), stagger * 2); }
            });
        }

        if (btn) {
            observeElementInOut(btn, {
                onEnter() {
                    setTimeout(() => transitionCta && transitionCta(btn, 'enter'), stagger * 3);
                }
            });
        }
    });
})();
