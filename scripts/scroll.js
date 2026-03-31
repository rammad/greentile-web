/* scroll – single Lenis instance on #scroll-viewport / #scroll-content */

(function () {
    let lenis = null;
    const isTouchDevice = matchMedia('(pointer: coarse)').matches;

    var _defaultTouchMult = 1.0;

    function init() {
        const viewport = document.getElementById('scroll-viewport');
        const content = document.getElementById('scroll-content');
        if (!viewport || !content) return;

        if (isTouchDevice) initPullToRefresh(viewport);
        initLenis(viewport, content);
        if (isTouchDevice) initTouchSpeedZones(viewport);
        initGradientSectionObserver(viewport);
    }

    function initPullToRefresh(viewport) {
        let startY = 0;
        let lastDy = 0;
        let state = 'idle';
        const DIR_THRESHOLD = 4;
        const RELOAD_THRESHOLD = 120;

        const indicator = document.createElement('div');
        indicator.className = 'ptr-indicator';
        document.body.appendChild(indicator);

        viewport.addEventListener('touchstart', (e) => {
            if (lenis && lenis.scroll <= 5) {
                startY = e.touches[0].clientY;
                lastDy = 0;
                state = 'deciding';
            } else {
                state = 'idle';
            }
        }, { capture: true, passive: true });

        viewport.addEventListener('touchmove', (e) => {
            if (state === 'idle' || state === 'scrolling') return;

            lastDy = e.touches[0].clientY - startY;

            if (state === 'deciding') {
                e.stopImmediatePropagation();
                if (Math.abs(lastDy) >= DIR_THRESHOLD) {
                    state = lastDy > 0 ? 'pulling' : 'scrolling';
                }
                return;
            }

            if (state === 'pulling') {
                e.stopImmediatePropagation();
                if (lastDy <= 0) {
                    state = 'idle';
                    hideIndicator();
                    return;
                }
                showIndicator(lastDy);
            }
        }, { capture: true, passive: true });

        viewport.addEventListener('touchend', () => {
            if (state === 'pulling' && lastDy >= RELOAD_THRESHOLD) {
                indicator.classList.add('is-reloading');
                location.reload();
                return;
            }
            state = 'idle';
            lastDy = 0;
            hideIndicator();
        }, { capture: true, passive: true });

        viewport.addEventListener('touchcancel', () => {
            state = 'idle';
            lastDy = 0;
            hideIndicator();
        }, { capture: true, passive: true });

        function showIndicator(dy) {
            var peek = Math.min(dy * 0.35, 55);
            var spin = dy * 1.8;
            indicator.style.transition = 'none';
            indicator.style.opacity = '1';
            indicator.style.transform =
                'translateY(calc(-100% + ' + peek + 'px)) rotate(' + spin + 'deg)';
        }

        function hideIndicator() {
            indicator.style.transition = '';
            indicator.style.opacity = '0';
            indicator.style.transform = 'translateY(-100%)';
        }
    }

    function initLenis(viewport, content) {
        if (typeof Lenis === 'undefined') return;

        const opts = window.AnimationUtils || {};
        lenis = new Lenis({
            wrapper: viewport,
            content: content,
            lerp: opts.lenisLerp ?? 0.18,
            duration: opts.lenisDuration ?? 0.4,
            wheelMultiplier: opts.lenisWheelMultiplier ?? 1.2,
            easing: (t) => 1 - Math.pow(1 - t, 4),
            smoothWheel: true,
            syncTouch: isTouchDevice,
            syncTouchLerp: 0.075,
            touchMultiplier: _defaultTouchMult,
            touchInertiaMultiplier: 25,
        });

        lenis.on('scroll', () => {
            window.dispatchEvent(new CustomEvent('lenis-scroll', { detail: { scroll: lenis.scroll } }));
        });

        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);

        window.lenis = lenis;
    }

    function initTouchSpeedZones(viewport) {
        const zones = document.querySelectorAll('[data-touch-speed]');
        if (!zones.length) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => { e.target._tsInView = e.isIntersecting; });
                let active = null;
                zones.forEach((z) => { if (z._tsInView) active = z; });
                const mult = active ? parseFloat(active.dataset.touchSpeed) || _defaultTouchMult : _defaultTouchMult;
                if (lenis && lenis.virtualScroll) {
                    lenis.virtualScroll.touchMultiplier = mult;
                }
            },
            { root: viewport, threshold: [0, 0.3] }
        );
        zones.forEach((z) => observer.observe(z));
    }

    function initGradientSectionObserver(viewport) {
        const sections = document.querySelectorAll('section[data-colors]');
        if (!sections.length) return;
        const coverages = new Map();
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => {
                    const vpH = e.rootBounds?.height || window.innerHeight;
                    coverages.set(e.target, e.intersectionRect.height / vpH);
                });
                let maxCoverage = 0;
                let activeSection = null;
                coverages.forEach((c, el) => {
                    if (c > maxCoverage && c > 0.05) {
                        maxCoverage = c;
                        activeSection = el;
                    }
                });
                sections.forEach((s) => s.classList.remove('is-active'));
                if (activeSection) activeSection.classList.add('is-active');
            },
            { root: viewport, threshold: Array.from({ length: 21 }, (_, i) => i * 0.05) }
        );
        sections.forEach((s) => observer.observe(s));
        sections[0]?.classList.add('is-active');
    }

    document.addEventListener('DOMContentLoaded', init);
})();
