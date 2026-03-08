/* about section – column-based image scatter + scroll-driven body text */

(function () {
    const { staggerTime } = window.AnimationUtils || {};

    // ── image scatter layout ────────────────────────────────────────────────────
    const MOBILE_BREAKPOINT      = 768;
    const STEP_Y_MOBILE          = 140;
    const STEP_Y_DESKTOP         = 160;
    const COL_LEFT_X_MIN         = -5;
    const COL_LEFT_X_MAX         = 25;
    const COL_RIGHT_X_MIN        = 65;
    const COL_RIGHT_X_MAX        = 95;
    const IMG_WIDTH_MOBILE_MIN   = 40;
    const IMG_WIDTH_MOBILE_MAX   = 55;
    const IMG_WIDTH_DESKTOP_MIN  = 7;
    const IMG_WIDTH_DESKTOP_MAX  = 15;
    const IMG_JITTER_RANGE       = 120;
    const IMG_Z_INDEX_MAX        = 20;
    const IMG_VARIATION_MIN_DIFF = 0.2;

    const IMG_SCALE_MIN = 1.0;
    const IMG_SCALE_MAX = 1.0;

    // larger images scroll faster and sit in front (depth parallax)
    const IMG_DEPTH_PARALLAX_STRENGTH = 0.5;
    const IMG_SPEED_FACTOR_MIN        = 0.8;
    const IMG_SPEED_FACTOR_MAX        = 1.2;

    const CONTENT_FADE_RANGE      = 1.5;
    const CONTENT_PULL_POWER      = 0.6;  // lower = more dramatic slowing near centre
    const CONTENT_OPACITY_FALLOFF = 2;  // opacity → 0 when text is this × halfVH from centre
    const CONTENT_MAX_BLUR        = 8;

    function smoothstep(t) {
        const c = Math.max(0, Math.min(1, t));
        return c * c * (3 - 2 * c);
    }

    function getVariedRandom(min, max, previousValue = null, minDiff = IMG_VARIATION_MIN_DIFF) {
        if (previousValue === null) return Math.floor(Math.random() * (max - min + 1)) + min;
        const range = max - min;
        const minDistance = range * minDiff;
        let attempts = 0, value;
        do {
            value = Math.floor(Math.random() * (max - min + 1)) + min;
            attempts++;
        } while (Math.abs(value - previousValue) < minDistance && attempts < 10);
        return value;
    }

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.getElementById('about');
        if (!section) return;

        const viewport = document.getElementById('scroll-viewport') || null;
        const track    = section.querySelector('.about-image-track');
        const images   = track ? Array.from(track.querySelectorAll('.scatter-img')) : [];
        let trackHeight   = 0;
        let lastScrollY   = 0;
        let scrollDirection = 'down';

        // ── layout ────────────────────────────────────────────────────────────

        const initLayout = () => {
            const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
            const stepY    = isMobile ? STEP_Y_MOBILE : STEP_Y_DESKTOP;
            let currentY   = 0;
            const prevLeft  = { x: null, w: null };
            const prevRight = { x: null, w: null };

            images.forEach((img, index) => {
                const isLeft = index % 2 === 0;
                const prev   = isLeft ? prevLeft : prevRight;

                const minX   = isLeft ? COL_LEFT_X_MIN  : COL_RIGHT_X_MIN;
                const maxX   = isLeft ? COL_LEFT_X_MAX  : COL_RIGHT_X_MAX;
                const randomX = getVariedRandom(minX, maxX, prev.x);

                const minW   = isMobile ? IMG_WIDTH_MOBILE_MIN  : IMG_WIDTH_DESKTOP_MIN;
                const maxW   = isMobile ? IMG_WIDTH_MOBILE_MAX  : IMG_WIDTH_DESKTOP_MAX;
                const randomW = getVariedRandom(minW, maxW, prev.w);

                const jitter = Math.floor(Math.random() * IMG_JITTER_RANGE) - IMG_JITTER_RANGE / 2;
                const naturalTop = currentY + jitter;
                img.style.width  = `${randomW}vw`;
                img.style.left   = `${randomX}%`;
                img.style.top    = `${naturalTop}px`;
                img.dataset.naturalTop = String(naturalTop);

                const normalizedSize = (randomW - minW) / Math.max(1, maxW - minW);
                img.style.zIndex     = 1 + Math.round(normalizedSize * (IMG_Z_INDEX_MAX - 1));
                img.dataset.speedFactor = (
                    IMG_SPEED_FACTOR_MIN + normalizedSize * (IMG_SPEED_FACTOR_MAX - IMG_SPEED_FACTOR_MIN)
                ).toFixed(3);

                prev.x = randomX;
                prev.w = randomW;
                currentY += stepY;
            });

            trackHeight = currentY;
            if (track) track.style.height = `${trackHeight}px`;
        };

        function buildSlideStack() {
            const stickyContent = section.querySelector('.about-sticky-content');
            const textBlocks    = section.querySelectorAll('.about-text-block');
            if (!stickyContent || textBlocks.length === 0 || trackHeight <= 0) return;

            const slideHeight = trackHeight / textBlocks.length;
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

                // CTAs animate in via scroll — is-visible added by updateSlideContent
                // once the parent text block reaches near-centre opacity.
            });

            section.appendChild(slidesWrap);
            stickyContent.remove();
        }

        initLayout();
        buildSlideStack();
        track.classList.add('about-image-track-positioned');

        // ── per-frame updates ─────────────────────────────────────────────────

        function updateImageScales() {
            if (!viewport) return;
            const viewportRect    = viewport.getBoundingClientRect();
            const viewportCenterY = viewportRect.height / 2;
            const sectionTop      = section.getBoundingClientRect().top;
            const depthOffset     = Math.max(0, viewportRect.height - sectionTop);

            images.forEach((img) => {
                const imgRect     = img.getBoundingClientRect();
                const imgCenterY  = imgRect.top + imgRect.height / 2 - viewportRect.top;
                const dist        = Math.abs(imgCenterY - viewportCenterY);
                const proximity   = 1 - Math.min(dist / (viewportRect.height / 2), 1);
                const scale       = IMG_SCALE_MIN + (IMG_SCALE_MAX - IMG_SCALE_MIN) * proximity;
                const speedFactor = parseFloat(img.dataset.speedFactor ?? '1');
                const parallaxY   = depthOffset * (1 - speedFactor) * IMG_DEPTH_PARALLAX_STRENGTH;

                const naturalTop  = parseFloat(img.dataset.naturalTop ?? '0');
                const imgH        = img.offsetHeight;
                const minParallax = -naturalTop;
                const maxParallax = trackHeight - naturalTop - imgH;
                const clampedY    = Math.max(minParallax, Math.min(maxParallax, parallaxY));

                img.style.transform = `translateY(${clampedY.toFixed(2)}px) scale(${scale})`;
            });
        }

        function updateScrollDirection() {
            if (!window.lenis) return;
            const s = window.lenis.scroll;
            if (s > lastScrollY) scrollDirection = 'down';
            else if (s < lastScrollY) scrollDirection = 'up';
            lastScrollY = s;
            section.setAttribute('data-scroll-direction', scrollDirection);
        }

        const slides = section.querySelectorAll('.about-slide');
        let scrollHasFired = false;

        // ── persistent-menu (about-us.html only) ──────────────────────────────
        const hasPersistentMenu = section.classList.contains('has-persistent-menu');
        const menuEl    = hasPersistentMenu ? section.querySelector('.about-menu-persistent') : null;
        const menuItems = menuEl ? Array.from(menuEl.querySelectorAll('.menu-item')) : [];

        if (hasPersistentMenu && menuItems.length > 0) {
            menuItems.forEach(item => item.classList.add('is-visible'));
        }

        function updatePersistentMenu() {
            if (!hasPersistentMenu || !menuEl) return;

            const vpRect  = viewport ? viewport.getBoundingClientRect() : { top: 0, height: window.innerHeight };
            const secRect = section.getBoundingClientRect();

            // pin while section fills the viewport
            const isPinned = secRect.top <= vpRect.top && secRect.bottom >= vpRect.top + vpRect.height;
            menuEl.classList.toggle('is-pinned', isPinned);

            // active item = slide whose sticky centre is closest to viewport centre
            const halfVH  = vpRect.height / 2;
            const vpTop   = vpRect.top;
            let closestIdx  = 0;
            let closestDist = Infinity;

            slides.forEach((slide, i) => {
                const sticky = slide.querySelector('.about-slide-sticky');
                if (!sticky) return;
                const rect    = sticky.getBoundingClientRect();
                const centerY = rect.top + rect.height / 2 - vpTop;
                const dist    = Math.abs(centerY - halfVH);
                if (dist < closestDist) { closestDist = dist; closestIdx = i; }
            });

            menuItems.forEach((item, i) => item.classList.toggle('is-active', i === closestIdx));
        }

        /* Derives body text position, opacity and blur directly from scroll position.
         * Lenis fires this at 60 fps with smooth interpolated values — no additional
         * lerp or CSS transition is needed and both cause jump artifacts. */
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

                // Doppler pull: low PULL_POWER = strong pull = near-zero movement near centre
                const pullFactor  = Math.pow(1 - t, CONTENT_PULL_POWER);
                const translateY  = -stickyTop * pullFactor;

                // Opacity + blur from where the text actually lands on screen after pull
                const textCenterY    = stickyTop + halfVH + translateY;
                const distFromCenter = Math.abs(textCenterY - halfVH);
                const opacityT       = Math.max(0, Math.min(1, distFromCenter / (halfVH * CONTENT_OPACITY_FALLOFF)));
                const opacity        = 1 - smoothstep(opacityT);
                const blur           = CONTENT_MAX_BLUR * opacityT;

                textBlock.style.opacity       = opacity.toFixed(4);
                textBlock.style.filter        = `blur(${blur.toFixed(2)}px)`;
                textBlock.style.transform     = `translateY(${translateY.toFixed(2)}px)`;
                textBlock.style.pointerEvents = opacity > 0.05 ? 'auto' : 'none';

                // Animate CTA in when near centre, out when scrolling away.
                // Guard: skip on the initial synchronous call before any scroll.
                const ctaBtns = textBlock.querySelectorAll('.cta-btn');
                if (scrollHasFired && ctaBtns.length > 0) {
                    const isNear    = opacity > 0.85;
                    const wasNear   = textBlock.dataset.ctaVisible === 'true';

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
            updateImageScales();
            updateSlideContent();
            updatePersistentMenu();
        });

        // run once immediately so values are set before the first scroll event
        updateImageScales();
        updateSlideContent();
        updatePersistentMenu();

        // ── resize ────────────────────────────────────────────────────────────

        let resizeTimer;
        const resizeDebounceMs = typeof staggerTime === 'number' ? staggerTime : 200;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                initLayout();
                const slidesAfterResize = section.querySelectorAll('.about-slide');
                const slideHeight = trackHeight / slidesAfterResize.length;
                slidesAfterResize.forEach((s) => { s.style.height = `${slideHeight}px`; });
                updateSlideContent();
            }, resizeDebounceMs);
        });
    });
})();
