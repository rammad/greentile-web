/* team section */

(function () {
    const { observeElementInOut } = window.AnimationUtils || {};
    const LINE_STAGGER_MS = 80;
    const MOBILE_BP = 768;

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.getElementById('team');
        if (!section) return;

        const titleInner = section.querySelector('.team-title-inner');
        const textSticky = section.querySelector('.team-text-sticky');
        const titleCol   = section.querySelector('.team-title-col');
        const titleLines = [...section.querySelectorAll('.team-title-text.animate-line')];
        const posters    = [...section.querySelectorAll('.team-poster-wrap[data-index]')];
        const bodies     = [...section.querySelectorAll('.team-body[data-for-index]')];

        const bodySizer = section.querySelector('.team-body-sizer');
        const bodyMap = {};
        bodies.forEach(b => { bodyMap[b.dataset.forIndex] = b; });

        let activeBody = null;
        let isMobile = window.innerWidth <= MOBILE_BP;

        /* ── fallback ── */

        if (!observeElementInOut) {
            titleLines.forEach(l => l.classList.add('is-visible'));
            posters.forEach(w => w.classList.add('is-visible'));
            bodies.forEach(b => b.classList.add('is-active'));
            if (bodySizer && bodies[0]) bodySizer.style.height = bodies[0].scrollHeight + 'px';
            return;
        }

        /* ── helpers ── */

        function resolveBodyForIndex(idx) {
            if (bodyMap[idx]) return idx;
            const sorted = Object.keys(bodyMap).map(Number).sort((a, b) => a - b);
            let best = sorted[0];
            for (const k of sorted) {
                if (k <= Number(idx)) best = k;
                else break;
            }
            return String(best);
        }

        function activateBodyDesktop(posterEl) {
            const resolved = resolveBodyForIndex(posterEl.dataset.index);
            const body = bodyMap[resolved];
            if (!body || body === activeBody) return;
            if (activeBody) activeBody.classList.remove('is-active');
            body.classList.add('is-active');
            activeBody = body;
            if (bodySizer) bodySizer.style.height = body.scrollHeight + 'px';
        }

        function revealBodyMobile(posterEl) {
            const resolved = resolveBodyForIndex(posterEl.dataset.index);
            const body = bodyMap[resolved];
            if (!body || body.classList.contains('is-active')) return;
            body.classList.add('is-active');
        }

        const root = document.getElementById('scroll-viewport') || null;
        const firstPoster = posters[0];
        if (!firstPoster) return;

        /* ── poster scroll-in (desktop visual slide-up) ── */

        posters.forEach((wrap, i) => {
            wrap.style.transitionDelay = `${i * 80}ms`;
            observeElementInOut(wrap, {
                onEnter: () => wrap.classList.add('is-visible'),
            });
        });

        /* ── desktop: body activates when image > 50% visible ── */

        const desktopBodyObs = new IntersectionObserver((entries) => {
            if (isMobile) return;
            for (const entry of entries) {
                if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                    window.pageReady.then(() => activateBodyDesktop(entry.target));
                }
            }
        }, { root, threshold: [0, 0.5] });

        posters.forEach(p => desktopBodyObs.observe(p));

        /* ── desktop: deactivate body when section leaves viewport ── */

        const CLEANUP_RATIO = 0.15;
        const sectionCleanupObs = new IntersectionObserver((entries) => {
            if (isMobile) return;
            for (const entry of entries) {
                if (entry.intersectionRatio < CLEANUP_RATIO) {
                    if (activeBody) {
                        activeBody.classList.remove('is-active');
                        activeBody = null;
                        if (bodySizer) bodySizer.style.height = '';
                    }
                    if (titleFired) {
                        titleLines.forEach(l => l.classList.remove('is-visible'));
                        titleFired = false;
                        titleObs.observe(firstPoster);
                    }
                }
            }
        }, { root, threshold: [0, CLEANUP_RATIO] });

        sectionCleanupObs.observe(section);

        /* ── mobile: title + body animate in with observer ── */

        observeElementInOut(titleCol, {
            onEnter: () => {
                if (!isMobile) return;
                titleLines.forEach((line, i) => {
                    setTimeout(() => line.classList.add('is-visible'), i * LINE_STAGGER_MS);
                });
            },
        });

        posters.forEach(poster => {
            observeElementInOut(poster, {
                onEnter: () => {
                    if (!isMobile) return;
                    revealBodyMobile(poster);
                },
            });
        });

        /* ── fixed→sticky hand-off (desktop only) ── */

        const els = [titleInner, textSticky];
        let pinned = false;

        function pxVar(expression) {
            const tmp = document.createElement('div');
            tmp.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;height:${expression}`;
            document.body.appendChild(tmp);
            const val = tmp.getBoundingClientRect().height;
            tmp.remove();
            return val;
        }

        function applyFixed() {
            if (window.innerWidth <= MOBILE_BP) { removeFixed(); return; }
            const top = pxVar('calc(var(--space-for-nav) + 20px)');
            els.forEach(el => {
                const rect = el.getBoundingClientRect();
                Object.assign(el.style, {
                    position: 'fixed',
                    top:    `${top}px`,
                    left:   `${rect.left}px`,
                    width:  `${rect.width}px`,
                    height: 'calc(100vh - var(--space-for-nav) - 40px)',
                });
            });
            pinned = true;
        }

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

        function waitForStickThenUnpin() {
            const stickyTop = pxVar('calc(var(--space-for-nav) + 20px)');
            function check() {
                if (firstPoster.getBoundingClientRect().top <= stickyTop + 1) {
                    removeFixed();
                    window.removeEventListener('lenis-scroll', check);
                }
            }
            window.addEventListener('lenis-scroll', check);
            check();
        }

        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (!handedOff) applyFixed();
                updateLayout();
            }, 50);
        });

        /* ── mobile ↔ desktop layout switching ── */

        function arrangeForMobile() {
            const imagesCol = section.querySelector('.team-images-col');
            bodies.forEach(body => {
                const idx = body.dataset.forIndex;
                const poster = imagesCol.querySelector(`.team-poster-wrap[data-index="${idx}"]`);
                if (poster) poster.after(body);
            });
        }

        function arrangeForDesktop() {
            bodies.forEach(body => bodySizer.appendChild(body));
        }

        function updateLayout() {
            const nowMobile = window.innerWidth <= MOBILE_BP;
            if (nowMobile === isMobile) return;
            isMobile = nowMobile;
            if (isMobile) arrangeForMobile();
            else arrangeForDesktop();
        }

        if (isMobile) arrangeForMobile();

        /* ── desktop: title entrance trigger ── */

        let titleFired = false;
        const titleObs = new IntersectionObserver((entries) => {
            if (titleFired || isMobile) return;
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    titleFired = true;
                    titleObs.disconnect();
                    window.pageReady.then(() => {
                        titleLines.forEach((line, i) => {
                            setTimeout(() => line.classList.add('is-visible'), i * LINE_STAGGER_MS);
                        });
                        waitForStickThenUnpin();
                    });
                    break;
                }
            }
        }, { root, rootMargin: '0px 0px -75% 0px', threshold: 0 });

        titleObs.observe(firstPoster);
    });
})();
