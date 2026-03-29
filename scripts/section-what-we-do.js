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

        const menuEl    = section.querySelector('.about-menu-persistent');

        const scatter = window.ScatterImages.init(section, viewport, numSlides, {});
        if (menuEl) scatter.avoidanceEl = menuEl;

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
                block.style.pointerEvents = 'none';
            });
            void bodyEl.offsetHeight;
            blocks.forEach((block) => {
                block.style.transition =
                    `opacity ${TIME_FADE_IN}s ease, filter ${TIME_FADE_IN}s ease`;
            });
        }

        initBlockStates();

        // ── mobile edge images ─────────────────────────────────────────────────

        const isMobile = window.innerWidth < 768;
        let mobileImgContainer = null;
        let mobileExiting      = false;
        const mobileGroups = {};

        const MOBILE_IMG_COUNT = 5;
        const MOBILE_IMG_W_MIN = 60;
        const MOBILE_IMG_W_MAX = 90;
        const MOBILE_DRIFT_MIN = 0.3;
        const MOBILE_DRIFT_MAX = 0.3;
        let mobileScrollOrigin = 0;

        function generateSlots(count) {
            var halfL = Math.floor(count / 2);
            var halfR = count - halfL;
            if (Math.random() < 0.5) { var t = halfL; halfL = halfR; halfR = t; }
            var sides = [];
            for (var s = 0; s < halfL; s++) sides.push(true);
            for (var s = 0; s < halfR; s++) sides.push(false);
            for (var si = sides.length - 1; si > 0; si--) {
                var sj = Math.floor(Math.random() * (si + 1));
                var st = sides[si]; sides[si] = sides[sj]; sides[sj] = st;
            }

            var bands = [];
            for (var b = 0; b < count; b++) bands.push(b);
            for (var j = bands.length - 1; j > 0; j--) {
                var k = Math.floor(Math.random() * (j + 1));
                var tmp = bands[j]; bands[j] = bands[k]; bands[k] = tmp;
            }

            var bandH = 100 / count;
            var slots = [];
            for (var i = 0; i < count; i++) {
                var band = bands[i];
                var isLeft = sides[i];
                var vMin = bandH * band + 1;
                var vMax = bandH * (band + 1) - 14;
                var top = vMin + Math.random() * Math.max(0, vMax - vMin);
                var edge = -20 + Math.floor(Math.random() * 16);
                var width = MOBILE_IMG_W_MIN + Math.floor(Math.random() * (MOBILE_IMG_W_MAX - MOBILE_IMG_W_MIN + 1));
                var drift = -(MOBILE_DRIFT_MIN + Math.random() * (MOBILE_DRIFT_MAX - MOBILE_DRIFT_MIN));
                var slot = { top: top + 'vh', width: width, drift: drift };
                if (isLeft) slot.left = edge + 'px';
                else        slot.right = edge + 'px';
                slots.push(slot);
            }
            return slots;
        }

        function buildMobileImages() {
            if (!isMobile) return;
            const track = section.querySelector('.about-image-track');
            if (!track) return;

            const srcImgs = Array.from(track.querySelectorAll('.scatter-img'));
            const groups = {};
            srcImgs.forEach(img => {
                const g = img.dataset.group;
                if (!groups[g]) groups[g] = [];
                groups[g].push(img.src);
            });

            mobileImgContainer = document.createElement('div');
            mobileImgContainer.className = 'wwd-mobile-images';

            Object.keys(groups).forEach(gIdx => {
                const slots = generateSlots(Math.min(groups[gIdx].length, MOBILE_IMG_COUNT));
                groups[gIdx].forEach((src, i) => {
                    if (i >= slots.length) return;
                    const slot = slots[i];
                    const img = document.createElement('img');
                    img.src = src;
                    img.className = 'wwd-mobile-img';
                    img.dataset.group = gIdx;
                    img.style.width = slot.width + 'px';
                    img.dataset.drift = String(slot.drift);
                    img.style.top = slot.top;
                    if (slot.left !== undefined)  img.style.left  = slot.left;
                    if (slot.right !== undefined) img.style.right = slot.right;
                    mobileImgContainer.appendChild(img);
                    if (!mobileGroups[gIdx]) mobileGroups[gIdx] = [];
                    mobileGroups[gIdx].push(img);
                });
            });

            const scrollViewport = document.getElementById('scroll-viewport');
            (scrollViewport || document.body).appendChild(mobileImgContainer);
        }

        buildMobileImages();

        function showMobileGroup(idx, secRect) {
            const imgs = mobileGroups[idx];
            if (!imgs) return;
            if (secRect) mobileScrollOrigin = -secRect.top;
            imgs.forEach((img, i) => {
                img.style.transform = 'translateY(0px)';
                img.style.transition = 'opacity 0.5s ease ' + (i * 0.07) + 's';
                img.style.opacity = '1';
            });
        }

        function hideMobileGroup(idx) {
            const imgs = mobileGroups[idx];
            if (!imgs) return;
            imgs.forEach(img => {
                img.style.transition = 'opacity 0.3s ease';
                img.style.opacity = '0';
            });
        }

        function hideAllMobileGroups() {
            Object.keys(mobileGroups).forEach(g => hideMobileGroup(g));
        }

        function updateMobileDrift(secRect, idx) {
            const imgs = mobileGroups[idx];
            if (!imgs) return;
            const delta = -secRect.top - mobileScrollOrigin;
            imgs.forEach(img => {
                const drift = parseFloat(img.dataset.drift || '0');
                img.style.transform = 'translateY(' + (delta * drift).toFixed(1) + 'px)';
            });
        }

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

        const MENU_REVEAL_VH_DESKTOP = 0.42;
        const MENU_REVEAL_VH_MOBILE  = 0.40;

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
                if (isMobile) showMobileGroup(activeIdx, secRect);
            }

            if (justBecameInactive) {
                blocks.forEach(b => { hideBlock(b); hideCtas(b); });
                if (isMobile) hideAllMobileGroups();
            }

            if (secRect.bottom < vpH) {
                if (menuEl) menuEl.style.transform = `translateY(${secRect.bottom - vpH}px)`;
                if (isMobile && !mobileExiting) { hideAllMobileGroups(); mobileExiting = true; }
            } else {
                if (menuEl) menuEl.style.transform = '';
                if (isMobile && mobileExiting) { showMobileGroup(activeIdx, secRect); mobileExiting = false; }
            }

            if (bodyEl && menuEl && isActive) {
                const gap = vpH * BODY_GAP_VH;
                bodyEl.style.top = `${menuEl.getBoundingClientRect().bottom + gap}px`;
            }

            if (isMobile && isActive) updateMobileDrift(secRect, activeIdx);

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
                if (isMobile) hideMobileGroup(activeIdx);
                showBlock(blocks[closestIdx]);
                if (scrollHasFired) showCtas(blocks[closestIdx]);
                if (isMobile) showMobileGroup(closestIdx, secRect);
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

        if (!isMobile) scatter.updateImageScales();

        window.addEventListener('lenis-scroll', () => {
            scrollHasFired = true;
            if (!isMobile) scatter.updateImageScales();
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
