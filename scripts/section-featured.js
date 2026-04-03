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
    const _s = (window.AppUtils && window.AppUtils.getLayoutScale) ? window.AppUtils.getLayoutScale() : 1;
    const BG_PX      =  480 * _s;
    const MARQUEE_PX = -120 * _s;
    const POSTER_PX  = -240 * _s;

    document.addEventListener('DOMContentLoaded', () => {
        const section      = document.querySelector('.featured-section');
        if (!section) return;

        const frame        = section.querySelector('.featured-frame');
        const marqueeLayer = section.querySelector('.featured-marquee-layer:not(.featured-marquee-bottom)');
        const marqueeBottom = section.querySelector('.featured-marquee-bottom');
        const posterWrap   = section.querySelector('.featured-poster-wrap');
        const bgImg        = section.querySelector('.featured-bg-img');

        let sectionCenterY = 0;
        let sectionHeight  = 1;
        let cachedVH = window.innerHeight;
        let lastWidth = window.innerWidth;
        const isMobile = window.matchMedia('(max-width: 1024px)').matches;
        let isNearViewport = true;

        const recalcLayout = () => {
            lastWidth = window.innerWidth;
            cachedVH = window.innerHeight;
            if (isMobile && frame) {
                sectionCenterY = section.offsetTop + frame.offsetTop + frame.offsetHeight * 0.5;
                sectionHeight  = frame.offsetHeight;
            } else {
                sectionCenterY = section.offsetTop + section.offsetHeight * 0.5;
                sectionHeight  = section.offsetHeight;
            }
        };

        document.fonts.ready.then(recalcLayout);
        window.addEventListener('resize', () => {
            if (isMobile && window.innerWidth === lastWidth) return;
            recalcLayout();
        });

        const visObs = new IntersectionObserver(([e]) => { isNearViewport = e.isIntersecting; }, {
            rootMargin: '25%'
        });
        visObs.observe(section);

        const applyPositions = (scrollY) => {
            if (!isNearViewport) return;
            const delta = (scrollY + cachedVH * 0.5 - sectionCenterY) / sectionHeight;
            const marqueePx = isMobile ? POSTER_PX : MARQUEE_PX;

            if (bgImg) {
                bgImg.style.transform = `translate3d(0,${(delta * BG_PX).toFixed(2)}px,0)`;
            }
            if (marqueeLayer) {
                marqueeLayer.style.transform = `translate3d(0,${(delta * marqueePx).toFixed(2)}px,0)`;
            }
            if (marqueeBottom) {
                marqueeBottom.style.transform = `translate3d(0,${(delta * marqueePx).toFixed(2)}px,0)`;
            }
            if (posterWrap) {
                posterWrap.style.transform = `translate3d(0,${(delta * POSTER_PX).toFixed(2)}px,0)`;
            }
        };

        window.addEventListener('lenis-scroll', ({ detail }) => {
            applyPositions(detail.scroll);
        }, { passive: true });

        requestAnimationFrame(() => {
            applyPositions(window.lenis ? window.lenis.scroll : window.scrollY);
        });
    });
})();
