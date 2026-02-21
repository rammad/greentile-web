/* events section */

(function () {
    const { transitionHeader, transitionCta, observeElementInOut } = window.AnimationUtils || {};
    const { getCurrentSeason, fitTextToWidth } = window.AppUtils || {};

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.querySelector('.events-section');
        if (!section) return;

        const title = document.getElementById('event-title');
        const grid  = section.querySelector('.events-grid');
        const cards = section.querySelectorAll('.event-card');
        const btn   = section.querySelector('.cta-btn');

        // ── Poster count ──────────────────────────────
        if (grid && cards.length) {
            grid.style.setProperty('--poster-count', cards.length);
        }

        // ── Season-aware title ────────────────────────
        if (title) {
            const season = getCurrentSeason ? getCurrentSeason() : { label: 'Spring' };
            const year   = new Date().getFullYear();
            title.textContent = `${season.label} ${year} Calendar`;

            let fontsReady  = false;
            let wantsReveal = false;

            document.fonts.ready.then(() => {
                fitTextToWidth(title);
                title.classList.add('animate-cascade');
                if (window.initCascadeReveal) window.initCascadeReveal();
                fontsReady = true;
                if (wantsReveal && transitionHeader) transitionHeader(title, 'enter');
            });

            window.addEventListener('resize', () => {
                if (fitTextToWidth) fitTextToWidth(title);
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

        // ── Scroll-driven card positions ──────────────
        //
        // Two sequential phases:
        //
        //   Phase 1 — Entry (1× innerHeight of scroll):
        //     Section rises from below, title scrolls to the centre of
        //     the screen. No posters yet. User can read the title.
        //
        //   Phase 2 — Poster animation (section.offsetHeight − innerHeight):
        //     Sticky title stays centred. Cards rise one by one driven by
        //     scroll position. A readingBuffer (fraction of Phase 2) passes
        //     before the first card starts moving, giving extra reading time.
        //
        // Thresholds are compressed into [0.4 → 0.9] of Phase 2 then
        // shuffled so cards arrive in a random order each load.

        const readingBuffer = 0.25; // fraction of Phase 2 before any card moves
        const rangeStart    = 0.4;
        const rangeEnd      = 0.9;

        const thresholds = Array.from(cards, (_, i) =>
            cards.length > 1
                ? rangeStart + (i / (cards.length - 1)) * (rangeEnd - rangeStart)
                : (rangeStart + rangeEnd) / 2
        );
        for (let i = thresholds.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [thresholds[i], thresholds[j]] = [thresholds[j], thresholds[i]];
        }
        const maxThreshold = Math.max(...thresholds);

        // Cached layout values — recalculated after fonts/layout settle.
        let phase2Start = 0;
        let phase2Len   = 1;
        let startOffset = window.innerHeight * 0.5;

        const recalcLayout = () => {
            const ih    = window.innerHeight;
            // Phase 2 begins once the section has fully entered the viewport
            // (i.e. the sticky has activated and the title is centred).
            phase2Start = section.offsetTop;
            phase2Len   = Math.max(1, section.offsetHeight - ih);
            startOffset = ih * 0.35;
            applyPositions(window.lenis ? window.lenis.scroll : 0);
        };

        document.fonts.ready.then(recalcLayout);
        window.addEventListener('resize', recalcLayout);

        const applyPositions = scrollY => {
            // Raw progress through Phase 2 (0 = title just centred, 1 = end).
            const raw = (scrollY - phase2Start) / phase2Len;

            // Subtract the reading buffer so cards only start after that
            // fraction of Phase 2 has passed, then re-normalise to 0→1.
            const progress = Math.max(0, (raw - readingBuffer) / (1 - readingBuffer));

            cards.forEach((card, i) => {
                const p = Math.max(0, Math.min(1, progress / thresholds[i]));
                card.style.transform = `translateY(${startOffset * (1 - p)}px)`;
                card.style.opacity   = String(Math.min(1, p * 2));
            });

            if (btn && transitionCta && progress >= maxThreshold &&
                !btn.classList.contains('is-visible')) {
                transitionCta(btn, 'enter');
            }
        };

        window.addEventListener('lenis-scroll', ({ detail }) => {
            applyPositions(detail.scroll);
        }, { passive: true });
    });
})();
