/* scroll – single Lenis instance on #scroll-viewport / #scroll-content */

(function () {
    let lenis = null;
    const isTouchDevice = matchMedia('(pointer: coarse)').matches;

    function init() {
        const viewport = document.getElementById('scroll-viewport');
        const content = document.getElementById('scroll-content');
        if (!viewport || !content) return;

        if (isTouchDevice) {
            initNativeTouch(viewport);
        } else {
            initLenis(viewport, content);
        }

        initGradientSectionObserver(viewport);
    }

    function initNativeTouch(viewport) {
        viewport.style.overflow = 'auto';
        viewport.style.overscrollBehavior = 'none';

        const shim = { get scroll() { return viewport.scrollTop; } };
        window.lenis = shim;

        let rafPending = false;
        viewport.addEventListener('scroll', () => {
            if (rafPending) return;
            rafPending = true;
            requestAnimationFrame(() => {
                rafPending = false;
                window.dispatchEvent(
                    new CustomEvent('lenis-scroll', { detail: { scroll: viewport.scrollTop } })
                );
            });
        }, { passive: true });
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
