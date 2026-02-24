/* product page */

(() => {
    const { wait, transitionCta, transitionHeader, staggerTime } = window.AnimationUtils;

    document.addEventListener('DOMContentLoaded', () => {
        initProductPage();
        initImageScroll();
        updateQty(0);
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

    function initImageScroll() {
        const MOBILE_BREAKPOINT = 1024;
        if (window.innerWidth <= MOBILE_BREAKPOINT) return;

        const col   = document.querySelector('.pdp-image-col');
        const track = document.querySelector('.pdp-image-track');
        const desc  = document.querySelector('.pdp-desc');
        if (!col || !track) return;

        const LERP   = 0.12;   // smoothing factor (higher = snappier)
        const SCALAR = 0.8;    // wheel delta multiplier

        let targetY  = 0;
        let currentY = 0;
        let rafId    = null;

        function maxScroll() {
            return Math.max(0, track.offsetHeight - col.clientHeight);
        }

        function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

        function tick() {
            currentY += (targetY - currentY) * LERP;
            track.style.transform = `translateY(${-currentY}px)`;
            if (Math.abs(targetY - currentY) > 0.1) {
                rafId = requestAnimationFrame(tick);
            } else {
                currentY = targetY;
                track.style.transform = `translateY(${-currentY}px)`;
                rafId = null;
            }
        }

        function nudge(delta) {
            targetY = clamp(targetY + delta * SCALAR, 0, maxScroll());
            if (!rafId) rafId = requestAnimationFrame(tick);
        }

        // wheel over image col scrolls images; everywhere else scrolls page
        col.addEventListener('wheel', e => {
            e.preventDefault();
            nudge(e.deltaY);
        }, { passive: false });

        // touch swipe on image col
        let touchY = 0;
        col.addEventListener('touchstart', e => {
            touchY = e.touches[0].clientY;
        }, { passive: true });
        col.addEventListener('touchmove', e => {
            const dy = touchY - e.touches[0].clientY;
            touchY   = e.touches[0].clientY;
            nudge(dy);
        }, { passive: true });

        window.addEventListener('resize', () => {
            targetY  = clamp(targetY, 0, maxScroll());
            currentY = targetY;
            track.style.transform = `translateY(${-currentY}px)`;
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
