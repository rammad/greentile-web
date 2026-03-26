/* team section */

(function () {
    const { observeElementInOut } = window.AnimationUtils || {};
    const LINE_STAGGER_MS = 80;
    const ANIM_MS = 700; // matches CSS transition duration

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.getElementById('team');
        if (!section) return;

        const titleInner = section.querySelector('.team-title-inner');
        const textSticky = section.querySelector('.team-text-sticky');
        const titleLines = [...section.querySelectorAll('.team-title-text.animate-line')];
        const body       = section.querySelector('.team-names.animate-line');
        const posters    = section.querySelectorAll('.team-poster-wrap');

        if (!observeElementInOut) {
            titleLines.forEach(l => l.classList.add('is-visible'));
            if (body) body.classList.add('is-visible');
            posters.forEach(w => w.classList.add('is-visible'));
            return;
        }

        // Poster scroll-in animations (unchanged)
        posters.forEach((wrap, i) => {
            wrap.style.transitionDelay = `${i * 80}ms`;
            observeElementInOut(wrap, { onEnter: () => wrap.classList.add('is-visible') });
        });

        const firstPoster = posters[0];
        if (!firstPoster) return;

        const root = document.getElementById('scroll-viewport') || null;
        const els  = [titleInner, textSticky];
        let pinned = false;

        // Resolve a CSS expression to pixels by applying it to a throw-away element
        function pxVar(expression) {
            const tmp = document.createElement('div');
            tmp.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;height:${expression}`;
            document.body.appendChild(tmp);
            const val = tmp.getBoundingClientRect().height;
            tmp.remove();
            return val;
        }

        // Pin both panels as position:fixed at the exact screen coords they occupy when stuck.
        // Horizontal position is measured from the element itself (stable across scroll).
        // Vertical position comes from the CSS sticky-top value.
        function applyFixed() {
            if (window.innerWidth <= 768) { removeFixed(); return; }
            const top = pxVar('calc(var(--space-80) + var(--space-20))');
            els.forEach(el => {
                const rect = el.getBoundingClientRect();
                Object.assign(el.style, {
                    position: 'fixed',
                    top:    `${top}px`,
                    left:   `${rect.left}px`,
                    width:  `${rect.width}px`,
                    height: 'calc(100vh - var(--space-80) - var(--space-40))',
                });
            });
            pinned = true;
        }

        // Remove fixed — elements revert to position:sticky via CSS.
        // Called after the entrance animation completes while the section is still stuck,
        // so there is no visual jump.
        let handedOff = false;
        function removeFixed() {
            if (!pinned) return;
            els.forEach(el => {
                el.style.position = '';
                el.style.top      = '';
                el.style.left     = '';
                el.style.width    = '';
                el.style.height   = '';
            });
            pinned = false;
            handedOff = true;
        }

        applyFixed();

        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (!handedOff) applyFixed();
            }, 50);
        });

        // Hand off from fixed → sticky only once the image is truly at the top,
        // so fixed and sticky positions are identical and there's no jump.
        function waitForStickThenUnpin() {
            const stickyTop = pxVar('calc(var(--space-80) + var(--space-20))');

            function check() {
                if (firstPoster.getBoundingClientRect().top <= stickyTop + 1) {
                    removeFixed();
                    window.removeEventListener('lenis-scroll', check);
                }
            }

            window.addEventListener('lenis-scroll', check);
            check(); // in case we're already past the threshold
        }

        // Trigger: when first poster crosses 75% of viewport height
        let fired = false;
        const obs = new IntersectionObserver((entries) => {
            if (fired) return;
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    fired = true;
                    obs.disconnect();
                    window.pageReady.then(() => {
                        titleLines.forEach((line, i) => {
                            setTimeout(() => line.classList.add('is-visible'), i * LINE_STAGGER_MS);
                        });
                        if (body) body.classList.add('is-visible');
                        waitForStickThenUnpin();
                    });
                    break;
                }
            }
        }, { root, rootMargin: '0px 0px -75% 0px', threshold: 0 });

        obs.observe(firstPoster);
    });
})();
