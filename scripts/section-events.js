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

        // ── Random per-card travel distance ──────────
        // Set now (before any scroll) so the CSS transform is correct
        // from the moment the section first appears.
        cards.forEach(card => {
            const extra = Math.floor(Math.random() * 80); // 0–80 px above the 100% base
            card.style.setProperty('--card-extra', `${extra}px`);
        });

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

        // ── Cards + CTA: triggered by section entry ───
        // Cards are clipped below the sticky viewport and animate in
        // automatically — no scrolling required. A section-level observer
        // fires once the section fills the viewport (threshold ≈ 0.45 of
        // a 210vh section ≈ when its top reaches the viewport edge).
        if (observeElementInOut) {
            observeElementInOut(section, {
                enterThreshold: 0.45,
                onEnter() {
                    // Build stagger delays and shuffle so cards enter in a
                    // random order rather than always left-to-right.
                    const delays = Array.from(cards, (_, i) => 300 + i * 150);
                    for (let i = delays.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [delays[i], delays[j]] = [delays[j], delays[i]];
                    }
                    cards.forEach((card, i) => {
                        setTimeout(() => card.classList.add('is-visible'), delays[i]);
                    });

                    // CTA enters after the last card's animation has started
                    // and had time to mostly complete.
                    if (btn && transitionCta) {
                        const ctaDelay = 300 + (cards.length - 1) * 150 + 700;
                        setTimeout(() => transitionCta(btn, 'enter'), ctaDelay);
                    }
                }
            });
        }
    });
})();
