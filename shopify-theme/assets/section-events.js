/* events section */

(function () {
    const { transitionCta, observeElementInOut, staggerTime } = window.AnimationUtils || {};
    const { fitTextToWidth } = window.AppUtils || {};

    function initFeaturedLayout(section) {
        const _s = (window.AppUtils && window.AppUtils.getLayoutScale) ? window.AppUtils.getLayoutScale() : 1;
        const BG_PX      =  480 * _s;
        const MARQUEE_PX = -120 * _s;
        const POSTER_PX  = -240 * _s;

        const frame        = section.querySelector('.featured-frame');
        const marqueeTop   = section.querySelector('.featured-marquee-layer:not(.featured-marquee-bottom)');
        const marqueeBot   = section.querySelector('.featured-marquee-bottom');
        const posterWrap   = section.querySelector('.featured-poster-wrap');
        const bgImg        = section.querySelector('.featured-bg-img');

        let centerY = 0, secH = 1, cachedVH = window.innerHeight, lastW = window.innerWidth;
        const isMobile = window.matchMedia('(max-width: 1024px)').matches;
        let near = true;

        const recalc = () => {
            lastW = window.innerWidth;
            cachedVH = window.innerHeight;
            if (isMobile && frame) {
                centerY = section.offsetTop + frame.offsetTop + frame.offsetHeight * 0.5;
                secH    = frame.offsetHeight;
            } else {
                centerY = section.offsetTop + section.offsetHeight * 0.5;
                secH    = section.offsetHeight;
            }
        };

        document.fonts.ready.then(recalc);
        window.addEventListener('resize', () => {
            if (isMobile && window.innerWidth === lastW) return;
            recalc();
        });

        new IntersectionObserver(([e]) => { near = e.isIntersecting; }, {
            rootMargin: '25%'
        }).observe(section);

        const apply = (scrollY) => {
            if (!near) return;
            const d   = (scrollY + cachedVH * 0.5 - centerY) / secH;
            const mpx = isMobile ? POSTER_PX : MARQUEE_PX;
            if (bgImg)      bgImg.style.transform      = `translate3d(0,${(d * BG_PX).toFixed(2)}px,0)`;
            if (marqueeTop) marqueeTop.style.transform  = `translate3d(0,${(d * mpx).toFixed(2)}px,0)`;
            if (marqueeBot) marqueeBot.style.transform  = `translate3d(0,${(d * mpx).toFixed(2)}px,0)`;
            if (posterWrap) posterWrap.style.transform   = `translate3d(0,${(d * POSTER_PX).toFixed(2)}px,0)`;
        };

        window.addEventListener('lenis-scroll', ({ detail }) => { apply(detail.scroll); }, { passive: true });
        requestAnimationFrame(() => { apply(window.lenis ? window.lenis.scroll : window.scrollY); });
    }

    document.addEventListener('DOMContentLoaded', () => {
        const featuredSection = document.querySelector('.events-as-featured');
        if (featuredSection) { initFeaturedLayout(featuredSection); return; }

        const section = document.querySelector('.events-section');
        if (!section) return;

        const cards = section.querySelectorAll('.event-card');
        if (!cards.length) {
            section.style.display = 'none';
            return;
        }

        const titleWrap = section.querySelector('.events-title-wrap');
        const desktopLine = section.querySelector('.events-title-lines.desktop-only .animate-line');
        const allLines = [...section.querySelectorAll('.events-title-wrap .animate-line')];
        const grid = section.querySelector('.events-grid');
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

        const mobileLines = [...section.querySelectorAll('.events-title-lines.mobile-only .animate-line')];

        const syncTitleSize = () => {
            if (desktopLine) {
                const heroTitle = document.querySelector('.hero .type-display-hero');
                if (heroTitle) {
                    if (fitTextToWidth) fitTextToWidth(heroTitle);
                    desktopLine.style.fontSize = getComputedStyle(heroTitle).fontSize;
                }
            }
            if (fitTextToWidth && mobileLines.length) {
                mobileLines.forEach(line => { line.style.fontSize = ''; fitTextToWidth(line); });
                const minSize = Math.min(...mobileLines.map(l => parseFloat(l.style.fontSize)));
                mobileLines.forEach(line => line.style.fontSize = `${minSize}px`);
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

        // tuning
        const SECTION_VH         = 2.0;   // section height in viewports (bigger = slower overall scroll)
        const ENTRANCE_DELAY = -2.5;   // negative = cards start moving before progress reaches 0
        const STAGGER_SPLIT  = 0.2;  // 0–1, how much of the remaining range is card-to-card delay
        const FADE_Y_HI       = 0.30;  // card invisible when y > this × startOffset (travel distance)
        const FADE_Y_LO       = 0.10;  // card fully opaque when y < this × startOffset
        const STICK_EASE     = 0.35;  // fraction of stick zone for entry/exit deceleration
        // mobile — no sticky; cards slide in as the title scrolls through viewport
        const ENTRANCE_DELAY_MOBILE = -0.3;
        const STAGGER_SPLIT_MOBILE  = 0.3;
        const MOBILE_START_RATIO    = 0.5;  // startOffset = vh × this

        const n = cards.length;
        const singleCard = n === 1;
        if (singleCard) section.classList.add('single-event');

        let availableRange = 1 - ENTRANCE_DELAY;
        let totalDelay     = availableRange * STAGGER_SPLIT;
        let travelDuration = availableRange * (1 - STAGGER_SPLIT);
        let stepSize       = n > 1 ? totalDelay / (n - 1) : 0;
        let cardStarts     = Array.from(cards, (_, i) => ENTRANCE_DELAY + i * stepSize);
        const btnThresholdDesktop = cardStarts[n - 1] + travelDuration * 0.85;
        let btnThresholdMobile    = cardStarts[n - 1] + travelDuration * 0.99;

        function syncCardTiming() {
            const ed = currentlyMobile ? ENTRANCE_DELAY_MOBILE : ENTRANCE_DELAY;
            const ss = currentlyMobile ? STAGGER_SPLIT_MOBILE  : STAGGER_SPLIT;
            availableRange = 1 - ed;
            totalDelay     = availableRange * ss;
            travelDuration = availableRange * (1 - ss);
            stepSize       = n > 1 ? totalDelay / (n - 1) : 0;
            cardStarts     = Array.from(cards, (_, i) => ed + i * stepSize);
            btnThresholdMobile = cardStarts[n - 1] + travelDuration * 0.99;
        }

        // cached layout values, recalculated after fonts/layout settle
        let phase2Start = 0;
        let phase2Len   = 1;
        let startOffset = window.innerHeight;
        let currentlyMobile = window.matchMedia('(max-width: 1024px)').matches;
        let stickProgress = 0;

        // mobile: sequential slide-fade-in (matches socials entrance)
        let mobileCardsRevealed = false;

        function revealMobileCards() {
            if (mobileCardsRevealed) return;
            mobileCardsRevealed = true;
            cards.forEach((card, i) => {
                card.style.transform = '';
                card.style.opacity   = '';
                setTimeout(() => card.classList.add('is-visible'), staggerTime * i);
            });
            if (btn && transitionCta) {
                setTimeout(() => transitionCta(btn, 'enter'), cards.length * staggerTime);
            }
        }

        if (grid && observeElementInOut) {
            observeElementInOut(grid, {
                onEnter() { if (currentlyMobile || singleCard) revealMobileCards(); }
            });
        }

        // disable CSS transitions on the title wrap — it's scroll-driven so lag is unwanted
        if (titleWrap) titleWrap.style.transition = 'none';

        const DECEL_START = 0.9;
        const DECEL_LEN   = 1 - DECEL_START;
        const DECEL_V0    = 1 / (DECEL_START + DECEL_LEN / 2);

        function easeDecel(t) {
            if (t <= DECEL_START) return DECEL_V0 * t;
            const s = (t - DECEL_START) / DECEL_LEN;
            return DECEL_V0 * DECEL_START + DECEL_V0 * DECEL_LEN * (s - s * s / 2);
        }

        function applyPositions(scrollY) {
            const progress = Math.min(1, (scrollY - phase2Start) / phase2Len);

            if (!currentlyMobile && !singleCard) {
                const stickLen    = 1 - stickProgress;
                const easeLen     = STICK_EASE * stickLen;
                const stickyMax   = easeLen * phase2Len / 2;
                const entryEnd    = stickProgress + easeLen;
                const exitStart   = 1 - easeLen;
                const p           = Math.max(stickProgress, Math.min(1, progress));
                let stickyOff     = 0;
                if (p < entryEnd) {
                    stickyOff = stickyMax * (1 - (p - stickProgress) / easeLen);
                } else if (p > exitStart) {
                    stickyOff = -stickyMax * ((p - exitStart) / easeLen);
                }
                stickyInner.style.transform = `translate3d(0,${Math.round(stickyOff)}px,0)`;
            } else {
                stickyInner.style.transform = '';
            }

            if (!currentlyMobile && !singleCard) {
                cards.forEach((card, i) => {
                    const localP = Math.max(0, Math.min(1, (progress - cardStarts[i]) / travelDuration));
                    const y = Math.round(startOffset * (1 - easeDecel(localP)));
                    card.style.transform = `translate3d(0,${y}px,0)`;
                    const hi = startOffset * FADE_Y_HI;
                    const lo = startOffset * FADE_Y_LO;
                    card.style.opacity = y >= hi ? 0 : y <= lo ? 1 : 1 - (y - lo) / (hi - lo);
                });

                if (btn && transitionCta) {
                    const thresh = btnThresholdDesktop;
                    if (progress >= thresh && !btn.classList.contains('is-visible')) {
                        transitionCta(btn, 'enter');
                    } else if (progress < thresh && btn.classList.contains('is-visible')) {
                        transitionCta(btn, 'exit');
                    }
                }
            }
        }

        const recalcLayout = () => {
            const ih = window.innerHeight;

            const rootStyle = getComputedStyle(document.documentElement);
            const sectionSpacingPx = parseFloat(rootStyle.getPropertyValue('--section-spacing'));
            const navSpace = parseFloat(rootStyle.getPropertyValue('--space-for-nav'));
            const _evtScale = (window.AppUtils && window.AppUtils.getLayoutScale) ? window.AppUtils.getLayoutScale() : 1;
            const s20 = 20 * _evtScale;

            const nav = document.querySelector('.sticky-nav');
            const navInset = nav
                ? (parseFloat(getComputedStyle(nav).top) || 0) + nav.offsetHeight
                : 0;

            currentlyMobile  = window.matchMedia('(max-width: 1024px)').matches;
            syncCardTiming();

            const flexGap    = parseFloat(getComputedStyle(stickyInner).rowGap) || 0;
            const gridColGap = parseFloat(getComputedStyle(grid).columnGap) || 0;
            const gridPad    = parseFloat(getComputedStyle(grid).paddingLeft)
                             + parseFloat(getComputedStyle(grid).paddingRight);

            if (currentlyMobile) {
                stickyInner.style.paddingTop = '';
                grid.style.maxWidth = '';
                section.style.marginTop  = '';
                section.style.paddingTop = '';
                section.style.minHeight  = '';

                cards.forEach(card => {
                    card.style.transform = '';
                    card.style.opacity   = '';
                });

                const scrollNow   = window.scrollY;
                const titleAbsTop = titleWrap.getBoundingClientRect().top + scrollNow;
                const titleH      = titleWrap.offsetHeight;

                phase2Start   = titleAbsTop + titleH - ih;
                phase2Len     = Math.max(1, ih - titleH);
                stickProgress = 0;
                startOffset   = ih * MOBILE_START_RATIO;
            } else {
                if (!singleCard) {
                    mobileCardsRevealed = false;
                    cards.forEach(card => card.classList.remove('is-visible'));
                }

                stickyInner.style.paddingTop = (navInset + s20) + 'px';

                const ctaH = ctaFooter ? ctaFooter.offsetHeight || 60 * _evtScale : 0;
                const padTop = navInset + s20;
                const maxPosterH = ih - padTop - titleWrap.offsetHeight - 2 * flexGap - ctaH - s20;
                const maxPosterW = maxPosterH * 4 / 5;
                grid.style.maxWidth = Math.max(0, n * maxPosterW + (n - 1) * gridColGap + gridPad) + 'px';

                const desiredGap = sectionSpacingPx * 2;

                section.style.marginTop  = '0px';
                section.style.paddingTop = '0px';
                section.style.minHeight  = singleCard ? '' : (SECTION_VH * ih) + 'px';
                void section.offsetHeight;

                let prevSec = null;
                const shopifyWrapper = section.closest('.shopify-section');
                if (shopifyWrapper) {
                    let prevWrapper = shopifyWrapper.previousElementSibling;
                    while (prevWrapper && !prevWrapper.querySelector('section')) prevWrapper = prevWrapper.previousElementSibling;
                    if (prevWrapper) prevSec = prevWrapper.querySelector('section');
                } else {
                    prevSec = section.previousElementSibling;
                    while (prevSec && prevSec.tagName !== 'SECTION') prevSec = prevSec.previousElementSibling;
                }
                const baselineGap = prevSec
                    ? titleWrap.getBoundingClientRect().top - prevSec.getBoundingClientRect().bottom
                    : 0;
                const adjustedPT = Math.max(0, desiredGap - baselineGap);

                section.style.paddingTop = adjustedPT + 'px';

                if (singleCard) {
                    cards.forEach(card => {
                        card.style.transform = '';
                        card.style.opacity   = '';
                    });
                }

                phase2Start   = section.offsetTop;
                phase2Len     = section.offsetHeight - ih;
                stickProgress = 0;
                startOffset   = ih;
            }

            applyPositions(window.lenis ? window.lenis.scroll : window.scrollY);

            if (ctaFooter) {
                if (currentlyMobile) {
                    ctaFooter.style.top = '';
                } else {
                    const posterBottom = content.offsetTop + content.offsetHeight;
                    ctaFooter.style.top    = (posterBottom + navSpace) + 'px';
                    ctaFooter.style.bottom = 'auto';
                }
                syncCtaMargin();
            }
        };

        let nextSection = null;
        const sectionShopifyWrap = section.closest('.shopify-section');
        if (sectionShopifyWrap) {
            let nextWrapper = sectionShopifyWrap.nextElementSibling;
            while (nextWrapper) {
                const el = nextWrapper.querySelector('section, [id]');
                if (el) { nextSection = el; break; }
                nextWrapper = nextWrapper.nextElementSibling;
            }
        } else {
            nextSection = section.nextElementSibling;
            while (nextSection && nextSection.tagName !== 'SECTION') nextSection = nextSection.nextElementSibling;
        }

        const syncCtaMargin = () => {
            if (!ctaFooter) return;
            const stickyH = stickyInner.offsetHeight;
            const rs = getComputedStyle(document.documentElement);
            const spacing = parseFloat(rs.getPropertyValue('--section-spacing'));
            const mobile = window.matchMedia('(max-width: 1024px)').matches;
            const desired = mobile ? spacing * 1.5 : spacing;
            const ctaBottom = ctaFooter.offsetTop + ctaFooter.offsetHeight;
            const nextStyles = nextSection ? getComputedStyle(nextSection) : null;
            const nextPad = nextStyles
                ? (parseFloat(nextStyles.paddingTop) || 0) + (parseFloat(nextStyles.marginTop) || 0)
                : 0;

            const stickyMaxAtRelease = (currentlyMobile || singleCard)
                ? 0
                : STICK_EASE * (1 - stickProgress) * phase2Len / 2;

            const gapToEnd = stickyH - ctaBottom + stickyMaxAtRelease;
            section.style.marginBottom = (desired - gapToEnd - nextPad) + 'px';
        };

        if (ctaFooter) new ResizeObserver(syncCtaMargin).observe(ctaFooter);

        document.fonts.ready.then(recalcLayout);
        let lastEventsWidth = window.innerWidth;
        window.addEventListener('resize', () => {
            const widthChanged = window.innerWidth !== lastEventsWidth;
            if (currentlyMobile && !widthChanged) return;
            lastEventsWidth = window.innerWidth;
            syncTitleSize();
            recalcLayout();
        });

        window.addEventListener('lenis-scroll', ({ detail }) => {
            applyPositions(detail.scroll);
        }, { passive: true });

    });
})();
