/* product page */

(() => {
    const { wait, transitionCta, transitionHeader, staggerTime } = window.AnimationUtils;

    // tweak these to adjust the image swipe layout
    const THUMB_W_PCT       = 30;    // thumbnail width as % of image column
    const THUMB_GAP_PCT     = 5;     // gap between thumbnails as %
    const THUMB_STEP_PCT    = THUMB_W_PCT + THUMB_GAP_PCT; // slot size = 35%
    const TAB_OFFSET_PX     = 20;    // px each past image steps right to peek as a tab
    const MOBILE_BREAKPOINT = 1024;

    document.addEventListener('DOMContentLoaded', () => {
        initProductPage();
        updateQty(0);

        if (window.innerWidth > MOBILE_BREAKPOINT) {
            setupImageScrollTrack();
        }
    });

    async function initProductPage() {
        const section = document.querySelector('.pdp-section');
        if (section) section.classList.add('is-active');

        const title = document.querySelector('.animate-cascade');
        if (title) {
            const checkInit = setInterval(async () => {
                if (title.classList.contains('is-initialized') && window.playCascade) {
                    clearInterval(checkInit);
                    transitionHeader(title, 'enter');
                }
            }, 50);
        }

        await wait(staggerTime);

        const subtitles = document.querySelectorAll('.text-mask');
        for (const sub of subtitles) {
            sub.classList.add('is-visible');
            await wait(staggerTime);
        }

        const tags = section.querySelectorAll('.pdp-tag');
        for (const tag of tags) {
            if (!tag.classList.contains('max-qty-label')) tag.classList.add('is-visible');
        }

        await wait(staggerTime);

        const posters = document.querySelectorAll('.pdp-poster');
        posters.forEach(p => p.classList.add('is-visible'));

        await wait(200);

        document.querySelectorAll('.type-body1, .type-body2').forEach(el => el.classList.add('is-visible'));

        const cta = document.querySelector('.cta-btn');
        if (cta) transitionCta(cta, 'enter');
    }

    function setupImageScrollTrack() {
        const imageCol = document.querySelector('.pdp-image-col');
        const desc     = document.querySelector('.pdp-desc');
        const posters  = Array.from(imageCol ? imageCol.querySelectorAll('.pdp-poster') : []);

        if (!imageCol || posters.length < 2) return;

        const N = posters.length;
        let activeIdx   = 0;
        let isAnimating = false;

        const SWIPE_MS   = 500;
        const SWIPE_EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';
        const SWIPE_TRANSITION = [
            `left   ${SWIPE_MS}ms ${SWIPE_EASE}`,
            `width  ${SWIPE_MS}ms ${SWIPE_EASE}`,
            `height ${SWIPE_MS}ms ${SWIPE_EASE}`,
            `top    ${SWIPE_MS}ms ${SWIPE_EASE}`,
        ].join(', ');

        // z-index fixed by sequence order: higher index = higher z
        // so forward swipes cover previous image, backward swipes reveal it underneath
        posters.forEach((poster, i) => { poster.style.zIndex = i + 1; });

        function applyPositions(active, animate) {
            const colW     = imageCol.clientWidth;
            const colH     = imageCol.clientHeight;
            const thumbH   = (colW * THUMB_W_PCT / 100) * (5 / 4);
            const thumbTop = colH - thumbH;

            posters.forEach((poster, i) => {
                poster.style.transition = animate ? SWIPE_TRANSITION : '';
                const ahead = i - active;

                if (ahead < 0) {
                    /* past: full size, staggered right so each peeks as a tab */
                    const tabOffset = Math.abs(ahead) * TAB_OFFSET_PX;
                    poster.style.top    = '0px';
                    poster.style.left   = `${tabOffset}px`;
                    poster.style.width  = '100%';
                    poster.style.height = `${colH}px`;
                } else if (ahead === 0) {
                    /* active: fills column flush to left */
                    poster.style.top    = '0px';
                    poster.style.left   = '0px';
                    poster.style.width  = '100%';
                    poster.style.height = `${colH}px`;
                } else {
                    /* upcoming: thumbnails peeking from the left */
                    const leftPct = -(ahead * THUMB_STEP_PCT);
                    poster.style.top    = `${thumbTop}px`;
                    poster.style.left   = `${leftPct}%`;
                    poster.style.width  = `${THUMB_W_PCT}%`;
                    poster.style.height = `${thumbH}px`;
                }
            });
        }

        // always steps one image at a time so clicking 3 steps away animates through each
        let sequenceTarget = null;

        function stepOnce() {
            if (sequenceTarget === null || activeIdx === sequenceTarget) {
                sequenceTarget = null;
                isAnimating    = false;
                return;
            }
            const dir     = sequenceTarget > activeIdx ? 1 : -1;
            const nextIdx = activeIdx + dir;
            if (nextIdx < 0 || nextIdx >= N) { isAnimating = false; return; }

            isAnimating = true;
            activeIdx   = nextIdx;
            applyPositions(activeIdx, true);

            setTimeout(() => {
                posters.forEach(p => { p.style.transition = ''; });
                stepOnce(); // re-evaluates sequenceTarget each step
            }, SWIPE_MS);
        }

        function goToImage(target) {
            if (target < 0 || target >= N || target === activeIdx) return;
            sequenceTarget = target;
            if (!isAnimating) stepOnce();
            // if mid-animation, stepOnce() will pick up new sequenceTarget when it finishes
        }

        applyPositions(0, false);

        posters.forEach((poster, i) => {
            poster.addEventListener('click', () => goToImage(i));
        });

        // wheel: single step, skip if already animating
        function onWheel(e) {
            if (desc && desc.contains(e.target)) return;
            e.preventDefault();
            if (isAnimating) return;
            goToImage(activeIdx + (e.deltaY > 0 ? 1 : -1));
        }
        window.addEventListener('wheel', onWheel, { passive: false });

        // touch swipe
        let touchY = 0;
        window.addEventListener('touchstart', e => {
            if (desc && desc.contains(e.target)) return;
            touchY = e.touches[0].clientY;
        }, { passive: true });
        window.addEventListener('touchend', e => {
            if (desc && desc.contains(e.target)) return;
            const dy = touchY - e.changedTouches[0].clientY;
            if (Math.abs(dy) > 40) goToImage(activeIdx + (dy > 0 ? 1 : -1));
        }, { passive: true });

        // resize: re-measure and snap to current index
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => applyPositions(activeIdx, false), 150);
        });
    }

    // qty selector
    let qty = 1;
    const MAX_QTY = 4;

    window.updateQty = function(change) {
        const qtyDisplay = document.getElementById('ticket-qty');
        const maxMsg     = document.getElementById('max-qty-msg');
        if (!qtyDisplay) return;

        qty += change;
        if (qty < 1) qty = 1;
        if (qty > MAX_QTY) qty = MAX_QTY;

        qtyDisplay.innerText = qty;
        maxMsg && (qty === MAX_QTY
            ? maxMsg.classList.add('is-visible')
            : maxMsg.classList.remove('is-visible'));
    };
})();
