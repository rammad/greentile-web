/* team section */

(function () {
    const { observeElementInOut } = window.AnimationUtils || {};

    document.addEventListener('DOMContentLoaded', () => {
        const section   = document.getElementById('team');
        if (!section) return;

        const textInner = section.querySelector('.team-text-inner');
        const titleCol  = section.querySelector('.team-title-col');
        const posters   = section.querySelectorAll('.team-poster-wrap');

        // staggered fade+slide on each poster as it enters view
        if (observeElementInOut && posters.length) {
            posters.forEach((wrap, i) => {
                wrap.style.transitionDelay = `${i * 80}ms`;
                observeElementInOut(wrap, {
                    onEnter: () => wrap.classList.add('is-visible'),
                });
            });
        } else {
            posters.forEach(w => w.classList.add('is-visible'));
        }

        if (!textInner) return;

        const textCol = section.querySelector('.team-text-col');

        // proportional text scroll:
        // .team-text-col is a sticky clip window; js drives translateY on .team-text-inner
        // so text scrolls in proportion to how far through the section we are.
        // layout is cached at load/resize so the scroll path never triggers a reflow.

        let sectionTop   = 0;
        let totalScroll  = 0;
        let maxScroll    = 0;
        let exitStart    = 0;

        function recalc() {
            const vh     = window.innerHeight;
            sectionTop   = section.offsetTop;
            totalScroll  = section.offsetHeight - vh;
            const colH   = textCol ? textCol.offsetHeight : vh;
            maxScroll    = Math.max(0, textInner.scrollHeight - colH);
            exitStart    = Math.max(0, sectionTop + section.offsetHeight - vh);
        }

        let currentScroll = 0;
        let ticking       = false;

        function tick() {
            ticking = false;

            if (window.innerWidth <= 768) {
                textInner.style.transform = '';
                if (titleCol) titleCol.style.transform = '';
                return;
            }

            if (totalScroll <= 0 || maxScroll === 0) {
                textInner.style.transform = 'translate3d(0,0,0)';
                if (titleCol) titleCol.style.transform = '';
                return;
            }

            const progress = Math.max(0, Math.min(1,
                (currentScroll - sectionTop) / totalScroll
            ));

            // round to whole pixels — fractional values blur text on some gpus
            const offset = Math.round(progress * maxScroll);
            textInner.style.transform = `translate3d(0, ${-offset}px, 0)`;

            // release title from sticky once the section bottom enters the viewport
            if (titleCol) {
                if (exitStart > 0 && currentScroll > exitStart) {
                    const pushUp = Math.round(currentScroll - exitStart);
                    titleCol.style.transform = `translate3d(0, ${-pushUp}px, 0)`;
                } else {
                    titleCol.style.transform = '';
                }
            }
        }

        function schedule(e) {
            currentScroll = e.detail.scroll;
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(tick);
            }
        }

        window.addEventListener('lenis-scroll', schedule);

        window.addEventListener('resize', () => {
            recalc();
            ticking = false;
            requestAnimationFrame(tick);
        }, { passive: true });

        requestAnimationFrame(() => { recalc(); requestAnimationFrame(tick); });
    });
})();
