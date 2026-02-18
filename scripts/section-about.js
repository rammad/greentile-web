/* about section – column-based image animation; slide stack with body visibility */

(function () {
    const {
        animate,
        transitionCta,
        observeElementInOut,
        wait,
        waitForTransition,
        staggerTime
    } = window.AnimationUtils || {};

    const MOBILE_BREAKPOINT = 768;
    const STEP_Y_MOBILE = 140;
    const STEP_Y_DESKTOP = 160;
    const COL_LEFT_X_MIN = -5;
    const COL_LEFT_X_MAX = 25;
    const COL_RIGHT_X_MIN = 65;
    const COL_RIGHT_X_MAX = 95;
    const IMG_WIDTH_MOBILE_MIN = 40;
    const IMG_WIDTH_MOBILE_MAX = 55;
    const IMG_WIDTH_DESKTOP_MIN = 7;
    const IMG_WIDTH_DESKTOP_MAX = 12;
    const IMG_JITTER_RANGE = 120;
    const IMG_Z_INDEX_MAX = 20;
    const SLIDE_START_OFFSET_VW = 20;
    const ABOUT_BLOCK_ENTER_THRESHOLD = 0.3;
    const ABOUT_COL_ENTER_THRESHOLD = 0.25;
    const PIN_ENTER_RATIO = 0.4;
    const PIN_LEAVE_RATIO = 0.3;
    const PIN_OBSERVER_THRESHOLDS = [PIN_LEAVE_RATIO, 0.25, PIN_ENTER_RATIO, 0.5, 0.75, 1];
    
    /* Image scale effect: images grow as they approach vertical center of viewport (curved surface feel) */
    const IMG_SCALE_MIN = 1.0;     /* Scale when image is at top/bottom edge of viewport */
    const IMG_SCALE_MAX = 1.0;    /* Scale when image is at vertical center of viewport */
    
    /* Pinned text scroll parallax: subtle vertical movement while pinned */
    const PINNED_TEXT_SCROLL_RANGE = 150; /* Total pixels the text can move up/down during its pin duration */
    const PINNED_TEXT_PARALLAX_FACTOR = 0.1; /* How much the scroll delta affects position (0.0-1.0, lower = slower) */

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.getElementById('about');
        if (!section) return;

        const viewport = document.getElementById('scroll-viewport') || null;
        const track = section.querySelector('.about-image-track');
        const images = track ? Array.from(track.querySelectorAll('.scatter-img')) : [];
        let trackHeight = 0;
        let lastScrollY = 0;
        let scrollDirection = 'down'; /* 'up' or 'down' */
        let pinnedScrollStart = 0; /* Scroll position when current slide was pinned */

        const initLayout = () => {
            const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
            const stepY = isMobile ? STEP_Y_MOBILE : STEP_Y_DESKTOP;
            let currentY = 0;

            images.forEach((img, index) => {
                const isLeft = index % 2 === 0;
                const minX = isLeft ? COL_LEFT_X_MIN : COL_RIGHT_X_MIN;
                const maxX = isLeft ? COL_LEFT_X_MAX : COL_RIGHT_X_MAX;
                const randomX = Math.floor(Math.random() * (maxX - minX + 1)) + minX;
                const minW = isMobile ? IMG_WIDTH_MOBILE_MIN : IMG_WIDTH_DESKTOP_MIN;
                const maxW = isMobile ? IMG_WIDTH_MOBILE_MAX : IMG_WIDTH_DESKTOP_MAX;
                const randomW = Math.floor(Math.random() * (maxW - minW + 1)) + minW;
                const jitter = Math.floor(Math.random() * IMG_JITTER_RANGE) - IMG_JITTER_RANGE / 2;
                const finalY = currentY + jitter;

                img.style.width = `${randomW}vw`;
                img.style.left = `${randomX}%`;
                img.style.top = `${finalY}px`;
                img.style.zIndex = Math.floor(Math.random() * IMG_Z_INDEX_MAX);
                const startX = isLeft ? `-${SLIDE_START_OFFSET_VW}vw` : `${SLIDE_START_OFFSET_VW}vw`;
                img.style.setProperty('--slide-start', startX);
                currentY += stepY;
            });

            trackHeight = currentY;
            if (track) track.style.height = `${trackHeight}px`;
        };

        /* Build slide stack: 3 slides, each 1/3 of column height, sticky body in center; body animates when body is visible */
        function buildSlideStack() {
            const stickyContent = section.querySelector('.about-sticky-content');
            const textBlocks = section.querySelectorAll('.about-text-block');
            if (!stickyContent || textBlocks.length === 0 || trackHeight <= 0) return;

            const slideHeight = trackHeight / textBlocks.length;
            const slidesWrap = document.createElement('div');
            slidesWrap.className = 'about-slides';

            [].forEach.call(textBlocks, (block, i) => {
                const slide = document.createElement('div');
                slide.className = 'about-slide';
                slide.style.height = `${slideHeight}px`;

                const sticky = document.createElement('div');
                sticky.className = 'about-slide-sticky';
                sticky.appendChild(block);
                slide.appendChild(sticky);
                slidesWrap.appendChild(slide);
            });

            section.appendChild(slidesWrap);
            stickyContent.remove();

            /* Observe each body block – pin logic handles enter (animate + transitionCta); here only reset on leave */
            section.querySelectorAll('.about-text-block').forEach((block) => {
                const cta = block.querySelector('.cta-btn');
                const bodyText = block.querySelectorAll('.type-body2, .type-body1');
                observeElementInOut(block, {
                    root: viewport,
                    enterThreshold: ABOUT_BLOCK_ENTER_THRESHOLD,
                    repeat: true,
                    onEnter() {
                        block.style.pointerEvents = 'auto';
                    },
                    onLeave() {
                        block.style.pointerEvents = 'none';
                        const sticky = block.closest('.about-slide-sticky');
                        if (sticky) sticky.classList.add('is-unpinning');
                        bodyText.forEach((el) => el.classList.remove('is-visible'));
                        if (cta && transitionCta) transitionCta(cta, 'exit');
                        /* Remove is-unpinning after transition so next enter uses correct starting position */
                        setTimeout(() => {
                            if (sticky) sticky.classList.remove('is-unpinning');
                        }, 600);
                    }
                });
            });
        }

        /* Column sentinels: bind image visibility to full column, not individual images */
        function setupColumnObservers() {
            const colLeft = document.createElement('div');
            colLeft.className = 'about-col about-col-left';
            const colRight = document.createElement('div');
            colRight.className = 'about-col about-col-right';
            track.appendChild(colLeft);
            track.appendChild(colRight);

            const leftImages = images.filter((_, i) => i % 2 === 0);
            const rightImages = images.filter((_, i) => i % 2 === 1);

            observeElementInOut(colLeft, {
                root: viewport,
                enterThreshold: ABOUT_COL_ENTER_THRESHOLD,
                onEnter() { leftImages.forEach((img) => img.classList.add('is-visible')); }
            });
            observeElementInOut(colRight, {
                root: viewport,
                enterThreshold: ABOUT_COL_ENTER_THRESHOLD,
                onEnter() { rightImages.forEach((img) => img.classList.add('is-visible')); }
            });
        }

        initLayout();
        buildSlideStack();
        setupColumnObservers();

        /* Track: absolute so slides define section height; track sits behind */
        track.classList.add('about-image-track-positioned');

        /* Image scale effect: scale images based on distance from viewport center (curved surface) */
        function updateImageScales() {
            if (!viewport) return;
            const viewportRect = viewport.getBoundingClientRect();
            const viewportCenterY = viewportRect.height / 2;

            images.forEach((img) => {
                const imgRect = img.getBoundingClientRect();
                const imgCenterY = imgRect.top + imgRect.height / 2 - viewportRect.top;
                const distanceFromCenter = Math.abs(imgCenterY - viewportCenterY);
                const maxDistance = viewportRect.height / 2;
                const proximity = 1 - Math.min(distanceFromCenter / maxDistance, 1);
                const scale = IMG_SCALE_MIN + (IMG_SCALE_MAX - IMG_SCALE_MIN) * proximity;
                img.style.transform = `translateX(${img.classList.contains('is-visible') ? '0px' : img.style.getPropertyValue('--slide-start')}) scale(${scale})`;
            });
        }

        /* Track scroll direction for body text slide-in direction */
        function updateScrollDirection() {
            if (!window.lenis) return;
            const currentScrollY = window.lenis.scroll;
            if (currentScrollY > lastScrollY) scrollDirection = 'down';
            else if (currentScrollY < lastScrollY) scrollDirection = 'up';
            lastScrollY = currentScrollY;
            section.setAttribute('data-scroll-direction', scrollDirection);
        }
        
        /* Apply subtle parallax to pinned text based on scroll delta */
        function updatePinnedTextParallax(currentScroll) {
            if (!pinnedSticky) return;
            
            const slide = pinnedSticky.closest('.about-slide');
            if (!slide) return;
            
            const viewportHeight = window.innerHeight;
            const slideRect = slide.getBoundingClientRect();
            
            // Calculate where the slide's center is relative to viewport center
            // When slide center = viewport center, this is 0
            // Positive = slide is below center, Negative = slide is above center
            const slideCenterY = slideRect.top + (slideRect.height / 2);
            const viewportCenterY = viewportHeight / 2;
            const distanceFromCenter = slideCenterY - viewportCenterY;
            
            // Map this distance to our offset range
            // Scale it down significantly since distanceFromCenter can be hundreds of pixels
            const offset = -distanceFromCenter * PINNED_TEXT_PARALLAX_FACTOR;
            const clampedOffset = Math.max(-PINNED_TEXT_SCROLL_RANGE / 2, Math.min(PINNED_TEXT_SCROLL_RANGE / 2, offset));
            
            const textBlock = pinnedSticky.querySelector('.about-text-block');
            if (textBlock) {
                console.log('Parallax:', { 
                    slideCenterY: slideCenterY.toFixed(0),
                    viewportCenterY: viewportCenterY.toFixed(0),
                    distanceFromCenter: distanceFromCenter.toFixed(0),
                    offset: offset.toFixed(1), 
                    clampedOffset: clampedOffset.toFixed(1) 
                });
                textBlock.style.setProperty('--pinned-scroll-offset', `${-clampedOffset}px`);
            }
        }

        window.addEventListener('lenis-scroll', (e) => {
            const currentScroll = e.detail?.scroll ?? 0;
            updateScrollDirection();
            updateImageScales();
            updatePinnedTextParallax(currentScroll);
        });
        updateImageScales();

        /* Pin/unpin by slide visibility; use animate() for fade-in, waitForTransition for fade-out. */
        const slides = section.querySelectorAll('.about-slide');
        const slideRatios = new Map();
        let pinnedSticky = null;
        let unpinningInProgress = false;
        const pinDelayMs = typeof staggerTime === 'number' ? staggerTime : 200;

        function clearPin(sticky) {
            if (!sticky) return;
            sticky.classList.remove('is-pinned', 'is-pinning', 'is-unpinning');
            sticky.querySelectorAll('.type-body2, .type-body1').forEach((el) => el.classList.remove('is-visible'));
            const cta = sticky.querySelector('.cta-btn');
            if (cta && transitionCta) transitionCta(cta, 'exit');
            
            // Reset parallax offset
            const textBlock = sticky.querySelector('.about-text-block');
            if (textBlock) textBlock.style.removeProperty('--pinned-scroll-offset');
        }

        async function applyPin(candidateSticky) {
            // 1. Let the previous pin fade out gracefully instead of instantly ripping it off
            if (pinnedSticky && pinnedSticky !== candidateSticky) {
                startUnpin(pinnedSticky);
            }
            
            pinnedSticky = candidateSticky;
            pinnedScrollStart = window.lenis ? window.lenis.scroll : 0;
            candidateSticky.classList.add('is-pinned', 'is-pinning');
            candidateSticky.classList.remove('is-unpinning');

            await wait(pinDelayMs);
            if (pinnedSticky !== candidateSticky) return;

            candidateSticky.classList.remove('is-pinning');
            const bodyText = candidateSticky.querySelectorAll('.type-body2, .type-body1');
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

            // 1. Trigger the fade out on the text/cta FIRST while still pinned
            sticky.querySelectorAll('.type-body2, .type-body1').forEach((el) => el.classList.remove('is-visible'));
            const cta = sticky.querySelector('.cta-btn');
            if (cta && transitionCta) transitionCta(cta, 'exit');

            // 2. Wait for the CSS fade-out transition to finish
            const textElements = sticky.querySelectorAll('.type-body2, .type-body1');
            if (textElements.length > 0 && waitForTransition) {
                await waitForTransition(textElements[0]);
            } else if (wait) {
                await wait(pinDelayMs); // Use pinDelayMs instead of hardcoded 200
            }

            // 3. NOW remove the pin classes, returning it to standard document flow invisibly
            clearPin(sticky);
            if (pinnedSticky === sticky) pinnedSticky = null;
            unpinningInProgress = false;
        }

        const pinObserver = new IntersectionObserver(
            (entries) => {
                if (unpinningInProgress) return; // Don't process while unpinning

                entries.forEach((e) => slideRatios.set(e.target, e.intersectionRatio));
                const currentSlide = pinnedSticky ? pinnedSticky.closest('.about-slide') : null;
                const currentRatio = currentSlide ? (slideRatios.get(currentSlide) ?? 0) : 0;

                if (pinnedSticky && currentRatio <= PIN_LEAVE_RATIO) {
                    startUnpin(pinnedSticky);
                    return; // Don't continue to applyPin in same tick
                }

                let maxRatio = 0;
                let candidateSticky = null;
                slides.forEach((slide) => {
                    const r = slideRatios.get(slide) ?? 0;
                    if (r >= PIN_ENTER_RATIO && r > maxRatio) {
                        maxRatio = r;
                        candidateSticky = slide.querySelector('.about-slide-sticky');
                    }
                });

                if (candidateSticky && candidateSticky !== pinnedSticky) {
                    applyPin(candidateSticky);
                }
            },
            { root: viewport, threshold: PIN_OBSERVER_THRESHOLDS }
        );
        slides.forEach((s) => pinObserver.observe(s));

        let resizeTimer;
        const resizeDebounceMs = typeof staggerTime === 'number' ? staggerTime : 200;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                initLayout();
                const slidesAfterResize = section.querySelectorAll('.about-slide');
                const slideHeight = trackHeight / slidesAfterResize.length;
                slidesAfterResize.forEach((s) => { s.style.height = `${slideHeight}px`; });
            }, resizeDebounceMs);
        });
    });
})();
