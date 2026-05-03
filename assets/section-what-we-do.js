/* what we do section (about-us.html) — column images + fixed body text + persistent menu
   Image layout is handled by scatter-images.js (column-based system).
   Desktop and mobile share the same column layout — no separate mobile codepath. */

(function () {
    const { staggerTime } = window.AnimationUtils || {};

    // section logic

    // text block transitions
    const TIME_FADE_IN        = 0.6;   // seconds — body text fade-in duration
    const TIME_FADE_OUT       = 0.25;  // seconds — body text fade-out duration
    const _wwdScale           = (window.AppUtils && window.AppUtils.getLayoutScale) ? window.AppUtils.getLayoutScale() : 1;
    const BODY_BLUR_PX        = 8 * _wwdScale;
    const BODY_GAP_VH         = 0.05;  // vh — gap between menu bottom and body text top
    const _wwd_isMobile       = window.innerWidth <= 1024;

    const ENTER_PAD_SLIDES = 0.5;
    const EXIT_PAD_SLIDES  = 0.5;
    const PAD_DUPLICATES   = 4;

    // desktop menu animation sequence (progress 0–100)
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
        revealAt:      -5,     // menu items fade in (stagger)
        enterStart:    -15,     // begin sliding up from below
        enterEnd:      30,      // arrive at pinned position
        enterTravel:   75,      // vh below pinned position at start
        firstSlideEnd: 20,      // slide 1 ends → transition to slide 2
        lastSlideEnd:  85,      // last slide ends
        exitStart:     65,      // begin sliding upward off screen
        exitEnd:       115,     // fully offscreen + fade last body/CTA
        exitTravel:    80,      // vh above pinned position at end
        hideAt:        105,     // menu items fade out
    };

    function easeOutCubic(t) { return 1 - (1 - t) * (1 - t) * (1 - t); }
    function easeInCubic(t)  { return t * t * t; }

    // mobile menu animation sequence (progress 0–100)
    const MOBILE_MENU = {
        revealAt:      0,     // menu items fade in (stagger)
        enterStart:    -20,     // begin sliding up from below
        enterEnd:      20,      // arrive at pinned position
        enterTravel:   150,      // vh below pinned position at start
        firstSlideEnd: 20,      // slide 1 ends → transition to slide 2
        lastSlideEnd:  100,     // last slide ends
        exitStart:     70,      // begin sliding upward off screen
        exitEnd:       130,     // fully offscreen + fade last body/CTA
        exitTravel:    150,  // vh above pinned position at end
        hideAt:        110,     // menu items fade out
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

        const wwdTrack = section.querySelector('.about-image-track');
        if (wwdTrack) {
            const srcImgs = Array.from(wwdTrack.querySelectorAll('.scatter-img'));
            if (srcImgs.length > 0) {
                const perSlide  = Math.ceil(srcImgs.length / numSlides);
                const firstPool = srcImgs.slice(0, perSlide);
                const lastPool  = srcImgs.slice(-perSlide);
                const firstRef  = srcImgs[0];

                for (let i = 0; i < PAD_DUPLICATES; i++) {
                    const clone = firstPool[firstPool.length - 1 - (i % firstPool.length)].cloneNode(true);
                    wwdTrack.insertBefore(clone, firstRef);
                }

                for (let i = 0; i < PAD_DUPLICATES; i++) {
                    const clone = lastPool[lastPool.length - 1 - (i % lastPool.length)].cloneNode(true);
                    wwdTrack.appendChild(clone);
                }
            }
        }

        const effectiveSlides = numSlides + ENTER_PAD_SLIDES + EXIT_PAD_SLIDES;
        const scatter = window.ScatterImages.init(section, viewport, effectiveSlides);

        // persistent menu
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

        function setMenuActiveVisual(idx) {
            menuItems.forEach((item, i) => item.classList.toggle('is-active', i === idx));
        }

        // build: fixed body text container + scroll track slides

        let bodyEl         = null;
        let activeIdx      = 0;
        let wasActive      = false;
        let menuIsRevealed = false;
        let exitFaded      = false;
        let _cachedBlocks = [];
        let sharedCta      = null;
        let ctaData        = [];
        let ctaRevealed    = false;
        let menuJumpLockActive = false;
        let menuJumpDisplayIdx = 0;
        let menuJumpTargetIdx = 0;
        let menuJumpTargetScroll = 0;

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

            const baseSlideH = scatter.state.trackHeight / effectiveSlides;
            const slidesWrap = document.createElement('div');
            slidesWrap.className = 'about-slides';
            blocks.forEach((_, i) => {
                const slide = document.createElement('div');
                slide.className = 'about-slide';
                slide.id = 'about-slide-' + i;
                let h = baseSlideH;
                if (i === 0)                  h += ENTER_PAD_SLIDES * baseSlideH;
                if (i === blocks.length - 1)  h += EXIT_PAD_SLIDES * baseSlideH;
                slide.style.height = `${h}px`;
                slidesWrap.appendChild(slide);
            });
            section.appendChild(slidesWrap);
        }

        buildLayout();
        if (bodyEl) _cachedBlocks = Array.from(bodyEl.querySelectorAll('.about-text-block'));

        function buildSharedCta() {
            if (!bodyEl) return;
            ctaData = _cachedBlocks.map((block) => {
                const cta = block.querySelector('.cta-btn');
                if (!cta) return { href: '#', text: '' };
                const data = {
                    href: cta.getAttribute('href') || '#',
                    text: (cta.querySelector('.ui-roll-visible')?.textContent || '').trim(),
                };
                cta.remove();
                return data;
            });

            sharedCta = document.createElement('a');
            sharedCta.className = 'cta-btn wwd-shared-cta';
            sharedCta.href = ctaData[0]?.href || '#';
            const t = ctaData[0]?.text || '';
            sharedCta.innerHTML =
                '<div class="ui-roll roll-hover">' +
                    '<span class="type-subRegular1 ui-roll-layer ui-roll-visible">' + t + '</span>' +
                    '<span class="type-subRegular1 ui-roll-layer ui-roll-hidden">' + t + '</span>' +
                '</div>';
            bodyEl.appendChild(sharedCta);
        }
        buildSharedCta();

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

        // center menu + body vertically

        function positionMenuCenter(vpH) {
            if (!menuEl || !bodyEl) return;
            void menuEl.offsetHeight;

            const navSpace = parseFloat(
                getComputedStyle(document.documentElement).getPropertyValue('--space-for-nav')
            ) || (78 * _wwdScale);
            const nudgeHigher = 8 * _wwdScale;

            const menuH = menuEl.offsetHeight;
            const gap   = vpH * BODY_GAP_VH;

            const blocks = Array.from(bodyEl.querySelectorAll('.about-text-block'));
            let contentH = 0;
            blocks.forEach(b => {
                if (b.offsetHeight > contentH) contentH = b.offsetHeight;
            });
            if (sharedCta) contentH += 40 * _wwdScale + sharedCta.offsetHeight;

            const totalH     = menuH + gap + contentH;
            const availableH = vpH - navSpace - nudgeHigher;
            const idealTop   = navSpace + (availableH - totalH) / 2;

            menuEl.style.top = `${Math.max(navSpace, idealTop)}px`;
        }

        const initVpH = viewport
            ? viewport.getBoundingClientRect().height
            : window.innerHeight;
        positionMenuCenter(initVpH);

        // measure center clearance for image zones

        function measureCenterClearance() {
            let maxW = 0;
            const compact = window.innerWidth <= 1024;

            // Skip menu items on compact — word-spacing:100vw inflates their box width
            if (menuEl && !compact) {
                const items = menuEl.querySelectorAll('.menu-item');
                items.forEach(item => {
                    if (item.offsetWidth > maxW) maxW = item.offsetWidth;
                });
            }

            _cachedBlocks.forEach(b => {
                if (b.offsetWidth > maxW) maxW = b.offsetWidth;
            });

            const padding = compact ? 20 : 60 * _wwdScale;
            const clearance = maxW + padding * 2;
            section.style.setProperty('--center-clearance', clearance + 'px');
        }

        measureCenterClearance();
        scatter.initLayout();

        // block show / hide

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

        function showSharedCta() {
            if (!sharedCta || ctaRevealed) return;
            ctaRevealed = true;
            sharedCta.classList.add('is-visible');
            if (sharedCta._rollTimeout) clearTimeout(sharedCta._rollTimeout);
            sharedCta._rollTimeout = setTimeout(() => {
                sharedCta.querySelectorAll('.ui-roll').forEach(r => r.classList.add('is-visible'));
            }, 500);
        }

        function hideSharedCta() {
            if (!sharedCta) return;
            if (sharedCta._rollTimeout) clearTimeout(sharedCta._rollTimeout);
            sharedCta.querySelectorAll('.ui-roll').forEach(r => r.classList.remove('is-visible'));
            sharedCta.classList.remove('is-visible');
            ctaRevealed = false;
        }

        function updateCtaContent(idx) {
            if (!sharedCta || !ctaData[idx]) return;

            const vis = sharedCta.querySelector('.ui-roll-visible');
            const hid = sharedCta.querySelector('.ui-roll-hidden');
            if (!vis || !hid) return;

            const newText = ctaData[idx].text;
            const newHref = ctaData[idx].href;

            if (vis.textContent.trim() === newText) {
                sharedCta.href = newHref;
                return;
            }

            if (sharedCta._swapTimeout) clearTimeout(sharedCta._swapTimeout);

            const oldW    = sharedCta.getBoundingClientRect().width;
            const oldText = vis.textContent;

            vis.style.transition = 'none';
            hid.style.transition = 'none';

            vis.textContent    = newText;
            vis.style.transform = 'translateY(100%)';

            hid.textContent    = oldText;
            hid.style.transform = 'translateY(0%)';

            const newW = sharedCta.getBoundingClientRect().width;
            sharedCta.style.width = oldW + 'px';

            void sharedCta.offsetWidth;

            vis.style.transition = '';
            hid.style.transition = '';
            sharedCta.style.width = newW + 'px';

            vis.style.transform = 'translateY(0%)';
            hid.style.transform = 'translateY(-100%)';

            sharedCta.href = newHref;

            sharedCta._swapTimeout = setTimeout(() => {
                hid.style.transition = 'none';
                hid.textContent = newText;
                hid.style.transform = '';
                vis.style.transform  = '';
                void sharedCta.offsetWidth;
                hid.style.transition = '';
                sharedCta.style.width = '';
            }, 450);
        }

        // scroll track

        let scrollHasFired = false;

        // menu activation trigger
        const MENU_REVEAL_VH_DESKTOP = 0.05;  // vh — section top must reach this far down viewport to activate (desktop)
        const MENU_REVEAL_VH_MOBILE  = 0.35;  // vh — same trigger for mobile
        /** first-slide anchors target just before clamped enter completion to avoid post-jump menu drift */
        const SLIDE_0_PROG_BEFORE_ENTER_END = 0.01;
        /** last-slide midpoint often sits past exitStart → menu exits; aim just shy of exit while staying in last-slide band (clamp ≥ prog band floor) */
        const SLIDE_LAST_PROG_BEFORE_EXIT = 0.1;
        // Desktop-only menu jump tuning (Lenis call options); normal wheel/trackpad scroll remains unchanged.
        const DESKTOP_JUMP_BASE_DURATION = 1.0;
        const DESKTOP_JUMP_PER_SLIDE_DURATION = 0.5;
        const DESKTOP_JUMP_MAX_DURATION = 2.0;

        function getClampedEnterEnd(cfg) {
            // keep entrance fully complete by the time slide-0 window ends
            return Math.min(cfg.enterEnd, cfg.firstSlideEnd);
        }

        function sectionProgForSlideIndex(idx, n, cfg) {
            if (n <= 0) return cfg.firstSlideEnd;
            if (idx <= 0)
                return Math.max(cfg.revealAt + 0.01, getClampedEnterEnd(cfg) - SLIDE_0_PROG_BEFORE_ENTER_END);
            const remaining = n - 1;
            const slideSpan = cfg.lastSlideEnd - cfg.firstSlideEnd;
            if (idx === n - 1 && remaining > 0) {
                const progMinLast = cfg.firstSlideEnd + ((remaining - 1) / remaining) * slideSpan;
                const progInsideLast = progMinLast + 0.01;
                const beforeExit = cfg.exitStart - SLIDE_LAST_PROG_BEFORE_EXIT;
                return Math.min(
                    cfg.lastSlideEnd - 0.01,
                    Math.max(progInsideLast, beforeExit)
                );
            }
            const sp = (idx - 1 + 0.5) / remaining;
            return cfg.firstSlideEnd + sp * slideSpan;
        }

        function getAboutMaxScroll() {
            if (_isMobileScroll) {
                return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
            }
            const vp = viewport;
            const contentEl = document.getElementById('scroll-content');
            if (!vp || !contentEl) return 0;
            return Math.max(0, contentEl.scrollHeight - vp.clientHeight);
        }

        /** Maps menu index → scroll delta so `updateActiveSlide` picks that slide (same logic as wheel scroll). */
        function scrollToSlideIndex(slideIdx) {
            const n = menuItems.length;
            if (n <= 0 || slideIdx < 0 || slideIdx >= n) return;

            const cfg = isMobile ? MOBILE_MENU : DESKTOP_MENU;
            const revealVH = isMobile ? MENU_REVEAL_VH_MOBILE : MENU_REVEAL_VH_DESKTOP;
            const vpEl = viewport || null;
            const vpHNow = vpEl ? vpEl.getBoundingClientRect().height : window.innerHeight;
            const secRect = section.getBoundingClientRect();
            const progTarget = sectionProgForSlideIndex(slideIdx, n, cfg);

            const scrollStart = revealVH * vpHNow;
            const scrollEnd = vpHNow - secRect.height;
            const scrollRange = scrollStart - scrollEnd;

            const currentScroll =
                !_isMobileScroll && window.lenis
                    ? window.lenis.scroll
                    : !_isMobileScroll && viewport
                        ? viewport.scrollTop
                        : window.scrollY;

            if (scrollRange <= 1) return;

            const desiredTop =
                scrollStart - (progTarget / 100) * scrollRange;
            const delta = secRect.top - desiredTop;
            const maxS = getAboutMaxScroll();
            const nextScroll = Math.max(
                0,
                Math.min(maxS, currentScroll + delta)
            );

            // Lock menu/copy/CTA state during any programmatic jump (desktop + mobile).
            menuJumpLockActive = true;
            menuJumpDisplayIdx = activeIdx;
            menuJumpTargetIdx = slideIdx;
            menuJumpTargetScroll = nextScroll;

            if (!_isMobileScroll && window.lenis) {
                const slidesToJump = Math.max(1, Math.abs(slideIdx - activeIdx));
                const jumpDuration = Math.min(
                    DESKTOP_JUMP_MAX_DURATION,
                    DESKTOP_JUMP_BASE_DURATION + (slidesToJump - 1) * DESKTOP_JUMP_PER_SLIDE_DURATION
                );
                window.lenis.scrollTo(nextScroll, {
                    duration: jumpDuration,
                    easing: (t) => t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2,
                });
            } else if (!_isMobileScroll && viewport) {
                viewport.scrollTo({ top: nextScroll, behavior: 'smooth' });
            } else {
                window.scrollTo({ top: nextScroll, behavior: 'smooth' });
            }
        }

        menuItems.forEach((item) => {
            item.addEventListener('click', (e) => {
                const idx = parseInt(item.getAttribute('data-index') || '0', 10);
                e.preventDefault();
                scrollToSlideIndex(idx);
            });
        });

        (function consumeAboutSlideHash() {
            function tryHash() {
                const m = /^#about-slide-(\d+)$/.exec(location.hash);
                if (!m) return;
                const hi = parseInt(m[1], 10);
                if (hi >= 0 && hi < menuItems.length) scrollToSlideIndex(hi);
            }
            if (typeof window.pageReady !== 'undefined' && window.pageReady && typeof window.pageReady.then === 'function') {
                window.pageReady.then(() => requestAnimationFrame(tryHash));
            } else {
                requestAnimationFrame(tryHash);
            }
            window.addEventListener('hashchange', tryHash);
        })();

        function updateActiveSlide(secRect, vpH) {
            const blocks    = _cachedBlocks;
            const revealVH  = isMobile ? MENU_REVEAL_VH_MOBILE : MENU_REVEAL_VH_DESKTOP;
            const cfg       = isMobile ? MOBILE_MENU : DESKTOP_MENU;
            const currentScrollNow =
                !_isMobileScroll && window.lenis
                    ? window.lenis.scroll
                    : !_isMobileScroll && viewport
                        ? viewport.scrollTop
                        : window.scrollY;

            // section progress
            const scrollStart  = revealVH * vpH;
            const scrollEnd    = vpH - secRect.height;
            const scrollRange  = scrollStart - scrollEnd;
            const sectionProg  = scrollRange > 0
                ? ((scrollStart - secRect.top) / scrollRange) * 100
                : 0;

            const isActive           = secRect.top <= scrollStart && secRect.bottom > 0;
            const justBecameActive   = isActive && !wasActive;
            const justBecameInactive = !isActive && wasActive;

            // menu reveal / transform
            if (menuEl) {
                const shouldShow = sectionProg >= cfg.revealAt && sectionProg <= cfg.hideAt;
                if (shouldShow && !menuIsRevealed)  { revealMenuItems(); menuIsRevealed = true;  }
                if (!shouldShow && menuIsRevealed)   { hideMenuItems();   menuIsRevealed = false; }

                const entryPx = (cfg.enterTravel / 100) * vpH;
                const exitPx  = (cfg.exitTravel  / 100) * vpH;
                let menuY;
                const enterEnd = getClampedEnterEnd(cfg);
                if (sectionProg <= cfg.enterStart) {
                    menuY = entryPx;
                } else if (sectionProg <= enterEnd) {
                    const enterRange = Math.max(0.0001, enterEnd - cfg.enterStart);
                    const t = (sectionProg - cfg.enterStart) / enterRange;
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

            // text block transitions
            if (justBecameActive) {
                exitFaded = false;
                if (menuEl) { menuEl.style.transition = 'none'; menuEl.style.opacity = '1'; }
                if (bodyEl) { bodyEl.style.transition = 'none'; bodyEl.style.opacity = '1'; }
                showBlock(blocks[activeIdx]);
                updateCtaContent(activeIdx);
                if (scrollHasFired) showSharedCta();
            }
            if (justBecameInactive) {
                blocks.forEach(b => { hideBlock(b); });
                hideSharedCta();
                exitFaded = false;
                if (menuEl) { menuEl.style.transition = 'none'; menuEl.style.opacity = '1'; }
                if (bodyEl) { bodyEl.style.transition = 'none'; bodyEl.style.opacity = '1'; }
            }

            wasActive = isActive;

            // active slide index
            const n  = menuItems.length;
            let closestIdx;

            if (sectionProg < cfg.firstSlideEnd) {
                closestIdx = 0;
            } else {
                const sp = (cfg.lastSlideEnd > cfg.firstSlideEnd)
                    ? Math.max(0, Math.min(1, (sectionProg - cfg.firstSlideEnd) / (cfg.lastSlideEnd - cfg.firstSlideEnd)))
                    : 0;
                const remaining = n - 1;
                closestIdx = remaining > 0
                    ? 1 + Math.min(remaining - 1, Math.floor(sp * remaining))
                    : n - 1;
            }

            let effectiveIdx = closestIdx;
            if (menuJumpLockActive) {
                setMenuActiveVisual(menuJumpDisplayIdx);
                effectiveIdx = menuJumpDisplayIdx;
                const distToTarget = Math.abs(currentScrollNow - menuJumpTargetScroll);
                if (closestIdx === menuJumpTargetIdx && distToTarget <= 8) {
                    menuJumpLockActive = false;
                    setMenuActiveVisual(menuJumpTargetIdx);
                    effectiveIdx = menuJumpTargetIdx;
                }
            } else {
                setMenuActiveVisual(closestIdx);
            }

            if (effectiveIdx !== activeIdx) {
                hideBlock(blocks[activeIdx]);
                if (sectionProg < cfg.hideAt) {
                    showBlock(blocks[effectiveIdx]);
                    updateCtaContent(effectiveIdx);
                    if (scrollHasFired) showSharedCta();
                }
                activeIdx = effectiveIdx;
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
                if (scrollHasFired) showSharedCta();
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
            setMenuActiveVisual(0);
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

        // resize

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
                measureCenterClearance();
                const slidesAfterResize = section.querySelectorAll('.about-slide');
                if (slidesAfterResize.length > 0) {
                    const n = slidesAfterResize.length;
                    const baseH = scatter.state.trackHeight / (n + ENTER_PAD_SLIDES + EXIT_PAD_SLIDES);
                    slidesAfterResize.forEach((s, i) => {
                        let h = baseH;
                        if (i === 0)     h += ENTER_PAD_SLIDES * baseH;
                        if (i === n - 1) h += EXIT_PAD_SLIDES * baseH;
                        s.style.height = `${h}px`;
                    });
                }
            }, resizeDebounceMs);
        });
    });
})();
