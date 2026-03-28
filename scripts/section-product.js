/* product page */

(() => {
    const { wait, transitionCta, transitionHeader, staggerTime, observeElementInOut } = window.AnimationUtils;
    const MOBILE_BREAKPOINT = 1024;

    document.addEventListener('DOMContentLoaded', () => {
        const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;

        const section = document.querySelector('.pdp-section');
        if (section) section.classList.add('is-active');

        if (isMobile) {
            initMobileAnimations(section);
        } else {
            initDesktopAnimations(section);
        }

        initImageScroll();
        initMobileDots();
        initDescFade();
        updateQty(0);
    });

    async function initDesktopAnimations(section) {
        const title = document.querySelector('.pdp-section .animate-cascade');
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

    function initMobileAnimations(section) {
        const title = document.querySelector('.pdp-hero-title');
        const ticketActions = document.querySelector('.ticket-actions');
        const cta = document.querySelector('.cta-btn');

        // images: fade in when the carousel enters the viewport
        const imageCol = document.querySelector('.pdp-image-col');
        observeElementInOut(imageCol, {
            root: null,
            enterThreshold: 0.1,
            onEnter: () => {
                document.querySelectorAll('.pdp-poster').forEach(p => p.classList.add('is-visible'));
            }
        });

        // title + subtitles + tags: animate when the info block scrolls into view
        const infoBlock = document.querySelector('.pdp-info');
        const waitForCascade = () => new Promise(resolve => {
            const el = document.querySelector('.pdp-section .animate-cascade');
            if (!el) { resolve(); return; }
            if (el.classList.contains('is-initialized') && window.playCascade) { resolve(); return; }
            const poll = setInterval(() => {
                if (el.classList.contains('is-initialized') && window.playCascade) {
                    clearInterval(poll);
                    resolve();
                }
            }, 50);
        });

        observeElementInOut(infoBlock, {
            root: null,
            enterThreshold: 0.05,
            onEnter: async () => {
                await waitForCascade();
                const cascadeEl = document.querySelector('.pdp-section .animate-cascade');
                if (cascadeEl) transitionHeader(cascadeEl, 'enter');

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
            }
        });

        // description body text
        const descWrapper = document.querySelector('.pdp-desc-wrapper');
        observeElementInOut(descWrapper, {
            root: null,
            enterThreshold: 0.05,
            onEnter: () => {
                document.querySelectorAll('.type-body1, .type-body2').forEach(el => el.classList.add('is-visible'));
            }
        });

        // sticky purchase bar: slides up after the title enters the viewport, then stays
        if (title && ticketActions) {
            if (cta) {
                cta.classList.add('is-visible');
                const roll = cta.querySelector('.ui-roll');
                if (roll) roll.classList.add('is-visible');
            }

            observeElementInOut(descWrapper, {
                root: null,
                enterThreshold: 0.05,
                onEnter: () => {
                    ticketActions.classList.add('is-sticky-visible');
                }
            });
        }
    }

    function initImageScroll() {
        if (window.innerWidth <= MOBILE_BREAKPOINT) return;

        const col     = document.querySelector('.pdp-image-col');
        const track   = document.querySelector('.pdp-image-track');
        const desc    = document.querySelector('.pdp-desc');
        const wrapper = document.querySelector('.pdp-sticky-wrapper');
        if (!col || !track) return;

        const LERP         = 0.12;  // smoothing factor (higher = snappier)
        const SCALAR       = 0.8;   // wheel delta multiplier for image col
        const DESC_SCALAR  = 0.35;  // slower scroll for description

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

        // Block all page scroll on the sticky wrapper — keeps the one-screen look
        if (wrapper) {
            wrapper.addEventListener('wheel', e => {
                e.preventDefault();
            }, { passive: false });
        }

        // Image col scroll
        col.addEventListener('wheel', e => {
            nudge(e.deltaY);
        }, { passive: true });

        // Description scroll — manual so we control speed (wrapper already blocks default)
        if (desc) {
            desc.addEventListener('wheel', e => {
                desc.scrollTop += e.deltaY * DESC_SCALAR;
            }, { passive: true });
        }

        // Touch swipe on image col
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

    function initMobileDots() {
        if (window.innerWidth > MOBILE_BREAKPOINT) return;

        const track = document.querySelector('.pdp-image-track');
        const container = document.querySelector('.pdp-dots');
        if (!track || !container) return;

        const posters = track.querySelectorAll('.pdp-poster');
        if (!posters.length) return;

        posters.forEach((_, i) => {
            const dot = document.createElement('span');
            dot.classList.add('pdp-dot');
            if (i === 0) dot.classList.add('is-active');
            container.appendChild(dot);
        });

        const dots = container.querySelectorAll('.pdp-dot');

        track.addEventListener('scroll', () => {
            const sl = track.scrollLeft;
            let active = 0;
            posters.forEach((p, i) => {
                if (Math.abs(p.offsetLeft - sl) < Math.abs(posters[active].offsetLeft - sl)) active = i;
            });
            dots.forEach((d, i) => d.classList.toggle('is-active', i === active));
        }, { passive: true });
    }

    function initDescFade() {
        const desc    = document.querySelector('.pdp-desc');
        const wrapper = document.querySelector('.pdp-desc-wrapper');
        if (!desc || !wrapper) return;

        function updateFades() {
            const atTop    = desc.scrollTop <= 2;
            const atBottom = desc.scrollTop + desc.clientHeight >= desc.scrollHeight - 2;
            wrapper.classList.toggle('hide-top-fade', atTop);
            wrapper.classList.toggle('hide-bottom-fade', atBottom);
        }

        desc.addEventListener('scroll', updateFades, { passive: true });
        updateFades();

        // re-check after content/layout settles
        window.addEventListener('resize', updateFades);
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
