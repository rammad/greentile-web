/* events section */

(function () {
    const { transitionCta, observeElementInOut } = window.AnimationUtils || {};
    const { fitTextToWidth } = window.AppUtils || {};

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.querySelector('.events-section');
        if (!section) return;

        const titleWrap = section.querySelector('.events-title-wrap');
        const desktopLine = section.querySelector('.events-title-lines.desktop-only .animate-line');
        const allLines = [...section.querySelectorAll('.events-title-wrap .animate-line')];
        const grid = section.querySelector('.events-grid');
        const cards = section.querySelectorAll('.event-card');
        const btn = section.querySelector('.cta-btn');
        const ctaFooter = section.querySelector('.events-content-footer');
        const stickyInner = section.querySelector('.events-sticky-inner');
        const content = section.querySelector('.events-content');

        if (grid && cards.length) {
            grid.style.setProperty('--poster-count', cards.length);
        }

        // hover rotation — each card gets a random angle within ±[MIN, MAX] degrees
        const HOVER_ROTATE_MIN = 2;
        const HOVER_ROTATE_MAX = 4;
        cards.forEach(card => {
            const sign = Math.random() < 0.5 ? -1 : 1;
            const deg  = sign * (HOVER_ROTATE_MIN + Math.random() * (HOVER_ROTATE_MAX - HOVER_ROTATE_MIN));
            card.style.setProperty('--hover-rotate', `${deg.toFixed(1)}deg`);
        });

        // on desktop, mirror the hero title's fitted font-size
        const syncTitleSize = () => {
            if (!desktopLine) return;
            const heroTitle = document.querySelector('.hero .type-display-hero');
            if (heroTitle) {
                if (fitTextToWidth) fitTextToWidth(heroTitle);
                desktopLine.style.fontSize = getComputedStyle(heroTitle).fontSize;
            }
        };

        document.fonts.ready.then(() => {
            syncTitleSize();
            allLines.forEach(el => el.classList.add('is-initialized'));
        });

        const LINE_STAGGER_MS = 80;

        function getVisibleTitleLines() {
            const groups = [...section.querySelectorAll('.events-title-lines')];
            const visible = groups.find(g => getComputedStyle(g).display !== 'none');
            if (visible) return [...visible.querySelectorAll('.animate-line')];
            return allLines;
        }

        if (titleWrap && observeElementInOut) {
            observeElementInOut(titleWrap, {
                onEnter() {
                    const lines = getVisibleTitleLines();
                    lines.forEach((line, i) => {
                        setTimeout(() => {
                            line.classList.add('is-visible');
                            line.addEventListener('transitionend', function settle(e) {
                                if (e.propertyName !== 'transform') return;
                                line.removeEventListener('transitionend', settle);
                                line.style.transition = 'none';
                                line.style.transform  = 'none';
                            });
                        }, i * LINE_STAGGER_MS);
                    });
                }
            });
        }

        // ── TUNING ────────────────────────────────────────────────
        const SECTION_VH     = 2.0;   // section height in viewports (bigger = slower overall scroll)
        const ENTRANCE_DELAY = -0.75;  // 0–1, fraction of scroll before first card appears
        const STAGGER_SPLIT  = 0.35;  // 0–1, how much of the remaining range is card-to-card delay
        // ──────────────────────────────────────────────────────────

        const n              = cards.length;
        const availableRange = 1 - ENTRANCE_DELAY;
        const totalDelay     = availableRange * STAGGER_SPLIT;
        const travelDuration = availableRange * (1 - STAGGER_SPLIT);
        const stepSize       = n > 1 ? totalDelay / (n - 1) : 0;

        // card i starts moving at this scroll progress value
        const cardStarts = Array.from(cards, (_, i) => ENTRANCE_DELAY + i * stepSize);
        const btnThreshold = cardStarts[n - 1] + travelDuration;

        // cached layout values, recalculated after fonts/layout settle
        let phase2Start = 0;
        let phase2Len   = 1;
        let startOffset = window.innerHeight;
        let currentlyMobile = window.matchMedia('(max-width: 768px)').matches;

        // disable CSS transitions on the title wrap — it's scroll-driven so lag is unwanted
        if (titleWrap) titleWrap.style.transition = 'none';

        function applyPositions(scrollY) {
            const progress = Math.max(0, Math.min(1, (scrollY - phase2Start) / phase2Len));

            cards.forEach((card, i) => {
                const localP = Math.max(0, Math.min(1, (progress - cardStarts[i]) / travelDuration));
                const y = Math.round(startOffset * (1 - localP));
                card.style.transform = `translateY(${y}px)`;
                card.style.opacity   = '1';
            });

            if (btn && transitionCta) {
                if (progress >= btnThreshold && !btn.classList.contains('is-visible')) {
                    transitionCta(btn, 'enter');
                } else if (progress < btnThreshold && btn.classList.contains('is-visible')) {
                    transitionCta(btn, 'exit');
                }
            }
        }

        const recalcLayout = () => {
            const ih = window.innerHeight;

            const rootStyle = getComputedStyle(document.documentElement);
            const sectionSpacingPx = parseFloat(rootStyle.getPropertyValue('--section-spacing'));
            const navSpace = parseFloat(rootStyle.getPropertyValue('--space-for-nav'));
            const s20 = 20;

            const nav = document.querySelector('.sticky-nav');
            const navInset = nav
                ? (parseFloat(getComputedStyle(nav).top) || 0) + nav.offsetHeight
                : 0;

            stickyInner.style.paddingTop = navInset + 'px';

            const flexGap    = parseFloat(getComputedStyle(stickyInner).rowGap) || 0;
            const gridColGap = parseFloat(getComputedStyle(grid).columnGap) || 0;
            const gridPad    = parseFloat(getComputedStyle(grid).paddingLeft)
                             + parseFloat(getComputedStyle(grid).paddingRight);
            currentlyMobile  = window.matchMedia('(max-width: 768px)').matches;

            if (currentlyMobile) {
                const numCols    = 2;
                const numRows    = Math.ceil(n / numCols);
                const gridRowGap = parseFloat(getComputedStyle(grid).rowGap) || 0;
                const ctaH       = ctaFooter ? ctaFooter.offsetHeight : 0;
                const titleH     = titleWrap.offsetHeight;
                const availableH = ih - navInset - titleH - ctaH - flexGap * 2 - s20;
                const maxPosterH = (availableH - (numRows - 1) * gridRowGap) / numRows;
                const maxPosterW = maxPosterH * 4 / 5;
                grid.style.maxWidth = Math.max(0, numCols * maxPosterW + (numCols - 1) * gridColGap + gridPad) + 'px';
            } else {
                const maxPosterH = ih - navInset - titleWrap.offsetHeight - flexGap - s20;
                const maxPosterW = maxPosterH * 4 / 5;
                grid.style.maxWidth = Math.max(0, n * maxPosterW + (n - 1) * gridColGap + gridPad) + 'px';
            }

            const contentH = titleWrap.offsetHeight + flexGap + content.offsetHeight;
            const usableH      = ih - navInset;
            const centerOffset = navInset + Math.max(0, (usableH - contentH) / 2);
            const adjustedPT   = Math.max(0, sectionSpacingPx - centerOffset);

            section.style.paddingTop = adjustedPT + 'px';
            section.style.minHeight  = (SECTION_VH * ih) + 'px';

            phase2Start = section.offsetTop;
            phase2Len   = section.offsetHeight - ih;
            startOffset = ih;

            applyPositions(window.lenis ? window.lenis.scroll : 0);

            if (ctaFooter) {
                if (currentlyMobile) {
                    ctaFooter.style.top = '';
                } else {
                    const posterBottom = content.offsetTop + content.offsetHeight;
                    ctaFooter.style.top    = (posterBottom + navSpace) + 'px';
                    ctaFooter.style.bottom = 'auto';
                    section.style.marginBottom = '';
                }
            }
        };

        document.fonts.ready.then(recalcLayout);
        window.addEventListener('resize', () => {
            syncTitleSize();
            recalcLayout();
        });

        window.addEventListener('lenis-scroll', ({ detail }) => {
            applyPositions(detail.scroll);
        }, { passive: true });

    });
})();
