/* about-us page – persistent menu + sticky content per slide + image scatter
 * mirrors section-about.js pin/unpin logic but each slide already exists in html
 * menu visibility is tied to slide pin state (not a separate section observer) */

(function () {
    const {
        animate,
        transitionCta,
        observeElementInOut,
        wait,
        waitForTransition,
        staggerTime
    } = window.AnimationUtils || {};

    // image layout constants (mirrors section-about.js)
    const MOBILE_BREAKPOINT = 768;
    const STEP_Y_MOBILE     = 140;
    const STEP_Y_DESKTOP    = 160;
    const COL_LEFT_X_MIN    = -5;
    const COL_LEFT_X_MAX    = 25;
    const COL_RIGHT_X_MIN   = 65;
    const COL_RIGHT_X_MAX   = 95;
    const IMG_W_MOB_MIN     = 40;
    const IMG_W_MOB_MAX     = 55;
    const IMG_W_DESK_MIN    = 7;
    const IMG_W_DESK_MAX    = 15;
    const IMG_JITTER        = 120;
    const IMG_Z_MAX         = 20;
    const SLIDE_START_VW    = 20;

    // pin logic constants (mirrors section-about.js)
    const PIN_ENTER_RATIO         = 0.4;
    const PIN_LEAVE_RATIO         = 0.3;
    const PIN_OBSERVER_THRESHOLDS = [PIN_LEAVE_RATIO, 0.25, PIN_ENTER_RATIO, 0.5, 0.75, 1];

    function rand(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.querySelector('.about.has-persistent-menu');
        if (!section) return;

        const viewport  = document.getElementById('scroll-viewport') || null;
        const menuEl    = section.querySelector('.about-menu-persistent');
        const menuItems = Array.from(section.querySelectorAll('.about-menu-persistent .menu-item[data-index]'));
        const slides    = Array.from(section.querySelectorAll('.about-slide'));
        if (!slides.length) return;

        // wrap each slide's .about-content in .about-slide-sticky (same pattern as section-about.js)
        slides.forEach(slide => {
            const content = slide.querySelector('.about-content');
            if (!content || content.closest('.about-slide-sticky')) return;
            const sticky = document.createElement('div');
            sticky.className = 'about-slide-sticky';
            slide.insertBefore(sticky, content);
            sticky.appendChild(content);
        });

        // scatter images within each slide and set slide min-height
        function initSlideImages(slide) {
            const images   = Array.from(slide.querySelectorAll('.scatter-img'));
            if (!images.length) return window.innerHeight;

            const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
            const stepY    = isMobile ? STEP_Y_MOBILE : STEP_Y_DESKTOP;
            let currentY   = 40;

            images.forEach((img, i) => {
                const isLeft  = i % 2 === 0;
                const randomX = rand(isLeft ? COL_LEFT_X_MIN : COL_RIGHT_X_MIN,
                                     isLeft ? COL_LEFT_X_MAX : COL_RIGHT_X_MAX);
                const randomW = rand(isMobile ? IMG_W_MOB_MIN : IMG_W_DESK_MIN,
                                     isMobile ? IMG_W_MOB_MAX : IMG_W_DESK_MAX);
                const jitter  = Math.floor(Math.random() * IMG_JITTER) - IMG_JITTER / 2;

                img.style.width  = `${randomW}vw`;
                img.style.left   = `${randomX}%`;
                img.style.top    = `${currentY + jitter}px`;
                img.style.zIndex = rand(1, IMG_Z_MAX);
                img.style.setProperty(
                    '--slide-start',
                    isLeft ? `-${SLIDE_START_VW}vw` : `${SLIDE_START_VW}vw`
                );
                currentY += stepY;
            });

            return currentY;
        }

        slides.forEach(slide => {
            const trackH = initSlideImages(slide);
            // css handles 100vh minimum; js only guarantees images fit
            slide.style.minHeight = `${trackH}px`;
        });

        // batch image visibility per side column, per slide
        slides.forEach(slide => {
            const images    = Array.from(slide.querySelectorAll('.scatter-img'));
            const leftImgs  = images.filter((_, i) => i % 2 === 0);
            const rightImgs = images.filter((_, i) => i % 2 !== 0);

            const colLeft  = document.createElement('div');
            colLeft.className = 'about-col about-col-left';
            const colRight = document.createElement('div');
            colRight.className = 'about-col about-col-right';
            slide.appendChild(colLeft);
            slide.appendChild(colRight);

            observeElementInOut(colLeft,  {
                root: viewport, enterThreshold: 0.25,
                onEnter: () => leftImgs.forEach(img => img.classList.add('is-visible'))
            });
            observeElementInOut(colRight, {
                root: viewport, enterThreshold: 0.25,
                onEnter: () => rightImgs.forEach(img => img.classList.add('is-visible'))
            });
        });

        // menu visibility is driven by slide pin state, not its own observer —
        // avoids spurious show on page load from lenis layout init
        let menuPinned = false;

        function pinMenu() {
            if (!menuEl || menuPinned) return;
            menuPinned = true;
            menuEl.classList.add('is-pinned');
            menuItems.forEach(item => item.classList.add('is-visible'));
            const mask  = section.querySelector('.about-menu-persistent .menu-label.text-mask');
            const label = section.querySelector('.about-menu-persistent .menu-label .text-reveal-inner');
            if (mask)  mask.classList.add('is-visible');
            if (label) label.classList.add('is-visible');
        }

        function unpinMenu() {
            if (!menuEl || !menuPinned) return;
            menuPinned = false;
            menuItems.forEach(item => item.classList.remove('is-visible'));
            const mask  = section.querySelector('.about-menu-persistent .menu-label.text-mask');
            const label = section.querySelector('.about-menu-persistent .menu-label .text-reveal-inner');
            if (mask)  mask.classList.remove('is-visible');
            if (label) label.classList.remove('is-visible');
            // wait for css fade-out, then snap back to position:absolute (invisible at that point)
            const firstItem = menuItems[0];
            const delay = firstItem
                ? (parseFloat(getComputedStyle(firstItem).transitionDuration) || 0.3) * 1000
                : 300;
            setTimeout(() => { if (!menuPinned) menuEl.classList.remove('is-pinned'); }, delay);
        }

        function setActiveItem(index) {
            menuItems.forEach(item => {
                const idx = parseInt(item.getAttribute('data-index'), 10);
                item.classList.toggle('is-active', idx === index);
            });
        }

        // content pin/unpin state machine (same as section-about.js)
        // after each unpin, re-evaluates all slide ratios to handle the paused-observer gap
        const slideRatios       = new Map();
        let pinnedSticky        = null;
        let unpinningInProgress = false;
        const pinDelayMs        = typeof staggerTime === 'number' ? staggerTime : 200;

        function clearPin(sticky) {
            if (!sticky) return;
            sticky.classList.remove('is-pinned', 'is-pinning', 'is-unpinning');
            sticky.querySelectorAll('.type-body1, .type-body2').forEach(el => el.classList.remove('is-visible'));
            const cta = sticky.querySelector('.cta-btn');
            if (cta && transitionCta) transitionCta(cta, 'exit');
        }

        async function applyPin(candidateSticky, slideIndex) {
            if (pinnedSticky && pinnedSticky !== candidateSticky) {
                startUnpin(pinnedSticky);
            }

            pinnedSticky = candidateSticky;
            setActiveItem(slideIndex);
            pinMenu();

            candidateSticky.classList.add('is-pinned', 'is-pinning');
            candidateSticky.classList.remove('is-unpinning');

            await wait(pinDelayMs);
            if (pinnedSticky !== candidateSticky) return;

            candidateSticky.classList.remove('is-pinning');
            const bodyText = candidateSticky.querySelectorAll('.type-body1, .type-body2');
            for (const el of bodyText) {
                if (animate) await animate(el, 'is-visible');
                else el.classList.add('is-visible');
            }
            const cta = candidateSticky.querySelector('.cta-btn');
            if (cta && transitionCta) await transitionCta(cta, 'enter');
        }

        async function startUnpin(sticky) {
            if (!sticky || sticky.classList.contains('is-unpinning') || unpinningInProgress) return;
            unpinningInProgress = true;
            sticky.classList.add('is-unpinning');

            sticky.querySelectorAll('.type-body1, .type-body2').forEach(el => el.classList.remove('is-visible'));
            const cta = sticky.querySelector('.cta-btn');
            if (cta && transitionCta) transitionCta(cta, 'exit');

            const textEls = sticky.querySelectorAll('.type-body1, .type-body2');
            if (textEls.length > 0 && waitForTransition) {
                await waitForTransition(textEls[0]);
            } else if (wait) {
                await wait(pinDelayMs);
            }

            clearPin(sticky);
            if (pinnedSticky === sticky) pinnedSticky = null;
            unpinningInProgress = false;

            // observer was paused during unpin — re-evaluate to catch any slide that became dominant
            let maxRatio       = 0;
            let nextSticky     = null;
            let nextIndex      = -1;
            slides.forEach((slide, index) => {
                const r = slideRatios.get(slide) ?? 0;
                if (r >= PIN_ENTER_RATIO && r > maxRatio) {
                    maxRatio   = r;
                    nextSticky = slide.querySelector('.about-slide-sticky');
                    nextIndex  = index;
                }
            });

            if (nextSticky && nextSticky !== pinnedSticky) {
                applyPin(nextSticky, nextIndex);
            } else if (!pinnedSticky) {
                unpinMenu();
            }
        }

        const pinObserver = new IntersectionObserver(
            (entries) => {
                // always update ratios so re-evaluation after unpin is accurate
                entries.forEach(e => slideRatios.set(e.target, e.intersectionRatio));

                if (unpinningInProgress) return;

                const currentSlide = pinnedSticky ? pinnedSticky.closest('.about-slide') : null;
                const currentRatio = currentSlide ? (slideRatios.get(currentSlide) ?? 0) : 0;

                if (pinnedSticky && currentRatio <= PIN_LEAVE_RATIO) {
                    startUnpin(pinnedSticky);
                    return;
                }

                let maxRatio        = 0;
                let candidateSticky = null;
                let candidateIndex  = -1;

                slides.forEach((slide, index) => {
                    const r = slideRatios.get(slide) ?? 0;
                    if (r >= PIN_ENTER_RATIO && r > maxRatio) {
                        maxRatio        = r;
                        candidateSticky = slide.querySelector('.about-slide-sticky');
                        candidateIndex  = index;
                    }
                });

                if (candidateSticky && candidateSticky !== pinnedSticky) {
                    applyPin(candidateSticky, candidateIndex);
                }
            },
            { root: viewport, threshold: PIN_OBSERVER_THRESHOLDS }
        );

        slides.forEach(slide => pinObserver.observe(slide));

        // scroll direction drives text slide-in direction via css data attribute
        let lastScrollY = 0;
        window.addEventListener('lenis-scroll', () => {
            const cur = window.lenis?.scroll ?? 0;
            if (cur > lastScrollY)      section.setAttribute('data-scroll-direction', 'down');
            else if (cur < lastScrollY) section.setAttribute('data-scroll-direction', 'up');
            lastScrollY = cur;
        });

        setActiveItem(0);

        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                slides.forEach(slide => {
                    const trackH = initSlideImages(slide);
                    slide.style.minHeight = `${trackH}px`;
                });
            }, 200);
        });
    });
})();
