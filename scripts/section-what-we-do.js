/* what we do section (about-us.html) — fixed body text + persistent menu + scroll tracking */

(function () {
    const { staggerTime } = window.AnimationUtils || {};

    const TIME_FADE_IN    = 0.6;   // seconds
    const TIME_FADE_OUT   = 0.25;  // seconds
    const BODY_BLUR_PX    = 8;

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.getElementById('about');
        if (!section) return;

        const viewport = document.getElementById('scroll-viewport') || null;

        const scatter = window.ScatterImages
            ? window.ScatterImages.init(section, viewport)
            : null;

        // ── persistent menu ───────────────────────────────────────────────────

        const menuEl    = section.querySelector('.about-menu-persistent');
        const menuItems = menuEl ? Array.from(menuEl.querySelectorAll('.menu-item')) : [];


        // ── build: fixed body text container + scroll track slides ────────────

        let bodyEl    = null;
        let activeIdx = 0;
        let wasPinned = false;

        function buildLayout() {
            const stickyContent = section.querySelector('.about-sticky-content');
            const textBlocks    = Array.from(section.querySelectorAll('.about-text-block'));
            if (!stickyContent || textBlocks.length === 0) return;
            if (!scatter || scatter.state.trackHeight <= 0) return;

            bodyEl = document.createElement('div');
            bodyEl.className = 'what-we-do-body';
            textBlocks.forEach((block) => bodyEl.appendChild(block));

            // Attach outside #scroll-content so position:fixed is relative to the
            // real viewport, not Lenis's translateY transform on scroll-content.
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

        /* All blocks start hidden. Commit that state and add transitions.
         * Opacity only ever changes from async lenis-scroll events,
         * so transitions are always already committed when they fire. */
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

        // ── scroll track slides ───────────────────────────────────────────────

        let scrollHasFired = false;

        // These match the CSS values exactly so the absolute→fixed transition is seamless.
        const MENU_OFFSET_VH_DESKTOP = 0.08; // CSS: top: 8vh  (default)
        const MENU_PIN_VH_DESKTOP    = 0.28; // CSS: top: 28vh (pinned)
        const MENU_OFFSET_VH_MOBILE  = 0.05; // CSS: top: 5vh  (mobile)
        const MENU_PIN_VH_MOBILE     = 0.15; // CSS: top: 15vh (mobile pinned)

        function calcIsPinned(vpRect, secRect) {
            const isMobile     = window.innerWidth < 768;
            const offsetVH     = isMobile ? MENU_OFFSET_VH_MOBILE : MENU_OFFSET_VH_DESKTOP;
            const pinVH        = isMobile ? MENU_PIN_VH_MOBILE    : MENU_PIN_VH_DESKTOP;
            const vpH          = vpRect.height;
            // Where the menu's top edge sits in the viewport under natural scroll
            const menuNaturalTop = secRect.top + offsetVH * vpH;
            // Pin when menu has reached target AND section hasn't fully passed
            return menuNaturalTop <= pinVH * vpH && secRect.bottom >= vpH;
        }

        function updateActiveSlide() {
            const vpRect  = viewport ? viewport.getBoundingClientRect() : { top: 0, height: window.innerHeight };
            const secRect = section.getBoundingClientRect();

            const isPinned           = calcIsPinned(vpRect, secRect);
            const justBecamePinned   = isPinned && !wasPinned;
            const justBecameUnpinned = !isPinned && wasPinned;

            if (menuEl) menuEl.classList.toggle('is-pinned', isPinned);

            const blocks = bodyEl ? Array.from(bodyEl.querySelectorAll('.about-text-block')) : [];

            // ── section enters: fade body text in ────────────────────────────
            if (justBecamePinned) {
                // Clear any exit-anchor so CSS top value takes back over
                if (menuEl) menuEl.style.top = '';
                showBlock(blocks[activeIdx]);
                if (scrollHasFired) showCtas(blocks[activeIdx]);
            }

            // ── section exits: hide body text ─────────────────────────────────
            if (justBecameUnpinned) {
                // Anchor menu at its current visual position (pinVH * vpH from top)
                // so it scrolls off naturally instead of snapping to its absolute offset.
                if (menuEl) {
                    const isMobile = window.innerWidth < 768;
                    const pinPx    = (isMobile ? MENU_PIN_VH_MOBILE : MENU_PIN_VH_DESKTOP) * vpRect.height;
                    menuEl.style.top = `${pinPx - secRect.top}px`;
                }
                blocks.forEach((b) => { hideBlock(b); hideCtas(b); });
            }

            wasPinned = isPinned;

            // ── while pinned: menu active item + cross-fade slides ────────────
            if (!isPinned) {
                menuItems.forEach((item) => item.classList.remove('is-active'));
                return;
            }

            // Map scroll progress through the pinned range proportionally to slide index.
            // "Closest-center" logic can never reach the last slide on shorter sections;
            // this approach divides the full pinned scroll range evenly so every item is reachable.
            const isMobileCalc = window.innerWidth < 768;
            const offsetPx     = (isMobileCalc ? MENU_OFFSET_VH_MOBILE : MENU_OFFSET_VH_DESKTOP) * vpRect.height;
            const pinPx        = (isMobileCalc ? MENU_PIN_VH_MOBILE    : MENU_PIN_VH_DESKTOP)    * vpRect.height;
            const scrollStart  = pinPx - offsetPx;              // secRect.top at first pin
            const scrollEnd    = vpRect.height - secRect.height; // secRect.top at forward unpin
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

        // Initial pinning/menu state — no opacity changes; all items start gray
        (function initMenuState() {
            const vpRect   = viewport ? viewport.getBoundingClientRect() : { top: 0, height: window.innerHeight };
            const secRect  = section.getBoundingClientRect();
            const isPinned = calcIsPinned(vpRect, secRect);
            if (menuEl) menuEl.classList.toggle('is-pinned', isPinned);
            menuItems.forEach((item) => item.classList.remove('is-active'));
            wasPinned = isPinned;
        })();

        if (scatter) scatter.updateImageScales();

        window.addEventListener('lenis-scroll', () => {
            scrollHasFired = true;
            if (scatter) scatter.updateImageScales();
            updateActiveSlide();
        });

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
            }, resizeDebounceMs);
        });
    });
})();
