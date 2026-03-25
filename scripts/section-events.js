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
        const ctaSection = document.querySelector('.events-cta-section');
        const btn = ctaSection ? ctaSection.querySelector('.cta-btn') : null;

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

        if (title) {
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

        // cached layout values, recalculated after fonts/layout settle
        let phase2Start = 0;
        let phase2Len   = 1;
        let startOffset = window.innerHeight;

        // disable CSS transitions on the title wrap — it's scroll-driven so lag is unwanted
        if (titleWrap) titleWrap.style.transition = 'none';

        const recalcLayout = () => {
            const ih = window.innerHeight;
            phase2Start = section.offsetTop - ih * 0.4; // begin before section fully sticks
            phase2Len = ih * 1; // fixed animation range — decoupled from section height
            startOffset = ih; // start fully off the bottom of the screen
            applyPositions(window.lenis ? window.lenis.scroll : 0);
        };

        document.fonts.ready.then(recalcLayout);
        window.addEventListener('resize', recalcLayout);

        const applyPositions = scrollY => {
            const progress = Math.max(0, Math.min(1, (scrollY - phase2Start) / phase2Len));

            cards.forEach((card, i) => {
                // localP: 0 = not yet started, 1 = fully arrived. same duration for all cards.
                const localP = Math.max(0, Math.min(1, (progress - cardStarts[i]) / travelDuration));
                card.style.transform = `translateY(${startOffset * (1 - localP)}px)`;
                card.style.opacity   = '1';
            });

        };

        window.addEventListener('lenis-scroll', ({ detail }) => {
            applyPositions(detail.scroll);
        }, { passive: true });

        if (btn && observeElementInOut) {
            observeElementInOut(btn, {
                onEnter() { if (transitionCta) transitionCta(btn, 'enter'); }
            });
        }
    });
})();
