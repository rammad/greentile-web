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

        if (grid && cards.length) {
            grid.style.setProperty('--poster-count', cards.length);
        }

        // season-aware title (e.g. "Spring 2026 Calendar")
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

        // scroll-driven card positions
        //
        // phase 1 (1× innerHeight): section enters, title scrolls to centre. no cards yet.
        // phase 2 (section.offsetHeight − innerHeight): title stays centred, cards animate in.
        //   a readingBuffer fraction passes before the first card moves.
        //   thresholds are compressed into [0.4 → 0.9] then shuffled for random arrival order.

        const readingBuffer = 0.25; // fraction of phase 2 before any card moves
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

        // cached layout values, recalculated after fonts/layout settle
        let phase2Start = 0;
        let phase2Len   = 1;
        let startOffset = window.innerHeight * 0.5;

        const recalcLayout = () => {
            const ih    = window.innerHeight;
            phase2Start = section.offsetTop;
            phase2Len   = Math.max(1, section.offsetHeight - ih);
            startOffset = ih * 0.35;
            applyPositions(window.lenis ? window.lenis.scroll : 0);
        };

        document.fonts.ready.then(recalcLayout);
        window.addEventListener('resize', recalcLayout);

        const applyPositions = scrollY => {
            const raw = (scrollY - phase2Start) / phase2Len;
            // subtract reading buffer, then re-normalise to 0→1
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
