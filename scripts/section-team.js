/* team section */

(function () {
    const { observeElementInOut } = window.AnimationUtils || {};

    const LINE_STAGGER_MS = 80;

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.getElementById('team');
        if (!section) return;

        const titleLines = [...section.querySelectorAll('.team-title-text.animate-line')];
        const body       = section.querySelector('.team-names.animate-line');
        const posters    = section.querySelectorAll('.team-poster-wrap');

        if (!observeElementInOut) {
            titleLines.forEach(l => l.classList.add('is-visible'));
            if (body) body.classList.add('is-visible');
            posters.forEach(w => w.classList.add('is-visible'));
            return;
        }

        posters.forEach((wrap, i) => {
            wrap.style.transitionDelay = `${i * 80}ms`;
            observeElementInOut(wrap, {
                onEnter: () => wrap.classList.add('is-visible'),
            });
        });

        const firstPoster = posters[0];
        if (!firstPoster) return;

        const root = document.getElementById('scroll-viewport') || null;

        function makeStickObserver(margin, callback) {
            let fired = false;
            const obs = new IntersectionObserver((entries) => {
                if (fired) return;
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        fired = true;
                        obs.disconnect();
                        window.pageReady.then(callback);
                        break;
                    }
                }
            }, { root, rootMargin: margin, threshold: 0 });
            obs.observe(firstPoster);
        }

        makeStickObserver('0px 0px -50% 0px', () => {
            titleLines.forEach((line, i) => {
                setTimeout(() => line.classList.add('is-visible'), i * LINE_STAGGER_MS);
            });
        });

        makeStickObserver('0px 0px -90% 0px', () => {
            if (body) body.classList.add('is-visible');
        });
    });
})();
