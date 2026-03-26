/* what we do section (about-us.html) — scatter images + fixed body text + persistent menu */

(function () {
    const { staggerTime } = window.AnimationUtils || {};

    // ── scatter images ────────────────────────────────────────────────────────

    const MOBILE_BREAKPOINT           = 768;
    const STEP_Y_MOBILE               = 150;
    const STEP_Y_DESKTOP              = 130;
    const COL_LEFT_X_MIN              = -5;
    const COL_LEFT_X_MAX              = 12;
    const COL_RIGHT_X_MIN             = 75;
    const COL_RIGHT_X_MAX             = 95;
    const IMG_WIDTH_MOBILE_MIN        = 40;
    const IMG_WIDTH_MOBILE_MAX        = 55;
    const IMG_WIDTH_DESKTOP_MIN       = 7;
    const IMG_WIDTH_DESKTOP_MAX       = 15;
    const IMG_JITTER_RANGE            = 80;
    const IMG_Z_INDEX_MAX             = 20;
    const IMG_VARIATION_MIN_DIFF      = 0.2;
    const IMG_SCALE_MIN               = 1.0;
    const IMG_SCALE_MAX               = 1.0;
    const IMG_DEPTH_PARALLAX_STRENGTH = 0.28;
    const IMG_SPEED_FACTOR_MIN        = 0.90;
    const IMG_SPEED_FACTOR_MAX        = 1.10;
    // How much same-column images may overlap (px) before the resolver pushes them apart.
    // Negative = overlap is allowed; the resolver only kicks in beyond this threshold.
    const IMG_OVERLAP_MIN_GAP         = -250;
    // Parallax convergence safety multiplier (× vpH). Keeps images from hiding each
    // other *due to parallax* even when natural overlap is permitted.
    const IMG_PARALLAX_SAFETY_DEPTH   = 0.35; // × vpH

    // section height is explicit — images are normalized to fill it
    const SLIDE_HEIGHT_VH_DESKTOP     = 0.75;
    const SLIDE_HEIGHT_VH_MOBILE      = 0.90;
    const NUM_SLIDES                  = 4;

    function getVariedRandom(min, max, previousValue = null, minDiff = IMG_VARIATION_MIN_DIFF) {
        if (previousValue === null) return Math.floor(Math.random() * (max - min + 1)) + min;
        const range       = max - min;
        const minDistance = range * minDiff;
        let attempts = 0, value;
        do {
            value = Math.floor(Math.random() * (max - min + 1)) + min;
            attempts++;
        } while (Math.abs(value - previousValue) < minDistance && attempts < 10);
        return value;
    }

    function initScatter(section, viewport) {
        const track  = section.querySelector('.about-image-track');
        const images = track ? Array.from(track.querySelectorAll('.scatter-img')) : [];
        const state  = { trackHeight: 0, fullHeight: 0 };

        function initLayout() {
            const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
            const stepY    = isMobile ? STEP_Y_MOBILE : STEP_Y_DESKTOP;
            const vpW      = window.innerWidth;
            const vpH      = window.innerHeight;
            const minW     = isMobile ? IMG_WIDTH_MOBILE_MIN  : IMG_WIDTH_DESKTOP_MIN;
            const maxW     = isMobile ? IMG_WIDTH_MOBILE_MAX  : IMG_WIDTH_DESKTOP_MAX;

            // explicit section height — images will be normalized to fill this
            const slideHeightVH     = isMobile ? SLIDE_HEIGHT_VH_MOBILE : SLIDE_HEIGHT_VH_DESKTOP;
            const totalSlideHeight  = NUM_SLIDES * slideHeightVH * vpH;
            const sectionPadding    = parseFloat(getComputedStyle(section).paddingTop) || 0;
            const fullSectionHeight = sectionPadding + totalSlideHeight;

            let currentY   = 0;
            const prevLeft  = { x: null, w: null };
            const prevRight = { x: null, w: null };

            // ── first pass: assign initial positions ──────────────────────────
            const imageData = [];
            images.forEach((img, index) => {
                const isLeft = index % 2 === 0;
                const prev   = isLeft ? prevLeft : prevRight;

                const minX    = isLeft ? COL_LEFT_X_MIN  : COL_RIGHT_X_MIN;
                const maxX    = isLeft ? COL_LEFT_X_MAX  : COL_RIGHT_X_MAX;
                const randomX = getVariedRandom(minX, maxX, prev.x);
                const randomW = getVariedRandom(minW, maxW, prev.w);

                const jitter     = Math.floor(Math.random() * IMG_JITTER_RANGE) - IMG_JITTER_RANGE / 2;
                const naturalTop = currentY + jitter;

                const normalizedSize = (randomW - minW) / Math.max(1, maxW - minW);
                const speedFactor    = parseFloat((
                    IMG_SPEED_FACTOR_MIN + normalizedSize * (IMG_SPEED_FACTOR_MAX - IMG_SPEED_FACTOR_MIN)
                ).toFixed(3));

                imageData.push({ img, naturalTop, widthVw: randomW, x: randomX, normalizedSize, speedFactor });

                prev.x = randomX;
                prev.w = randomW;
                currentY += stepY;
            });

            // ── second pass: resolve same-column overlaps ─────────────────────
            // Use a practical depth estimate (1.5 × vpH) rather than the theoretical
            // maximum to avoid wildly inflating the track height. This covers the range
            // where convergence is actually visible.
            const speedRange     = IMG_SPEED_FACTOR_MAX - IMG_SPEED_FACTOR_MIN;
            const parallaxBuffer = vpH * IMG_PARALLAX_SAFETY_DEPTH * speedRange * IMG_DEPTH_PARALLAX_STRENGTH;

            for (let i = 2; i < imageData.length; i++) {
                const prev = imageData[i - 2]; // same column (step 2)
                const curr = imageData[i];

                const prevWidthPx  = (prev.widthVw / 100) * vpW;
                const prevHeightPx = prevWidthPx * (5 / 4); // aspect-ratio 4:5

                const minRequiredTop = prev.naturalTop + prevHeightPx + parallaxBuffer + IMG_OVERLAP_MIN_GAP;

                if (curr.naturalTop < minRequiredTop) {
                    const delta = minRequiredTop - curr.naturalTop;
                    // Propagate push to all subsequent same-column images
                    for (let j = i; j < imageData.length; j += 2) {
                        imageData[j].naturalTop += delta;
                    }
                }
            }

            // ── third pass: normalize positions to fill section height ─────────
            let rawMinTop = Infinity, rawMaxBottom = -Infinity, bottomImgH = 0;
            imageData.forEach(d => {
                const h = (d.widthVw / 100) * vpW * (5 / 4);
                if (d.naturalTop < rawMinTop) rawMinTop = d.naturalTop;
                if (d.naturalTop + h > rawMaxBottom) { rawMaxBottom = d.naturalTop + h; bottomImgH = h; }
            });
            const srcRange = (rawMaxBottom - bottomImgH) - rawMinTop;
            const dstRange = fullSectionHeight - bottomImgH;
            if (srcRange > 0 && dstRange > 0) {
                imageData.forEach(d => {
                    d.naturalTop = ((d.naturalTop - rawMinTop) / srcRange) * dstRange;
                });
            }

            // ── apply final positions ─────────────────────────────────────────
            imageData.forEach(({ img, naturalTop, widthVw, x, normalizedSize, speedFactor }) => {
                img.style.width            = `${widthVw}vw`;
                img.style.left             = `${x}%`;
                img.style.top              = `${naturalTop}px`;
                img.dataset.naturalTop     = String(naturalTop);
                img.style.zIndex           = 1 + Math.round(normalizedSize * (IMG_Z_INDEX_MAX - 1));
                img.dataset.speedFactor    = String(speedFactor);
            });

            state.trackHeight = totalSlideHeight;
            state.fullHeight  = fullSectionHeight;
            if (track) track.style.height = `${state.fullHeight}px`;
        }

        function updateImageScales() {
            if (!viewport) return;
            const viewportRect    = viewport.getBoundingClientRect();
            const viewportCenterY = viewportRect.height / 2;
            const sectionTop      = section.getBoundingClientRect().top;
            const depthOffset     = Math.max(0, viewportRect.height - sectionTop);

            images.forEach((img) => {
                const imgRect    = img.getBoundingClientRect();
                const imgCenterY = imgRect.top + imgRect.height / 2 - viewportRect.top;
                const dist       = Math.abs(imgCenterY - viewportCenterY);
                const proximity  = 1 - Math.min(dist / (viewportRect.height / 2), 1);
                const scale      = IMG_SCALE_MIN + (IMG_SCALE_MAX - IMG_SCALE_MIN) * proximity;

                const speedFactor = parseFloat(img.dataset.speedFactor ?? '1');
                const parallaxY   = depthOffset * (1 - speedFactor) * IMG_DEPTH_PARALLAX_STRENGTH;

                const naturalTop  = parseFloat(img.dataset.naturalTop ?? '0');
                const imgH        = img.offsetHeight;
                const minParallax = -naturalTop;
                const maxParallax = state.fullHeight - naturalTop - imgH;
                const clampedY    = Math.max(minParallax, Math.min(maxParallax, parallaxY));

                img.style.transform = `translateY(${clampedY.toFixed(2)}px) scale(${scale})`;
            });
        }

        initLayout();
        if (track) track.classList.add('about-image-track-positioned');

        return { state, initLayout, updateImageScales };
    }

    // ── section logic ─────────────────────────────────────────────────────────

    const TIME_FADE_IN  = 0.6;
    const TIME_FADE_OUT = 0.25;
    const BODY_BLUR_PX  = 8;
    const BODY_GAP_VH   = 0.05;

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.getElementById('about');
        if (!section) return;

        const viewport = document.getElementById('scroll-viewport') || null;
        const scatter  = initScatter(section, viewport);

        // ── persistent menu ───────────────────────────────────────────────────

        const menuEl    = section.querySelector('.about-menu-persistent');
        const menuItems = menuEl ? Array.from(menuEl.querySelectorAll('.menu-item')) : [];

        const MENU_ITEM_STAGGER_MS = 120;

        function revealMenuItems() {
            const label = menuEl ? menuEl.querySelector('.menu-label') : null;
            if (label) label.classList.add('is-visible');
            menuItems.forEach((item, i) => {
                item.style.transitionDelay = `${i * MENU_ITEM_STAGGER_MS}ms`;
                item.classList.add('is-revealed');
            });
        }

        function hideMenuItems() {
            const label = menuEl ? menuEl.querySelector('.menu-label') : null;
            if (label) label.classList.remove('is-visible');
            menuItems.forEach(item => {
                item.style.transitionDelay = '0ms';
                item.classList.remove('is-revealed');
            });
        }

        // ── build: fixed body text container + scroll track slides ────────────

        let bodyEl         = null;
        let activeIdx      = 0;
        let wasPinned      = false;
        let menuIsRevealed = false;
        let exitedBottom   = false;

        function buildLayout() {
            const stickyContent = section.querySelector('.about-sticky-content');
            const textBlocks    = Array.from(section.querySelectorAll('.about-text-block'));
            if (!stickyContent || textBlocks.length === 0) return;
            if (scatter.state.trackHeight <= 0) return;

            bodyEl = document.createElement('div');
            bodyEl.className = 'what-we-do-body';
            textBlocks.forEach((block) => bodyEl.appendChild(block));

            const scrollViewport = document.getElementById('scroll-viewport');
            (scrollViewport || document.body).appendChild(bodyEl);

            stickyContent.remove();

            const slideHeight = scatter.state.trackHeight / textBlocks.length;
            const slidesWrap  = document.createElement('div');
            slidesWrap.className = 'about-slides';
            textBlocks.forEach(() => {
                const slide = document.createElement('div');
                slide.className = 'about-slide';
                slide.style.height = `${slideHeight}px`;
                slidesWrap.appendChild(slide);
            });
            section.appendChild(slidesWrap);
        }

        buildLayout();

        function initBlockStates() {
            if (!bodyEl) return;
            const blocks = Array.from(bodyEl.querySelectorAll('.about-text-block'));
            blocks.forEach((block) => {
                block.style.transition    = 'none';
                block.style.opacity       = '0';
                block.style.filter        = `blur(${BODY_BLUR_PX}px)`;
                block.style.pointerEvents = 'none';
            });
            void bodyEl.offsetHeight;
            blocks.forEach((block) => {
                block.style.transition =
                    `opacity ${TIME_FADE_IN}s ease, filter ${TIME_FADE_IN}s ease`;
            });
        }

        initBlockStates();

        // ── block show / hide ─────────────────────────────────────────────────

        function showBlock(block) {
            if (!block) return;
            block.style.transition    = `opacity ${TIME_FADE_IN}s ease, filter ${TIME_FADE_IN}s ease`;
            block.style.opacity       = '1';
            block.style.filter        = 'blur(0px)';
            block.style.pointerEvents = 'auto';
        }

        function hideBlock(block) {
            if (!block) return;
            block.style.transition    = `opacity ${TIME_FADE_OUT}s ease, filter ${TIME_FADE_OUT}s ease`;
            block.style.opacity       = '0';
            block.style.filter        = `blur(${BODY_BLUR_PX}px)`;
            block.style.pointerEvents = 'none';
        }

        function showCtas(block) {
            if (!block) return;
            block.querySelectorAll('.cta-btn').forEach((cta) => {
                if (cta._rollTimeout) clearTimeout(cta._rollTimeout);
                cta.classList.add('is-visible');
                cta._rollTimeout = setTimeout(() => {
                    cta.querySelectorAll('.ui-roll').forEach((r) => r.classList.add('is-visible'));
                }, 500);
            });
        }

        function hideCtas(block) {
            if (!block) return;
            block.querySelectorAll('.cta-btn').forEach((cta) => {
                if (cta._rollTimeout) clearTimeout(cta._rollTimeout);
                cta.querySelectorAll('.ui-roll').forEach((r) => r.classList.remove('is-visible'));
                cta.classList.remove('is-visible');
            });
        }

        // ── scroll track ──────────────────────────────────────────────────────

        let scrollHasFired = false;

        const MENU_OFFSET_VH_DESKTOP = 0.20;
        const MENU_PIN_VH_DESKTOP    = 0.28;
        const MENU_OFFSET_VH_MOBILE  = 0.05;
        const MENU_PIN_VH_MOBILE     = 0.15;

        function calcIsPinned(vpRect, secRect) {
            const isMobile       = window.innerWidth < 768;
            const offsetVH       = isMobile ? MENU_OFFSET_VH_MOBILE : MENU_OFFSET_VH_DESKTOP;
            const pinVH          = isMobile ? MENU_PIN_VH_MOBILE    : MENU_PIN_VH_DESKTOP;
            const vpH            = vpRect.height;
            const menuNaturalTop = secRect.top + offsetVH * vpH;
            return menuNaturalTop <= pinVH * vpH && secRect.bottom >= vpH;
        }

        function calcShouldRevealMenu(vpRect, secRect, isPinned) {
            if (isPinned) return true;
            const isMobile       = window.innerWidth < 768;
            const offsetVH       = isMobile ? MENU_OFFSET_VH_MOBILE : MENU_OFFSET_VH_DESKTOP;
            const vpH            = vpRect.height;
            const menuNaturalTop = secRect.top + offsetVH * vpH;
            return menuNaturalTop < vpH * 0.50 && secRect.bottom > vpH * 0.5;
        }

        function updateActiveSlide() {
            const vpRect  = viewport ? viewport.getBoundingClientRect() : { top: 0, height: window.innerHeight };
            const secRect = section.getBoundingClientRect();

            const isPinned           = calcIsPinned(vpRect, secRect);
            const justBecamePinned   = isPinned && !wasPinned;
            const justBecameUnpinned = !isPinned && wasPinned;

            const shouldReveal = calcShouldRevealMenu(vpRect, secRect, isPinned);
            if (shouldReveal && !menuIsRevealed) {
                revealMenuItems();
                menuIsRevealed = true;
            } else if (!shouldReveal && menuIsRevealed && !exitedBottom) {
                hideMenuItems();
                menuIsRevealed = false;
            }

            // snapshot before the absolute → fixed switch changes the coordinate system
            const menuScreenTop = menuEl ? menuEl.getBoundingClientRect().top : 0;

            if (menuEl) menuEl.classList.toggle('is-pinned', isPinned);

            const blocks = bodyEl ? Array.from(bodyEl.querySelectorAll('.about-text-block')) : [];

            if (justBecamePinned) {
                exitedBottom = false;
                if (menuEl) {
                    // place at pre-switch position, then ease into the CSS pin target
                    menuEl.style.transition = 'none';
                    menuEl.style.top = `${menuScreenTop}px`;
                    void menuEl.offsetHeight;
                    menuEl.style.transition = 'top 0.35s cubic-bezier(0.19, 1, 0.22, 1)';
                    menuEl.style.top = '';
                }
                showBlock(blocks[activeIdx]);
                if (scrollHasFired) showCtas(blocks[activeIdx]);
            }

            if (bodyEl && menuEl && isPinned) {
                const gap = vpRect.height * BODY_GAP_VH;
                bodyEl.style.top = `${menuEl.getBoundingClientRect().bottom + gap}px`;
            }

            if (justBecameUnpinned) {
                const isBottomExit = secRect.bottom < vpRect.height;

                if (menuEl) {
                    menuEl.style.transition = '';
                    const isMobile = window.innerWidth < 768;
                    const pinPx    = (isMobile ? MENU_PIN_VH_MOBILE : MENU_PIN_VH_DESKTOP) * vpRect.height;
                    menuEl.style.top = `${pinPx - secRect.top}px`;
                }

                if (isBottomExit) {
                    exitedBottom = true;
                } else {
                    blocks.forEach((b) => { hideBlock(b); hideCtas(b); });
                }
            }

            wasPinned = isPinned;

            // after bottom exit, keep body tracking the menu so it scrolls away naturally
            if (exitedBottom && !isPinned && bodyEl && menuEl) {
                const gap = vpRect.height * BODY_GAP_VH;
                bodyEl.style.top = `${menuEl.getBoundingClientRect().bottom + gap}px`;
            }

            if (!isPinned && !exitedBottom) {
                menuItems.forEach((item) => item.classList.remove('is-active'));
                return;
            }

            if (!isPinned) return;

            const isMobileCalc = window.innerWidth < 768;
            const offsetPx     = (isMobileCalc ? MENU_OFFSET_VH_MOBILE : MENU_OFFSET_VH_DESKTOP) * vpRect.height;
            const pinPx        = (isMobileCalc ? MENU_PIN_VH_MOBILE    : MENU_PIN_VH_DESKTOP)    * vpRect.height;
            const scrollStart  = pinPx - offsetPx;
            const scrollEnd    = vpRect.height - secRect.height;
            const scrollRange  = scrollStart - scrollEnd;

            const progress   = scrollRange > 0
                ? Math.max(0, Math.min(1, (scrollStart - secRect.top) / scrollRange))
                : 0;
            const closestIdx = Math.min(menuItems.length - 1, Math.floor(progress * menuItems.length));

            menuItems.forEach((item, i) => item.classList.toggle('is-active', i === closestIdx));

            if (closestIdx !== activeIdx) {
                hideCtas(blocks[activeIdx]);
                hideBlock(blocks[activeIdx]);
                showBlock(blocks[closestIdx]);
                if (scrollHasFired) showCtas(blocks[closestIdx]);
                activeIdx = closestIdx;
            }
        }

        (function initMenuState() {
            const vpRect   = viewport ? viewport.getBoundingClientRect() : { top: 0, height: window.innerHeight };
            const secRect  = section.getBoundingClientRect();
            const isPinned = calcIsPinned(vpRect, secRect);
            if (menuEl) menuEl.classList.toggle('is-pinned', isPinned);
            menuItems.forEach((item) => item.classList.remove('is-active'));
            wasPinned = isPinned;
            const shouldReveal = calcShouldRevealMenu(vpRect, secRect, isPinned);
            if (shouldReveal) {
                menuIsRevealed = true;
                window.pageReady.then(() => revealMenuItems());
            }
        })();

        scatter.updateImageScales();

        window.addEventListener('lenis-scroll', () => {
            scrollHasFired = true;
            scatter.updateImageScales();
            updateActiveSlide();
        });

        // ── resize ────────────────────────────────────────────────────────────

        const resizeDebounceMs = typeof staggerTime === 'number' ? staggerTime : 200;
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                scatter.initLayout();
                const slidesAfterResize = section.querySelectorAll('.about-slide');
                if (slidesAfterResize.length > 0) {
                    const slideHeight = scatter.state.trackHeight / slidesAfterResize.length;
                    slidesAfterResize.forEach((s) => { s.style.height = `${slideHeight}px`; });
                }
            }, resizeDebounceMs);
        });
    });
})();
