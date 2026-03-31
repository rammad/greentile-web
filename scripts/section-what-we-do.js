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

    // ── desktop menu animation sequence (progress 0–100) ───────────────
    //   ①  revealAt          — menu items fade in (stagger)
    //   ②  enterStart → end    — slide from below to pinned pos    (easeOut)
    //   ③  slidesStart → end  — cycle through menu items evenly
    //   ④  exitStart → end    — slide upward off screen            (easeIn)
    //   ⑤  hideAt            — menu items fade out
    //
    // Narrower ranges → faster motion;  wider → slower.
    // Travel values set vertical displacement in vh.
    const DESKTOP_MENU = {
        revealAt:     -20,     // menu items fade in (stagger)
        enterStart:   -25,     // begin sliding up from below
        enterEnd:     20,      // arrive at pinned position
        enterTravel:  75,      // vh below pinned position at start
        slidesStart:  -15,      // first item selected
        slidesEnd:    100,      // last item selected
        exitStart:    75,      // begin sliding upward off screen
        exitEnd:      130,     // fully offscreen
        exitTravel:   75,      // vh above pinned position at end
        hideAt:       130,     // menu items fade out
    };

    function easeOutCubic(t) { return 1 - (1 - t) * (1 - t) * (1 - t); }
    function easeInCubic(t)  { return t * t * t; }

    // ── mobile menu animation sequence (progress 0–100) ─────────────
    const MOBILE_MENU = {
        revealAt:     -10,     // menu items fade in (stagger)
        enterStart:   -20,     // begin sliding up from below
        enterEnd:     20,      // arrive at pinned position
        enterTravel:  75,      // vh below pinned position at start
        slidesStart:  -15,      // first item selected
        slidesEnd:    100,      // last item selected
        exitStart:    80,      // begin sliding upward off screen
        exitEnd:      130,     // fully offscreen
        exitTravel:   120,      // vh above pinned position at end
        hideAt:       120,     // menu items fade out
    };

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
                menuEl.style.transform = `translateY(${menuY.toFixed(1)}px)`;
            }

            // ── text block transitions ──────────────────────────────
            if (justBecameActive) {
                showBlock(blocks[activeIdx]);
                if (scrollHasFired) showCtas(blocks[activeIdx]);
            }
            if (justBecameInactive) {
                blocks.forEach(b => { hideBlock(b); hideCtas(b); });
            }

            if (bodyEl && menuEl && isActive) {
                const gap = vpH * BODY_GAP_VH;
                bodyEl.style.top = `${menuEl.getBoundingClientRect().bottom + gap}px`;
            }

            wasActive = isActive;

            // ── active slide index ──────────────────────────────────
            if (sectionProg < cfg.slidesStart) {
                menuItems.forEach(item => item.classList.remove('is-active'));
                return;
            }

            const sp = (cfg.slidesEnd > cfg.slidesStart)
                ? Math.max(0, Math.min(1, (sectionProg - cfg.slidesStart) / (cfg.slidesEnd - cfg.slidesStart)))
                : 0;
            const closestIdx = Math.min(menuItems.length - 1, Math.floor(sp * menuItems.length));

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
            menuItems.forEach(item => item.classList.remove('is-active'));
            wasActive = isActive;

            if (sectionProg >= cfg.revealAt && sectionProg <= cfg.hideAt) {
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
