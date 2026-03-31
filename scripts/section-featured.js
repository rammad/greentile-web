/* featured section – three-layer parallax
 *
 * The section scrolls normally with the page.  Each layer travels at a
 * different speed relative to the viewport, creating the illusion of depth.
 * All layers are at their natural (centred) position when the section centre
 * sits at the viewport centre; they diverge symmetrically as the section
 * enters and exits.
 *
 * delta is normalised by section height (–1 … +1 across the visible range),
 * so the offsets below are in px and stay consistent across screen sizes.
 *
 * Positive px  →  layer lags behind scroll  (feels far away)
 * Negative px  →  layer leads the scroll    (feels closest)
 *
 * Tune only these three values:
 */

(function () {
    const BG_PX      =  480;
    const MARQUEE_PX = -120;
    const POSTER_PX  = -240;

    document.addEventListener('DOMContentLoaded', () => {
        const section      = document.querySelector('.featured-section');
        if (!section) return;

        const marqueeLayer = section.querySelector('.featured-marquee-layer');
        const posterWrap   = section.querySelector('.featured-poster-wrap');
        const bgImg        = section.querySelector('.featured-bg-img');

        let sectionCenterY = 0;
        let sectionHeight  = 1;
        let cachedVH = window.innerHeight;
        let lastWidth = window.innerWidth;

        const recalcLayout = () => {
            lastWidth = window.innerWidth;
            cachedVH = window.innerHeight;
            sectionCenterY = section.offsetTop + section.offsetHeight * 0.5;
            sectionHeight  = section.offsetHeight;
        };

        document.fonts.ready.then(recalcLayout);
        window.addEventListener('resize', () => {
            if (window.innerWidth === lastWidth) return;
            recalcLayout();
        });

        const applyPositions = (scrollY) => {
            const delta = (scrollY + cachedVH * 0.5 - sectionCenterY) / sectionHeight;

            if (bgImg) {
                bgImg.style.transform = `translateY(${(delta * BG_PX).toFixed(2)}px)`;
            }
            if (marqueeLayer) {
                marqueeLayer.style.transform = `translateY(${(delta * MARQUEE_PX).toFixed(2)}px)`;
            }
            if (posterWrap) {
                posterWrap.style.transform = `translateY(${(delta * POSTER_PX).toFixed(2)}px)`;
            }
        };

        window.addEventListener('lenis-scroll', ({ detail }) => {
            applyPositions(detail.scroll);
        }, { passive: true });

        requestAnimationFrame(() => {
            applyPositions(window.lenis ? window.lenis.scroll : 0);
        });
    });
})();
