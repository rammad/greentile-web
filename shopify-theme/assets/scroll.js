/* scroll – single Lenis instance on #scroll-viewport / #scroll-content */

(function () {
    let lenis = null;

    function init() {
        const viewport = document.getElementById('scroll-viewport');
        const content = document.getElementById('scroll-content');
        if (!viewport || !content || typeof Lenis === 'undefined') return;

        const opts = window.AnimationUtils || {};
        lenis = new Lenis({
            wrapper: viewport,
            content: content,
            lerp: opts.lenisLerp ?? 0.18,
            duration: opts.lenisDuration ?? 0.4,
            wheelMultiplier: opts.lenisWheelMultiplier ?? 1.2,
            easing: (t) => 1 - Math.pow(1 - t, 4),
            smoothWheel: true
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
        initGradientSectionObserver(viewport);
    }

    function initGradientSectionObserver(viewport) {
        const sections = document.querySelectorAll('section[data-colors]');
        if (!sections.length) return;
        const ratios = new Map();
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => ratios.set(e.target, e.intersectionRatio));
                let maxRatio = 0;
                let activeSection = null;
                ratios.forEach((r, el) => {
                    if (r > maxRatio && r > 0.2) {
                        maxRatio = r;
                        activeSection = el;
                    }
                });
                sections.forEach((s) => s.classList.remove('is-active'));
                if (activeSection) activeSection.classList.add('is-active');
            },
            { root: viewport, threshold: [0, 0.2, 0.5, 0.8, 1] }
        );
        sections.forEach((s) => observer.observe(s));
        sections[0]?.classList.add('is-active');
    }

    document.addEventListener('DOMContentLoaded', init);
})();
