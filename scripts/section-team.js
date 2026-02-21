/* team section */

(function () {
    const { observeElementInOut } = window.AnimationUtils || {};

    document.addEventListener('DOMContentLoaded', () => {
        const section   = document.getElementById('team');
        if (!section) return;

        const textInner = section.querySelector('.team-text-inner');
        const posters   = section.querySelectorAll('.team-poster-wrap');

        // ── Poster entrance animations ────────────────────────────────────
        // Each poster fades + slides up when it scrolls into view.
        // Stagger delay increases per poster so they cascade nicely.
        if (observeElementInOut && posters.length) {
            posters.forEach((wrap, i) => {
                wrap.style.transitionDelay = `${i * 80}ms`;
                observeElementInOut(wrap, {
                    onEnter: () => wrap.classList.add('is-visible'),
                });
            });
        } else {
            // Fallback: make all posters visible if AnimationUtils isn't ready
            posters.forEach(w => w.classList.add('is-visible'));
        }

        if (!textInner) return;

        const textCol = section.querySelector('.team-text-col');

        // ── Proportional text scroll ──────────────────────────────────────
        //
        // The .team-text-col is a sticky clip window. JS drives a
        // translate3d on .team-text-inner so the text content scrolls in
        // proportion to how far the user has scrolled through the section.
        //
        // Mapping:
        //   progress = 0  →  section top  at viewport top   (offset = 0)
        //   progress = 1  →  section bottom at viewport bottom (offset = maxScroll)
        //
        // Jitter-free: we cache layout measurements at load/resize so the
        // hot scroll path never triggers a forced reflow. Scroll position
        // comes from the Lenis event detail — no getBoundingClientRect().

        // Cached layout values — stable between resizes
        let sectionTop   = 0; // section.offsetTop within scroll-content
        let totalScroll  = 0; // section.offsetHeight - vh
        let maxScroll    = 0; // how much text overflows the clip column

        function recalc() {
            const vh     = window.innerHeight;
            sectionTop   = section.offsetTop;
            totalScroll  = section.offsetHeight - vh;
            const colH   = textCol ? textCol.offsetHeight : vh;
            maxScroll    = Math.max(0, textInner.scrollHeight - colH);
        }

        let currentScroll = 0;
        let ticking       = false;

        function tick() {
            ticking = false;

            if (window.innerWidth <= 768) {
                textInner.style.transform = '';
                return;
            }

            if (totalScroll <= 0 || maxScroll === 0) {
                textInner.style.transform = 'translate3d(0,0,0)';
                return;
            }

            const progress = Math.max(0, Math.min(1,
                (currentScroll - sectionTop) / totalScroll
            ));

            // Round to whole pixels — fractional values cause the GPU to
            // interpolate between pixels, which blurs/jitters text on some
            // names while leaving others fine depending on their start alignment.
            const offset = Math.round(progress * maxScroll);
            textInner.style.transform = `translate3d(0, ${-offset}px, 0)`;
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

        // Initial measurement + render once layout is settled
        requestAnimationFrame(() => { recalc(); requestAnimationFrame(tick); });
    });
})();
