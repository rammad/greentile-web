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

        // scroll-driven card positions
        //
        // phase 1 (1× innerHeight): section enters, title scrolls to centre. no cards yet.
        // phase 2 (section.offsetHeight − innerHeight): cards animate in sequentially.
        //
        // All cards travel at identical speed (same travelDuration in progress-space).
        // The cascade is created by delaying each card's start by a fixed stepSize,
        // NOT by varying speed. Cards arrive in order 0, 1, 2 …
        //
        // Available progress range after readingBuffer is split 20/80:
        //   20% → stagger delays  (stepSize × n gaps)
        //   80% → travel distance (same for every card)

        const readingBuffer  = 0;
        const n              = cards.length;
        const availableRange = 1 - readingBuffer;
        const totalDelay     = availableRange * 0.2;
        const travelDuration = availableRange * 0.8;
        const stepSize       = n > 1 ? totalDelay / (n - 1) : 0;

        // card i starts moving at this scroll progress value
        const cardStarts = Array.from(cards, (_, i) => readingBuffer + i * stepSize);
        const btnThreshold = cardStarts[n - 1] + travelDuration;

        // cached layout values, recalculated after fonts/layout settle
        let phase2Start = 0;
        let phase2Len   = 1;
        let startOffset = window.innerHeight;

        // disable CSS transitions on the title wrap — it's scroll-driven so lag is unwanted
        if (titleWrap) titleWrap.style.transition = 'none';

        const recalcLayout = () => {
            const ih = window.innerHeight;
            const vw = window.innerWidth;

            const sectionSpacingPx = vw * 200 / 1920;
            const s80 = vw * 80 / 1920;
            const s20 = vw * 20 / 1920;

            // nav bottom edge — used for visual centering and poster cap
            const nav = document.querySelector('.sticky-nav');
            const navInset = nav
                ? (parseFloat(getComputedStyle(nav).top) || 0) + nav.offsetHeight
                : 0;

            // push the flex center below the nav so content is optically
            // centered in the viewport space the user actually sees
            stickyInner.style.paddingTop = navInset + 'px';

            // cap poster size: content must fit between nav bottom and 20 from viewport bottom
            const flexGap    = parseFloat(getComputedStyle(stickyInner).rowGap) || 0;
            const maxPosterH = ih - navInset - titleWrap.offsetHeight - flexGap - s20;
            const maxPosterW = maxPosterH * 4 / 5;
            const gridColGap = parseFloat(getComputedStyle(grid).columnGap) || 0;
            const gridPad    = parseFloat(getComputedStyle(grid).paddingLeft)
                             + parseFloat(getComputedStyle(grid).paddingRight);
            grid.style.maxWidth = Math.max(0, n * maxPosterW + (n - 1) * gridColGap + gridPad) + 'px';

            // measure content after constraints are applied
            const contentH = titleWrap.offsetHeight + flexGap + content.offsetHeight;

            // where justify-content:center now places the title (below nav padding)
            const usableH      = ih - navInset;
            const centerOffset = navInset + Math.max(0, (usableH - contentH) / 2);
            const adjustedPT   = Math.max(0, sectionSpacingPx - centerOffset);

            section.style.paddingTop = adjustedPT + 'px';
            section.style.minHeight  = (1.6 * ih + adjustedPT) + 'px';

            phase2Start = section.offsetTop - ih * 0.6;
            phase2Len   = ih * 1;
            startOffset = ih;

            applyPositions(window.lenis ? window.lenis.scroll : 0);

            // CTA: fixed --space-80 below posters
            if (ctaFooter) {
                const posterBottom = content.offsetTop + content.offsetHeight;
                const ctaTop = posterBottom + s80;
                ctaFooter.style.top    = ctaTop + 'px';
                ctaFooter.style.bottom = 'auto';

                // if the CTA spills below the viewport, push the next section
                // down so it doesn't overlap; otherwise clear any previous margin
                const ctaBottom = ctaTop + ctaFooter.offsetHeight;
                const overflow  = ctaBottom - ih;
                section.style.marginBottom = overflow > 0 ? overflow + 'px' : '';
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
