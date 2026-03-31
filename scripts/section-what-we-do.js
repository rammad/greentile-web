/* what we do section (about-us.html) — column images + fixed body text + persistent menu
   Image layout is handled by scatter-images.js (column-based system).
   Desktop and mobile share the same column layout — no separate mobile codepath. */

(function () {
    const { staggerTime } = window.AnimationUtils || {};

    // ── section logic ─────────────────────────────────────────────────────────

    // ── text block transitions ────────────────────────────────────────────
    const TIME_FADE_IN        = 0.6;   // seconds — body text fade-in duration
    const TIME_FADE_OUT       = 0.25;  // seconds — body text fade-out duration
    const BODY_BLUR_PX        = 8;     // px — blur on hidden body text blocks
    const BODY_GAP_VH         = 0.05;  // vh — gap between menu bottom and body text top

    // ── menu entrance (desktop) ──────────────────────────────────────────
    const MENU_START_VH           = 0.3;
    const MENU_SCROLL_RATE        = 0.75;
    const MENU_EASE_PX            = 500;

    // ── menu entrance (mobile) ───────────────────────────────────────────
    const MENU_START_VH_MOBILE    = 0.15;
    const MENU_SCROLL_RATE_MOBILE = 0.90;
    const MENU_EASE_PX_MOBILE     = 120;

    // ── menu exit (desktop) ──────────────────────────────────────────────
    const MENU_EXIT_START         = 100;
    const MENU_EXIT_RATE          = 0.75;
    const MENU_EXIT_EASE_PX       = 300;

    // ── menu exit (mobile) ───────────────────────────────────────────────
    const MENU_EXIT_START_MOBILE  = 140;
    const MENU_EXIT_RATE_MOBILE   = 0.85;
    const MENU_EXIT_EASE_PX_MOBILE = 300;

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.getElementById('about');
        if (!section) return;

        const viewport   = document.getElementById('scroll-viewport') || null;
        const textBlocks = Array.from(section.querySelectorAll('.about-text-block'));
        const numSlides  = textBlocks.length || 4;
        const menuEl     = section.querySelector('.about-menu-persistent');
        const isMobile   = window.innerWidth < 768;

        const scatter = window.ScatterImages.init(section, viewport, numSlides, {});

        // ── persistent menu ───────────────────────────────────────────────────
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
        let wasActive      = false;
        let menuIsRevealed = false;

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
        }

        function hideBlock(block) {
            if (!block) return;
            block.style.transition    = `opacity ${TIME_FADE_OUT}s ease, filter ${TIME_FADE_OUT}s ease`;
            block.style.opacity       = '0';
            block.style.filter        = `blur(${BODY_BLUR_PX}px)`;
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

        // ── menu activation trigger ─────────────────────────────────────────
        const MENU_REVEAL_VH_DESKTOP = 0.05;  // vh — section top must reach this far down viewport to activate (desktop)
        const MENU_REVEAL_VH_MOBILE  = 0.35;  // vh — same trigger for mobile

        function updateActiveSlide() {
            const vpRect    = viewport ? viewport.getBoundingClientRect() : { top: 0, height: window.innerHeight };
            const secRect   = section.getBoundingClientRect();
            const vpH       = vpRect.height;
            const blocks    = bodyEl ? Array.from(bodyEl.querySelectorAll('.about-text-block')) : [];
            const revealVH  = isMobile ? MENU_REVEAL_VH_MOBILE : MENU_REVEAL_VH_DESKTOP;

            const isActive           = secRect.top <= revealVH * vpH && secRect.bottom > 0;
            const justBecameActive   = isActive && !wasActive;
            const justBecameInactive = !isActive && wasActive;

            if (isActive && !menuIsRevealed) {
                revealMenuItems();
                menuIsRevealed = true;
            } else if (!isActive && menuIsRevealed) {
                hideMenuItems();
                menuIsRevealed = false;
            }

            if (justBecameActive) {
                showBlock(blocks[activeIdx]);
                if (scrollHasFired) showCtas(blocks[activeIdx]);
            }

            if (justBecameInactive) {
                blocks.forEach(b => { hideBlock(b); hideCtas(b); });
            }

            if (menuEl) {
                const mStartVH  = isMobile ? MENU_START_VH_MOBILE    : MENU_START_VH;
                const mRate     = isMobile ? MENU_SCROLL_RATE_MOBILE : MENU_SCROLL_RATE;
                const mEase     = isMobile ? MENU_EASE_PX_MOBILE     : MENU_EASE_PX;
                const mExStart  = isMobile ? MENU_EXIT_START_MOBILE  : MENU_EXIT_START;
                const mExRate   = isMobile ? MENU_EXIT_RATE_MOBILE   : MENU_EXIT_RATE;
                const mExEase   = isMobile ? MENU_EXIT_EASE_PX_MOBILE : MENU_EXIT_EASE_PX;

                const startPx = mStartVH * vpH;

                const scrollPast = revealVH * vpH - secRect.top;
                const brakeDist  = mRate * mEase / 2;

                let menuTravel = 0;
                if (scrollPast > 0) {
                    if (brakeDist < startPx) {
                        const linearDist   = startPx - brakeDist;
                        const linearScroll = linearDist / mRate;
                        if (scrollPast <= linearScroll) {
                            menuTravel = scrollPast * mRate;
                        } else {
                            const t = Math.min(1, (scrollPast - linearScroll) / mEase);
                            menuTravel = linearDist + mRate * mEase * (t - t * t / 2);
                        }
                    } else {
                        const v0 = 2 * startPx / mEase;
                        const t  = Math.min(1, scrollPast / mEase);
                        menuTravel = v0 * mEase * (t - t * t / 2);
                    }
                }

                const progress = Math.min(1, menuTravel / startPx);

                const entryY = startPx * (1 - progress);

                let exitY = 0;
                const distToBottom = secRect.bottom - vpH;
                const exitScroll   = Math.max(0, mExStart - distToBottom);
                if (exitScroll > 0) {
                    if (exitScroll <= mExEase) {
                        const t = exitScroll / mExEase;
                        exitY = -(mExRate * mExEase * t * t / 2);
                    } else {
                        const easeDist = mExRate * mExEase / 2;
                        exitY = -(easeDist + mExRate * (exitScroll - mExEase));
                    }
                }

                menuEl.style.transform = `translateY(${(entryY + exitY).toFixed(1)}px)`;
            }

            if (bodyEl && menuEl && isActive) {
                const gap = vpH * BODY_GAP_VH;
                bodyEl.style.top = `${menuEl.getBoundingClientRect().bottom + gap}px`;
            }

            wasActive = isActive;

            if (!isActive) {
                menuItems.forEach(item => item.classList.remove('is-active'));
                return;
            }

            const scrollStart = revealVH * vpH;
            const scrollEnd   = vpH - secRect.height;
            const scrollRange = scrollStart - scrollEnd;

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
            const vpRect  = viewport ? viewport.getBoundingClientRect() : { top: 0, height: window.innerHeight };
            const secRect = section.getBoundingClientRect();
            const revealVH = isMobile ? MENU_REVEAL_VH_MOBILE : MENU_REVEAL_VH_DESKTOP;
            const isActive = secRect.top <= revealVH * vpRect.height && secRect.bottom > 0;
            menuItems.forEach(item => item.classList.remove('is-active'));
            wasActive = isActive;
            if (isActive) {
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

        // ── mobile snap-to-slide ────────────────────────────────────────────

        if (isMobile && viewport) {
            const SWIPE_THRESHOLD = 30;
            const SNAP_OFFSET_VH  = 0.16;
            const SNAP_LERP       = 0.04;
            const SNAP_EPSILON    = 0.5;

            let touchStartY  = 0;
            let touchActive  = false;
            let snapping     = false;
            let snapTarget   = 0;
            let snapIdx      = -1;

            function getSlideScroll(idx) {
                const vpH        = window.innerHeight;
                const revealVH   = MENU_REVEAL_VH_MOBILE;
                const scrollStart = revealVH * vpH;
                const scrollRange = scrollStart - (vpH - section.offsetHeight);
                const progress    = (idx + 0.1) / menuItems.length;
                return section.offsetTop - scrollStart + progress * scrollRange + SNAP_OFFSET_VH * vpH;
            }

            function animateSnap() {
                if (!snapping) return;
                const current = viewport.scrollTop;
                const diff    = snapTarget - current;
                if (Math.abs(diff) < SNAP_EPSILON) {
                    viewport.scrollTop = snapTarget;
                    snapping = false;
                    return;
                }
                viewport.scrollTop = current + diff * SNAP_LERP;
                requestAnimationFrame(animateSnap);
            }

            section.addEventListener('touchstart', (e) => {
                if (!wasActive) return;
                touchStartY = e.touches[0].clientY;
                touchActive = true;
                snapping    = false;
            }, { passive: true });

            section.addEventListener('touchmove', (e) => {
                if (!touchActive) return;
                const deltaY   = touchStartY - e.touches[0].clientY;
                const swipeUp  = deltaY > 0;
                const atTop    = activeIdx === 0 && !swipeUp;
                const atBottom = activeIdx === menuItems.length - 1 && swipeUp;
                if (atTop || atBottom) {
                    touchActive = false;
                    return;
                }
                e.preventDefault();
            }, { passive: false });

            section.addEventListener('touchend', (e) => {
                if (!touchActive) return;
                touchActive = false;

                const deltaY = touchStartY - e.changedTouches[0].clientY;
                if (Math.abs(deltaY) < SWIPE_THRESHOLD) return;

                const targetIdx = deltaY > 0
                    ? Math.min(menuItems.length - 1, activeIdx + 1)
                    : Math.max(0, activeIdx - 1);

                if (targetIdx === snapIdx && snapping) return;

                snapIdx    = targetIdx;
                snapTarget = getSlideScroll(targetIdx);
                snapping   = true;
                requestAnimationFrame(animateSnap);
            });
        }

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
