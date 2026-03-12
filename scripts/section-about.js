/* about section (index.html) — slide stack + scroll-driven body text */

(function () {
    const { staggerTime } = window.AnimationUtils || {};

    const CONTENT_FADE_RANGE      = 1.5;
    const CONTENT_PULL_POWER      = 0.6;
    const CONTENT_OPACITY_FALLOFF = 2;
    const CONTENT_MAX_BLUR        = 8;

    function smoothstep(t) {
        const c = Math.max(0, Math.min(1, t));
        return c * c * (3 - 2 * c);
    }

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.getElementById('about');
        if (!section) return;

        const viewport = document.getElementById('scroll-viewport') || null;

        const scatter = window.ScatterImages
            ? window.ScatterImages.init(section, viewport)
            : null;

        // ── slide stack ───────────────────────────────────────────────────────

        function buildSlideStack() {
            const stickyContent = section.querySelector('.about-sticky-content');
            const textBlocks    = section.querySelectorAll('.about-text-block');
            if (!stickyContent || textBlocks.length === 0) return;
            if (!scatter || scatter.state.trackHeight <= 0) return;

            const slideHeight = scatter.state.trackHeight / textBlocks.length;
            const slidesWrap  = document.createElement('div');
            slidesWrap.className = 'about-slides';

            [].forEach.call(textBlocks, (block) => {
                const slide  = document.createElement('div');
                slide.className = 'about-slide';
                slide.style.height = `${slideHeight}px`;

                const sticky = document.createElement('div');
                sticky.className = 'about-slide-sticky';
                sticky.appendChild(block);
                slide.appendChild(sticky);
                slidesWrap.appendChild(slide);
            });

            section.appendChild(slidesWrap);
            stickyContent.remove();
        }

        buildSlideStack();

        // ── per-frame updates ─────────────────────────────────────────────────

        let scrollHasFired = false;

        function updateScrollDirection() {
            if (!window.lenis) return;
            const s = window.lenis.scroll;
            section.setAttribute('data-scroll-direction', s > (section._lastScrollY || 0) ? 'down' : 'up');
            section._lastScrollY = s;
        }

        const slides = section.querySelectorAll('.about-slide');

        function updateSlideContent() {
            const vpH    = viewport ? viewport.getBoundingClientRect().height : window.innerHeight;
            const halfVH = vpH / 2;

            slides.forEach((slide) => {
                const sticky    = slide.querySelector('.about-slide-sticky');
                if (!sticky) return;
                const textBlock = sticky.querySelector('.about-text-block');
                if (!textBlock) return;

                const stickyTop = sticky.getBoundingClientRect().top;
                const d = stickyTop / halfVH;
                const t = Math.max(0, Math.min(1, Math.abs(d) / CONTENT_FADE_RANGE));

                const pullFactor  = Math.pow(1 - t, CONTENT_PULL_POWER);
                const translateY  = -stickyTop * pullFactor;

                const textCenterY    = stickyTop + halfVH + translateY;
                const distFromCenter = Math.abs(textCenterY - halfVH);
                const opacityT       = Math.max(0, Math.min(1, distFromCenter / (halfVH * CONTENT_OPACITY_FALLOFF)));
                const opacity        = 1 - smoothstep(opacityT);
                const blur           = CONTENT_MAX_BLUR * opacityT;

                textBlock.style.opacity       = opacity.toFixed(4);
                textBlock.style.filter        = `blur(${blur.toFixed(2)}px)`;
                textBlock.style.transform     = `translateY(${translateY.toFixed(2)}px)`;
                textBlock.style.pointerEvents = opacity > 0.05 ? 'auto' : 'none';

                const ctaBtns = textBlock.querySelectorAll('.cta-btn');
                if (scrollHasFired && ctaBtns.length > 0) {
                    const isNear  = opacity > 0.85;
                    const wasNear = textBlock.dataset.ctaVisible === 'true';

                    if (isNear && !wasNear) {
                        textBlock.dataset.ctaVisible = 'true';
                        ctaBtns.forEach((cta) => {
                            if (cta._rollTimeout) clearTimeout(cta._rollTimeout);
                            cta.classList.add('is-visible');
                            cta._rollTimeout = setTimeout(() => {
                                cta.querySelectorAll('.ui-roll').forEach((r) => r.classList.add('is-visible'));
                            }, 500);
                        });
                    } else if (!isNear && wasNear) {
                        textBlock.dataset.ctaVisible = 'false';
                        ctaBtns.forEach((cta) => {
                            if (cta._rollTimeout) clearTimeout(cta._rollTimeout);
                            cta.querySelectorAll('.ui-roll').forEach((r) => r.classList.remove('is-visible'));
                            cta.classList.remove('is-visible');
                        });
                    }
                }
            });
        }

        window.addEventListener('lenis-scroll', () => {
            scrollHasFired = true;
            updateScrollDirection();
            if (scatter) scatter.updateImageScales();
            updateSlideContent();
        });

        if (scatter) scatter.updateImageScales();
        updateSlideContent();

        // ── resize ────────────────────────────────────────────────────────────

        const resizeDebounceMs = typeof staggerTime === 'number' ? staggerTime : 200;
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (scatter) scatter.initLayout();
                const slidesAfterResize = section.querySelectorAll('.about-slide');
                if (scatter && slidesAfterResize.length > 0) {
                    const slideHeight = scatter.state.trackHeight / slidesAfterResize.length;
                    slidesAfterResize.forEach((s) => { s.style.height = `${slideHeight}px`; });
                }
                updateSlideContent();
            }, resizeDebounceMs);
        });
    });
})();
