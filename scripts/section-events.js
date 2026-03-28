/* events section */

(function () {
    const { transitionHeader, transitionCta, observeElementInOut } = window.AnimationUtils || {};
    const { getCurrentSeason, fitTextToWidth } = window.AppUtils || {};

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.querySelector('.events-section');
        if (!section) return;

        const title = document.getElementById('event-title');
        const titleWrap = section.querySelector('.events-title-wrap');
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

        // match font-size to the hero title's fitted size so both read as the same
        // visual weight — called after fonts load and on every resize
        const updateTitleSize = () => {
            if (!title) return;
            const heroTitle = document.querySelector('.hero .type-display-hero');
            if (heroTitle) {
                if (fitTextToWidth) fitTextToWidth(heroTitle); // idempotent
                title.style.fontSize = window.getComputedStyle(heroTitle).fontSize;
            } else if (fitTextToWidth) {
                fitTextToWidth(title);
            }
        };

        if (title) {
            let fontsReady  = false;
            let wantsReveal = false;

            document.fonts.ready.then(() => {
                updateTitleSize();
                title.classList.add('is-initialized');
                title.classList.add('animate-cascade');
                if (window.initCascadeReveal) window.initCascadeReveal();
                fontsReady = true;
                if (wantsReveal && transitionHeader) transitionHeader(title, 'enter');
            });

            if (observeElementInOut) {
                observeElementInOut(title, {
                    onEnter() {
                        if (fontsReady) {
                            if (transitionHeader) transitionHeader(title, 'enter');
                        } else {
                            wantsReveal = true;
                        }
                    }
                });
            }
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

        // disable CSS transitions on the title wrap — it's scroll-driven so lag is unwanted
        if (titleWrap) titleWrap.style.transition = 'none';

        const recalcLayout = () => {
            const ih = window.innerHeight;

            const rootStyle = getComputedStyle(document.documentElement);
            const sectionSpacingPx = parseFloat(rootStyle.getPropertyValue('--space-400'));
            const s80 = parseFloat(rootStyle.getPropertyValue('--space-80'));
            const s20 = parseFloat(rootStyle.getPropertyValue('--space-20'));

            // nav bottom edge — used for visual centering and poster cap
            const nav = document.querySelector('.sticky-nav');
            const navInset = nav
                ? (parseFloat(getComputedStyle(nav).top) || 0) + nav.offsetHeight
                : 0;

            // push the flex center below the nav so content is optically
            // centered in the viewport space the user actually sees
            stickyInner.style.paddingTop = navInset + 'px';

            // cap poster size: content must fit between nav bottom and viewport bottom
            const flexGap    = parseFloat(getComputedStyle(stickyInner).rowGap) || 0;
            const gridColGap = parseFloat(getComputedStyle(grid).columnGap) || 0;
            const gridPad    = parseFloat(getComputedStyle(grid).paddingLeft)
                             + parseFloat(getComputedStyle(grid).paddingRight);
            const isMobile   = window.matchMedia('(max-width: 768px)').matches;

            if (isMobile) {
                const numCols    = 2;
                const numRows    = Math.ceil(n / numCols);
                const gridRowGap = parseFloat(getComputedStyle(grid).rowGap) || 0;
                const availableH = ih - navInset - titleWrap.offsetHeight - flexGap - s20;
                const maxPosterH = (availableH - (numRows - 1) * gridRowGap) / numRows;
                const maxPosterW = maxPosterH * 4 / 5;
                grid.style.maxWidth = Math.max(0, numCols * maxPosterW + (numCols - 1) * gridColGap + gridPad) + 'px';
            } else {
                const maxPosterH = ih - navInset - titleWrap.offsetHeight - flexGap - s20;
                const maxPosterW = maxPosterH * 4 / 5;
                grid.style.maxWidth = Math.max(0, n * maxPosterW + (n - 1) * gridColGap + gridPad) + 'px';
            }

            // measure content after constraints are applied
            const contentH = titleWrap.offsetHeight + flexGap + content.offsetHeight;

            // where justify-content:center now places the title (below nav padding)
            const usableH      = ih - navInset;
            const centerOffset = navInset + Math.max(0, (usableH - contentH) / 2);
            const adjustedPT   = Math.max(0, sectionSpacingPx - centerOffset);

            section.style.paddingTop = adjustedPT + 'px';
            section.style.minHeight  = (SECTION_VH * ih) + 'px';

            phase2Start = section.offsetTop;
            phase2Len   = section.offsetHeight - ih;
            startOffset = ih;

            applyPositions(window.lenis ? window.lenis.scroll : 0);

            // CTA: fixed --space-80 below posters
            if (ctaFooter) {
                const posterBottom = content.offsetTop + content.offsetHeight;
                const ctaTop = posterBottom + s80;
                ctaFooter.style.top    = ctaTop + 'px';
                ctaFooter.style.bottom = 'auto';

                section.style.marginBottom = '';
            }
        };

        document.fonts.ready.then(recalcLayout);
        window.addEventListener('resize', () => {
            updateTitleSize();
            recalcLayout();
        });

        const applyPositions = scrollY => {
            const progress = Math.max(0, Math.min(1, (scrollY - phase2Start) / phase2Len));

            cards.forEach((card, i) => {
                const localP = Math.max(0, Math.min(1, (progress - cardStarts[i]) / travelDuration));
                card.style.transform = `translateY(${startOffset * (1 - localP)}px)`;
                card.style.opacity   = '1';
            });

            if (btn && transitionCta) {
                if (progress >= btnThreshold && !btn.classList.contains('is-visible')) {
                    transitionCta(btn, 'enter');
                } else if (progress < btnThreshold && btn.classList.contains('is-visible')) {
                    transitionCta(btn, 'exit');
                }
            }
        };

        window.addEventListener('lenis-scroll', ({ detail }) => {
            applyPositions(detail.scroll);
        }, { passive: true });

    });
})();
