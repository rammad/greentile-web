/* team section */

(function () {
    const { observeElementInOut, staggerTime } = window.AnimationUtils || {};

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.getElementById('team');
        if (!section) return;

        const title    = section.querySelector('.animate-line');
        const body     = section.querySelector('.type-body1, .type-body2');
        const posters  = section.querySelectorAll('.team-poster-wrap');
        const stagger  = staggerTime || 120;

        if (!observeElementInOut) {
            if (title) title.classList.add('is-visible');
            if (body) body.classList.add('is-visible');
            posters.forEach(w => w.classList.add('is-visible'));
            return;
        }

        if (title) {
            observeElementInOut(title, {
                onEnter() { title.classList.add('is-visible'); }
            });
        }

        if (body) {
            observeElementInOut(body, {
                onEnter() { setTimeout(() => body.classList.add('is-visible'), stagger); }
            });
        }

        posters.forEach((wrap, i) => {
            wrap.style.transitionDelay = `${i * 80}ms`;
            observeElementInOut(wrap, {
                onEnter: () => wrap.classList.add('is-visible'),
            });
        });
    });
})();
