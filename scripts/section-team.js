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

        let activeBody   = null;
        let isMobile     = window.innerWidth <= MOBILE_BP;
        let bodyAllowed  = false;
        let titleShown   = false;
        let titleAnimId  = 0;

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
            if (!bodyAllowed) return;
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

        /* ── desktop: scroll-driven state machine (position + visibility) ── */

        const els = [titleInner, textSticky];
        let pinned = false;
        let cachedStickyTop = null;

        const GONE_THRESHOLD = 0.15;
        const BODY_THRESHOLD = 0.3;

        function pxVar(expression) {
            const tmp = document.createElement('div');
            tmp.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;height:${expression}`;
            document.body.appendChild(tmp);
            const val = tmp.getBoundingClientRect().height;
            tmp.remove();
            return val;
        }

        function getStickyTop() {
            if (cachedStickyTop === null) cachedStickyTop = pxVar('calc(var(--space-for-nav) + 20px)');
            return cachedStickyTop;
        }

        function applyFixed() {
            if (pinned || isMobile) return;
            const top = getStickyTop();
            els.forEach(el => {
                const rect = el.getBoundingClientRect();
                Object.assign(el.style, {
                    position: 'fixed',
                    top:    `${top}px`,
                    left:   `${rect.left}px`,
                    width:  `${rect.width}px`,
                    height: 'calc(100svh - var(--space-for-nav) - 40px)',
                });
            });
            pinned = true;
        }

        function clearFixed() {
            if (!pinned) return;
            els.forEach(el => {
                el.style.position = '';
                el.style.top      = '';
                el.style.left     = '';
                el.style.width    = '';
                el.style.height   = '';
            });
            pinned = false;
        }

        function showTitle() {
            if (titleShown) return;
            titleShown = true;
            const id = ++titleAnimId;
            titleLines.forEach((line, i) => {
                setTimeout(() => {
                    if (titleAnimId === id) line.classList.add('is-visible');
                }, i * LINE_STAGGER_MS);
            });
        }

        function hideTitle() {
            if (!titleShown) return;
            titleAnimId++;
            titleLines.forEach(l => l.classList.remove('is-visible'));
            titleShown = false;
        }

        function hideBody() {
            if (!activeBody) return;
            activeBody.classList.remove('is-active');
            activeBody = null;
            if (bodySizer) bodySizer.style.height = '';
        }

        function updateDesktop() {
            if (isMobile) return;

            const stickyTop = getStickyTop();
            const rect = section.getBoundingClientRect();
            const vh = window.innerHeight;

            const visTop = Math.max(rect.top, 0);
            const visBot = Math.min(rect.bottom, vh);
            const visPx  = Math.max(0, visBot - visTop);

            /* ── gone: section barely / not visible ── */
            if (visPx < vh * GONE_THRESHOLD) {
                clearFixed();
                hideTitle();
                hideBody();
                bodyAllowed = false;
                return;
            }

            /* ── positioning: fixed while section top is below sticky threshold ── */
            if (rect.top > stickyTop) {
                applyFixed();
            } else {
                clearFixed();
            }

            /* ── wait for first poster to be 25 % on-screen before showing title/body ── */
            const posterRect = firstPoster.getBoundingClientRect();
            const posterEnteredBy = vh - posterRect.top;
            if (posterEnteredBy < posterRect.height * 0.85) {
                hideTitle();
                hideBody();
                bodyAllowed = false;
                return;
            }

            /* ── title entrance ── */
            showTitle();

            /* ── body fades sooner than title on exit ── */
            if (visPx < vh * BODY_THRESHOLD) {
                hideBody();
                bodyAllowed = false;
            } else if (!bodyAllowed) {
                bodyAllowed = true;
                for (const poster of posters) {
                    const pr = poster.getBoundingClientRect();
                    const pVis = Math.min(pr.bottom, vh) - Math.max(pr.top, 0);
                    if (pVis > 0 && pVis >= pr.height * 0.5) {
                        activateBodyDesktop(poster);
                        break;
                    }
                }
            }
        }

        window.pageReady.then(() => {
            updateDesktop();
            window.addEventListener('lenis-scroll', updateDesktop);
        });

        /* ── resize ── */

        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                cachedStickyTop = null;
                if (pinned) {
                    clearFixed();
                    applyFixed();
                }
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
            if (isMobile) {
                clearFixed();
                arrangeForMobile();
            } else {
                arrangeForDesktop();
                updateDesktop();
            }
        }

        if (isMobile) arrangeForMobile();
    });
})();
