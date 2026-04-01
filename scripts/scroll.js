/* scroll – Lenis on desktop (wheel dampening only), native scroll on mobile */

(function () {
    let lenis = null;
    const isTouchDevice = matchMedia('(pointer: coarse)').matches;

    function init() {
        if (isTouchDevice) {
            initMobile();
        } else {
            initDesktop();
        }
        initGradientSectionObserver();
    }

    /* ── mobile: native document scroll, no wrapper ──────────────────────── */

    function initMobile() {
        const viewport = document.getElementById('scroll-viewport');
        document.documentElement.classList.add('native-scroll');
        if (viewport) {
            viewport.classList.add('native-scroll');
        }

        window.addEventListener('scroll', () => {
            window.dispatchEvent(new CustomEvent('lenis-scroll', {
                detail: { scroll: window.scrollY }
            }));
        }, { passive: true });
    }

    /* ── desktop: Lenis on wrapper for wheel dampening ───────────────────── */

    function initDesktop() {
        const viewport = document.getElementById('scroll-viewport');
        const content  = document.getElementById('scroll-content');
        if (!viewport || !content) return;

        initLenis(viewport, content);
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
            syncTouch: false,
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

    function initGradientSectionObserver() {
        const sections = document.querySelectorAll('section[data-colors]');
        if (!sections.length) return;
        const root = isTouchDevice ? null : (document.getElementById('scroll-viewport') || null);
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
            { root, threshold: Array.from({ length: 21 }, (_, i) => i * 0.05) }
        );
        sections.forEach((s) => observer.observe(s));
        sections[0]?.classList.add('is-active');
    }

    document.addEventListener('DOMContentLoaded', init);
})();
