/* what we do section (about-us.html) — scatter images + fixed body text + persistent menu
   Image scatter layout is now handled by the shared scatter-images.js module. */

(function () {
    const { staggerTime } = window.AnimationUtils || {};

    // ── section logic ─────────────────────────────────────────────────────────

    const TIME_FADE_IN  = 0.6;
    const TIME_FADE_OUT = 0.25;
    const BODY_BLUR_PX  = 8;
    const BODY_GAP_VH   = 0.05;

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.getElementById('about');
        if (!section) return;

        const viewport   = document.getElementById('scroll-viewport') || null;
        const textBlocks = Array.from(section.querySelectorAll('.about-text-block'));
        const numSlides  = textBlocks.length || 4;

        const scatter = window.ScatterImages.init(section, viewport, numSlides);

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
            const blocks        = Array.from(section.querySelectorAll('.about-text-block'));
            if (!stickyContent || blocks.length === 0) return;
            if (scatter.state.trackHeight <= 0) return;

            bodyEl = document.createElement('div');
            bodyEl.className = 'what-we-do-body';
            blocks.forEach((block) => bodyEl.appendChild(block));

            const scrollViewport = document.getElementById('scroll-viewport');
            (scrollViewport || document.body).appendChild(bodyEl);

            stickyContent.remove();

            const slideHeight = scatter.state.trackHeight / blocks.length;
            const slidesWrap  = document.createElement('div');
            slidesWrap.className = 'about-slides';
            blocks.forEach(() => {
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
