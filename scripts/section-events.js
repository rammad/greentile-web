/* events section – one-time entrance when visible, then stay */

(function () {
    const { transitionHeader, transitionCta, observeElementInOut, staggerTime } = window.AnimationUtils || {};

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.querySelector('.events-section');
        if (!section) return;

        const title = document.getElementById('event-title');
        const cards = section.querySelectorAll('.event-card');
        const btn = section.querySelector('.cta-btn');

        if (title) {
            observeElementInOut(title, {
                onEnter() {
                    if (transitionHeader) transitionHeader(title, 'enter');
                }
            });
        }

        if (btn) {
            observeElementInOut(btn, {
                onEnter() {
                    if (transitionCta) transitionCta(btn, 'enter');
                }
            });
        }

        cards.forEach((card, i) => {
            observeElementInOut(card, {
                onEnter() {
                    const delay = (staggerTime || 200) + i * 100;
                    setTimeout(() => card.classList.add('is-visible'), delay);
                }
            });
        });
    });
})();
