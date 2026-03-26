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
        let stuck = false;

        const stickObserver = new IntersectionObserver((entries) => {
            if (stuck) return;
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    stuck = true;
                    stickObserver.disconnect();
                    window.pageReady.then(() => {
                        titleLines.forEach((line, i) => {
                            setTimeout(() => line.classList.add('is-visible'), i * LINE_STAGGER_MS);
                        });
                        if (body) body.classList.add('is-visible');
                    });
                    break;
                }
            }
        }, {
            root,
            rootMargin: '0px 0px -90% 0px',
            threshold: 0,
        });

        stickObserver.observe(firstPoster);
    });
})();
