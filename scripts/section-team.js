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

        // ── Proportional text scroll ──────────────────────────────────────
        //
        // The .team-text-col is a sticky 100vh clip window. JS drives a
        // translateY on .team-text-inner so the text content scrolls in
        // proportion to how far the user has scrolled through the section.
        //
        // Mapping:
        //   progress = 0  →  section top  at viewport top   (translateY = 0)
        //   progress = 1  →  section bottom at viewport bottom (translateY = −maxScroll)
        //
        // maxScroll = max(0, textInner.scrollHeight − 100vh)
        // If the text fits entirely in the viewport, nothing moves (sticky).
        //
        // Result: text always finishes scrolling at the exact moment the
        // last poster reaches the bottom of the viewport.

        let ticking = false;

        function tick() {
            ticking = false;

            // On mobile the layout is single-column and the text col
            // is back in normal flow — clear any transform and bail.
            if (window.innerWidth <= 768) {
                textInner.style.transform = '';
                return;
            }

            const vh       = window.innerHeight;
            const rect     = section.getBoundingClientRect();
            const sectionH = section.offsetHeight;

            // Total scrollable distance for this section
            const totalScroll = sectionH - vh;
            if (totalScroll <= 0) {
                textInner.style.transform = 'translateY(0)';
                return;
            }

            // How far the section top has passed above the viewport top
            // (negative rect.top → we've scrolled past the section start)
            const progress = Math.max(0, Math.min(1, -rect.top / totalScroll));

            // How much the text content overflows the sticky 100vh column
            const maxScroll = Math.max(0, textInner.scrollHeight - vh);

            // Text shorter than the viewport → leave it pinned at the top
            if (maxScroll === 0) {
                textInner.style.transform = 'translateY(0)';
                return;
            }

            const offset = (progress * maxScroll).toFixed(2);
            textInner.style.transform = `translateY(${-offset}px)`;
        }

        function schedule() {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(tick);
            }
        }

        // Drive scroll via the project-wide Lenis scroll event
        window.addEventListener('lenis-scroll', schedule);

        // Also respond to resize (column heights change, recalculate)
        window.addEventListener('resize', schedule, { passive: true });

        // Initial pass — two rAF frames to let the grid paint first
        requestAnimationFrame(() => requestAnimationFrame(tick));
    });
})();
