/* featured section – two-phase scroll entry + parallax background
 *
 * Adjust only the three multipliers below — section height is derived automatically.
 *
 * PHASE1_VH  — how many viewport-heights the marquee travels to reach center
 * PHASE2_VH  — how many viewport-heights the poster travels to reach center
 * DWELL_VH   — how long both sit in place before the section releases
 */

(function () {
    const PHASE1_VH      = 0.5;
    const PHASE2_VH      = 0.7;
    const DWELL_VH       = 0.3;
    const PARALLAX_FACTOR = 0.35;

    document.addEventListener('DOMContentLoaded', () => {
        const section      = document.querySelector('.featured-section');
        if (!section) return;

        const marqueeLayer = section.querySelector('.featured-marquee-layer');
        const posterWrap   = section.querySelector('.featured-poster-wrap');
        const bgImg        = section.querySelector('.featured-bg-img');

        // cached layout values — refreshed after fonts load and on resize
        let phaseStart  = 0;
        let phase1Len   = 1;
        let phase2Len   = 1;
        let startOffset = 0;

        const recalcLayout = () => {
            const ih   = window.innerHeight;
            phase1Len  = ih * PHASE1_VH;
            phase2Len  = ih * PHASE2_VH;
            phaseStart = section.offsetTop;
            startOffset = ih;

            // keep section tall enough to fit both phases + dwell
            section.style.minHeight = `${ih + phase1Len + phase2Len + ih * DWELL_VH}px`;

            applyPositions(window.lenis ? window.lenis.scroll : 0);
        };

        document.fonts.ready.then(recalcLayout);
        window.addEventListener('resize', recalcLayout);

        const applyPositions = (scrollY) => {
            const scrolled = scrollY - phaseStart;

            // phase 1: marquee enters
            if (marqueeLayer) {
                const p1 = Math.max(0, Math.min(1, scrolled / phase1Len));
                marqueeLayer.style.transform = `translateY(${(startOffset * (1 - p1)).toFixed(2)}px)`;
            }

            // phase 2: poster enters after marquee has fully arrived
            if (posterWrap) {
                const p2 = Math.max(0, Math.min(1, (scrolled - phase1Len) / phase2Len));
                posterWrap.style.transform = `translateY(${(startOffset * (1 - p2)).toFixed(2)}px)`;
            }
        };

        window.addEventListener('lenis-scroll', ({ detail }) => {
            applyPositions(detail.scroll);
        }, { passive: true });

        // RAF loop: bg parallax runs every frame independent of scroll events
        function tick() {
            if (bgImg) {
                const sectionTop = section.getBoundingClientRect().top;
                bgImg.style.transform = `translateY(${(-sectionTop * PARALLAX_FACTOR).toFixed(2)}px)`;
            }
            requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    });
})();
