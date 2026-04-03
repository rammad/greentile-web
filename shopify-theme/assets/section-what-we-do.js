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
    const _wwd_isMobile       = window.innerWidth <= 1024;

    // ── desktop menu animation sequence (progress 0–100) ───────────────
    //   ①  revealAt                    — menu items fade in (stagger)
    //   ②  enterStart → end            — slide from below to pinned pos  (easeOut)
    //   ③  firstSlideEnd → lastSlideEnd — cycle through remaining items
    //   ④  exitStart → end              — slide upward off screen         (easeIn)
    //   ⑤  hideAt                      — menu items fade out
    //
    // Item 1 is always selected by default; firstSlideEnd marks when
    // slide 1 transitions to slide 2.
    // Narrower ranges → faster motion;  wider → slower.
    // Travel values set vertical displacement in vh.
    const DESKTOP_MENU = {
        revealAt:      -15,     // menu items fade in (stagger)
        enterStart:    -20,     // begin sliding up from below
        enterEnd:      25,      // arrive at pinned position
        enterTravel:   75,      // vh below pinned position at start
        firstSlideEnd: 20,      // slide 1 ends → transition to slide 2
        lastSlideEnd:  85,      // last slide ends
        exitStart:     75,      // begin sliding upward off screen
        exitEnd:       130,     // fully offscreen + fade last body/CTA
        exitTravel:    80,      // vh above pinned position at end
        hideAt:        110,     // menu items fade out
        edgeWeight:    0.80,    // edge items get 80% of equal share
    };

    function easeOutCubic(t) { return 1 - (1 - t) * (1 - t) * (1 - t); }
    function easeInCubic(t)  { return t * t * t; }

    // ── mobile menu animation sequence (progress 0–100) ─────────────
    const MOBILE_MENU = {
        revealAt:      0,     // menu items fade in (stagger)
        enterStart:    -10,     // begin sliding up from below
        enterEnd:      20,      // arrive at pinned position
        enterTravel:   75,      // vh below pinned position at start
        firstSlideEnd: 20,      // slide 1 ends → transition to slide 2
        lastSlideEnd:  100,     // last slide ends
        exitStart:     70,      // begin sliding upward off screen
        exitEnd:       140,     // fully offscreen + fade last body/CTA
        exitTravel:    150,  // vh above pinned position at end
        hideAt:        120,     // menu items fade out
        edgeWeight:    1,       // equal time per slide
    };

    // ── image sizing — vw-based with px clamp ────────────────────────
    //   width = clamp(min, vw × viewport-width, max)
    const DESKTOP_IMAGE_SIZE = {
        frontVw: 0.10,  frontMin: 120,  frontMax: 200,
        backVw:  0.07,  backMin:  80,   backMax:  140,
    };
    const MOBILE_IMAGE_SIZE = {
        frontVw: 0.30,  frontMin: 80,   frontMax: 140,
        backVw:  0.26,  backMin:  50,   backMax:  90,
    };

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.getElementById('about');
        if (!section) return;

        const _isMobileScroll = matchMedia('(pointer: coarse)').matches;
        const viewport   = _isMobileScroll ? null : (document.getElementById('scroll-viewport') || null);
        const textBlocks = Array.from(section.querySelectorAll('.about-text-block'));
        const numSlides  = textBlocks.length || 4;
        const menuEl     = section.querySelector('.about-menu-persistent');
        const isMobile   = window.innerWidth <= 1024;

        const scatter = window.ScatterImages.init(section, viewport, numSlides, {
            desktopImages: DESKTOP_IMAGE_SIZE,
            mobileImages:  MOBILE_IMAGE_SIZE,
        });

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
        let exitFaded      = false;
        let _cachedBlocks = [];

        function buildLayout() {
            const stickyContent = section.querySelector('.about-sticky-content');
            const blocks        = Array.from(section.querySelectorAll('.about-text-block'));
            if (!stickyContent || blocks.length === 0) return;
            if (scatter.state.trackHeight <= 0) return;

            bodyEl = document.createElement('div');
            bodyEl.className = 'what-we-do-body';
            blocks.forEach((block) => bodyEl.appendChild(block));

            const appendTarget = _isMobileScroll ? document.body : (document.getElementById('scroll-viewport') || document.body);
            appendTarget.appendChild(bodyEl);

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
        if (bodyEl) _cachedBlocks = Array.from(bodyEl.querySelectorAll('.about-text-block'));

        function initBlockStates() {
            if (!bodyEl) return;
            const blocks = Array.from(bodyEl.querySelectorAll('.about-text-block'));
            blocks.forEach((block) => {
                block.style.transition    = 'none';
                block.style.opacity       = '0';
                if (!_wwd_isMobile) block.style.filter = `blur(${BODY_BLUR_PX}px)`;
            });
            void bodyEl.offsetHeight;
            const trans = _wwd_isMobile
                ? `opacity ${TIME_FADE_IN}s ease`
                : `opacity ${TIME_FADE_IN}s ease, filter ${TIME_FADE_IN}s ease`;
            blocks.forEach((block) => { block.style.transition = trans; });
        }

        initBlockStates();

        // ── center menu + body vertically ───────────────────────────────────

        function positionMenuCenter(vpH) {
            if (!menuEl || !bodyEl) return;
            void menuEl.offsetHeight;

            const navSpace = parseFloat(
                getComputedStyle(document.documentElement).getPropertyValue('--space-for-nav')
            ) || 78;
            const nudgeHigher = 8;

            const menuH = menuEl.offsetHeight;
            const gap   = vpH * BODY_GAP_VH;

            const blocks = Array.from(bodyEl.querySelectorAll('.about-text-block'));
            let contentH = 0;
            blocks.forEach(b => {
                let h = b.offsetHeight;
                const cta = b.querySelector('.cta-btn');
                if (cta) h += 40 + cta.offsetHeight;
                if (h > contentH) contentH = h;
            });

            const totalH     = menuH + gap + contentH;
            const availableH = vpH - navSpace - nudgeHigher;
            const idealTop   = navSpace + (availableH - totalH) / 2;

            menuEl.style.top = `${Math.max(navSpace, idealTop)}px`;
        }

        const initVpH = viewport
            ? viewport.getBoundingClientRect().height
            : window.innerHeight;
        positionMenuCenter(initVpH);

        // ── block show / hide ─────────────────────────────────────────────────

        function showBlock(block) {
            if (!block) return;
            block.style.transition = _wwd_isMobile
                ? `opacity ${TIME_FADE_IN}s ease`
                : `opacity ${TIME_FADE_IN}s ease, filter ${TIME_FADE_IN}s ease`;
            block.style.opacity = '1';
            if (!_wwd_isMobile) block.style.filter = 'blur(0px)';
        }

        function hideBlock(block) {
            if (!block) return;
            block.style.transition = _wwd_isMobile
                ? `opacity ${TIME_FADE_OUT}s ease`
                : `opacity ${TIME_FADE_OUT}s ease, filter ${TIME_FADE_OUT}s ease`;
            block.style.opacity = '0';
            if (!_wwd_isMobile) block.style.filter = `blur(${BODY_BLUR_PX}px)`;
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

        function updateActiveSlide(secRect, vpH) {
            const blocks    = _cachedBlocks;
            const revealVH  = isMobile ? MENU_REVEAL_VH_MOBILE : MENU_REVEAL_VH_DESKTOP;
            const cfg       = isMobile ? MOBILE_MENU : DESKTOP_MENU;

            // ── section progress ────────────────────────────────────
            const scrollStart  = revealVH * vpH;
            const scrollEnd    = vpH - secRect.height;
            const scrollRange  = scrollStart - scrollEnd;
            const sectionProg  = scrollRange > 0
                ? ((scrollStart - secRect.top) / scrollRange) * 100
                : 0;

            const isActive           = secRect.top <= scrollStart && secRect.bottom > 0;
            const justBecameActive   = isActive && !wasActive;
            const justBecameInactive = !isActive && wasActive;

            // ── menu reveal / transform ─────────────────────────────
            if (menuEl) {
                const shouldShow = sectionProg >= cfg.revealAt && sectionProg <= cfg.hideAt;
                if (shouldShow && !menuIsRevealed)  { revealMenuItems(); menuIsRevealed = true;  }
                if (!shouldShow && menuIsRevealed)   { hideMenuItems();   menuIsRevealed = false; }

                const entryPx = (cfg.enterTravel / 100) * vpH;
                const exitPx  = (cfg.exitTravel  / 100) * vpH;
                let menuY;
                if (sectionProg <= cfg.enterStart) {
                    menuY = entryPx;
                } else if (sectionProg <= cfg.enterEnd) {
                    const t = (sectionProg - cfg.enterStart) / (cfg.enterEnd - cfg.enterStart);
                    menuY = (1 - easeOutCubic(t)) * entryPx;
                } else if (sectionProg < cfg.exitStart) {
                    menuY = 0;
                } else if (sectionProg <= cfg.exitEnd) {
                    const t = (sectionProg - cfg.exitStart) / (cfg.exitEnd - cfg.exitStart);
                    menuY = -easeInCubic(t) * exitPx;
                } else {
                    menuY = -exitPx;
                }
                menuEl.style.transform = `translate3d(0,${menuY.toFixed(1)}px,0)`;
            }

            if (bodyEl && menuEl && isActive) {
                const gap = vpH * BODY_GAP_VH;
                bodyEl.style.top = `${menuEl.getBoundingClientRect().bottom + gap}px`;
            }

            // ── text block transitions ──────────────────────────────
            if (justBecameActive) {
                exitFaded = false;
                if (menuEl) { menuEl.style.transition = 'none'; menuEl.style.opacity = '1'; }
                if (bodyEl) { bodyEl.style.transition = 'none'; bodyEl.style.opacity = '1'; }
                showBlock(blocks[activeIdx]);
                if (scrollHasFired) showCtas(blocks[activeIdx]);
            }
            if (justBecameInactive) {
                blocks.forEach(b => { hideBlock(b); hideCtas(b); });
                exitFaded = false;
                if (menuEl) { menuEl.style.transition = 'none'; menuEl.style.opacity = '1'; }
                if (bodyEl) { bodyEl.style.transition = 'none'; bodyEl.style.opacity = '1'; }
            }

            wasActive = isActive;

            // ── active slide index ──────────────────────────────────
            const n  = menuItems.length;
            const ew = cfg.edgeWeight ?? 1;
            let closestIdx;

            if (sectionProg < cfg.firstSlideEnd) {
                closestIdx = 0;
            } else {
                const sp = (cfg.lastSlideEnd > cfg.firstSlideEnd)
                    ? Math.max(0, Math.min(1, (sectionProg - cfg.firstSlideEnd) / (cfg.lastSlideEnd - cfg.firstSlideEnd)))
                    : 0;
                const remaining = n - 1;
                closestIdx = n - 1;
                if (remaining > 2 && ew < 1) {
                    const edge = ew / remaining;
                    const mid  = (1 - 2 * edge) / (remaining - 2);
                    let acc = 0;
                    for (let j = 0; j < remaining; j++) {
                        acc += (j === 0 || j === remaining - 1) ? edge : mid;
                        if (sp < acc) { closestIdx = j + 1; break; }
                    }
                } else if (remaining > 0) {
                    closestIdx = 1 + Math.min(remaining - 1, Math.floor(sp * remaining));
                }
            }

            menuItems.forEach((item, i) => item.classList.toggle('is-active', i === closestIdx));

            if (closestIdx !== activeIdx) {
                hideCtas(blocks[activeIdx]);
                hideBlock(blocks[activeIdx]);
                if (sectionProg < cfg.hideAt) {
                    showBlock(blocks[closestIdx]);
                    if (scrollHasFired) showCtas(blocks[closestIdx]);
                }
                activeIdx = closestIdx;
            }

            if (sectionProg >= cfg.hideAt && !exitFaded) {
                const fadeTrans = `opacity ${TIME_FADE_OUT}s ease`;
                if (menuEl) { menuEl.style.transition = fadeTrans; menuEl.style.opacity = '0'; }
                if (bodyEl) { bodyEl.style.transition = fadeTrans; bodyEl.style.opacity = '0'; }
                exitFaded = true;
            } else if (sectionProg < cfg.hideAt && exitFaded) {
                const fadeTrans = `opacity ${TIME_FADE_IN}s ease`;
                if (menuEl) { menuEl.style.transition = fadeTrans; menuEl.style.opacity = '1'; }
                if (bodyEl) { bodyEl.style.transition = fadeTrans; bodyEl.style.opacity = '1'; }
                showBlock(blocks[activeIdx]);
                if (scrollHasFired) showCtas(blocks[activeIdx]);
                exitFaded = false;
            }
        }

        (function initMenuState() {
            const vpRect   = viewport ? viewport.getBoundingClientRect() : { top: 0, height: window.innerHeight };
            const secRect  = section.getBoundingClientRect();
            const vpH      = vpRect.height;
            const revealVH = isMobile ? MENU_REVEAL_VH_MOBILE : MENU_REVEAL_VH_DESKTOP;
            const cfg      = isMobile ? MOBILE_MENU : DESKTOP_MENU;
            const scrollStart = revealVH * vpH;
            const scrollEnd   = vpH - secRect.height;
            const scrollRange = scrollStart - scrollEnd;
            const sectionProg = scrollRange > 0
                ? ((scrollStart - secRect.top) / scrollRange) * 100
                : 0;

            const isActive = secRect.top <= scrollStart && secRect.bottom > 0;
            menuItems.forEach((item, i) => item.classList.toggle('is-active', i === 0));
            wasActive = isActive;

            if (sectionProg >= cfg.revealAt && sectionProg <= cfg.hideAt) {
                menuIsRevealed = true;
                window.pageReady.then(() => revealMenuItems());
            }
        })();

        scatter.updateImageScales();

        window.addEventListener('lenis-scroll', () => {
            scrollHasFired = true;
            const secRect = section.getBoundingClientRect();
            const vpH     = viewport ? viewport.getBoundingClientRect().height : window.innerHeight;
            updateActiveSlide(secRect, vpH);
            scatter.updateImageScales(vpH, secRect.top);
        });

        // ── resize ────────────────────────────────────────────────────────────

        const resizeDebounceMs = typeof staggerTime === 'number' ? staggerTime : 200;
        let resizeTimer;
        let lastResizeWidth = window.innerWidth;
        window.addEventListener('resize', () => {
            if (window.innerWidth === lastResizeWidth) return;
            lastResizeWidth = window.innerWidth;
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                scatter.initLayout();
                const vpH = viewport ? viewport.getBoundingClientRect().height : window.innerHeight;
                positionMenuCenter(vpH);
                const slidesAfterResize = section.querySelectorAll('.about-slide');
                if (slidesAfterResize.length > 0) {
                    const slideHeight = scatter.state.trackHeight / slidesAfterResize.length;
                    slidesAfterResize.forEach((s) => { s.style.height = `${slideHeight}px`; });
                }
            }, resizeDebounceMs);
        });
    });
})();
