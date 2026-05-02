/* socials section – entrance + mobile carousel with infinite loop */

(function () {
    const { observeElementInOut, staggerTime } = window.AnimationUtils || {};
    const MOBILE_BP = 1024;

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.querySelector('.socials-section');
        if (!section) return;

        const subhead = section.querySelector('.socials-subhead');
        const title = section.querySelector('.type-h1.animate-cascade');
        const subtitle = section.querySelector('.text-mask');
        const body = section.querySelector('.type-body2, .type-body1');
        const icons = section.querySelector('.socials-icons');
        const gallery = section.querySelector('.socials-track');
        const stagger = staggerTime;

        if (subhead) {
            observeElementInOut(subhead, {
                onEnter() { subhead.classList.add('is-visible'); }
            });
        }
        if (subtitle) {
            observeElementInOut(subtitle, {
                onEnter() { subtitle.classList.add('is-visible'); }
            });
        }
        if (title) {
            observeElementInOut(title, {
                onEnter() {
                    if (window.playCascade) window.playCascade(title);
                }
            });
        }
        if (body) {
            observeElementInOut(body, {
                onEnter() { setTimeout(() => body.classList.add('is-visible'), stagger); }
            });
        }
        if (icons) {
            observeElementInOut(icons, {
                onEnter() { setTimeout(() => icons.classList.add('is-visible'), stagger); }
            });
        }

        if (!gallery) return;

        const originalImgs = [...gallery.querySelectorAll('.social-img')];
        if (originalImgs.length === 0) return;

        const N = originalImgs.length;
        const desktopMQ = window.matchMedia('(min-width: ' + (MOBILE_BP + 1) + 'px)');
        let carouselActive = false;
        let dotsEl = null;
        let allImgs = [];
        let isRepositioning = false;
        let scrollEndTimer = null;
        let galleryRevealed = false;
        let pushDownPhase = 0;

        /* desktop push-down alternation */

        function updatePushDown() {
            if (carouselActive) return;

            const imgWidth = originalImgs[0].offsetWidth;
            const gap = parseFloat(getComputedStyle(gallery).columnGap) || 0;
            const visibleCount = Math.min(
                N,
                Math.floor((window.innerWidth + gap) / (imgWidth + gap * 2) + 1)
            );
            const firstVisible = Math.floor((N - visibleCount) / 2);
            const isDesktop = desktopMQ.matches;

            originalImgs.forEach((img, i) => {
                const isEdgePos = ((i - firstVisible) & 1) === 0;
                img.classList.toggle('push-down', isDesktop ? isEdgePos : !isEdgePos);
            });
        }

        /* gallery entrance reveal */

        observeElementInOut(gallery, {
            enterThreshold: 0.01,
            onEnter() {
                if (galleryRevealed) return;
                galleryRevealed = true;
                if (carouselActive) {
                    allImgs.forEach(img => img.classList.add('is-visible'));
                } else {
                    originalImgs.forEach((img, i) => {
                        setTimeout(() => img.classList.add('is-visible'), stagger * i);
                    });
                }
            }
        });

        /* carousel stagger (absolute-position based) */

        function applyStagger() {
            allImgs.forEach((img, i) => {
                img.classList.toggle('push-down', (i + pushDownPhase) % 2 !== 0);
            });
        }

        /* carousel helpers */

        function getClosestIndex() {
            const center = gallery.scrollLeft + gallery.offsetWidth / 2;
            let closest = 0;
            let closestDist = Infinity;
            allImgs.forEach((img, i) => {
                const imgCenter = img.offsetLeft + img.offsetWidth / 2;
                const dist = Math.abs(imgCenter - center);
                if (dist < closestDist) { closestDist = dist; closest = i; }
            });
            return closest;
        }

        function updateDots(logicalIdx) {
            if (!dotsEl) return;
            dotsEl.querySelectorAll('.socials-dot').forEach((d, i) => {
                d.classList.toggle('is-active', i === logicalIdx);
            });
        }

        function onScroll() {
            if (isRepositioning) return;
            updateDots(getClosestIndex() % N);
            if (!('onscrollend' in window)) {
                clearTimeout(scrollEndTimer);
                scrollEndTimer = setTimeout(onScrollEnd, 150);
            }
        }

        function onScrollEnd() {
            if (isRepositioning) return;
            const idx = getClosestIndex();
            const logical = idx % N;
            updateDots(logical);

            // teleport back to the real set when resting on a clone
            if (idx < N || idx >= 2 * N) {
                isRepositioning = true;
                const targetIdx = N + logical;
                const target = allImgs[targetIdx];

                // odd N means the clone and its real counterpart sit at
                // different parities — flip the phase so translateY values
                // stay identical across the teleport, then kill transitions
                // so the class swap is instant (no animated 40px jump)
                const needsFlip = N % 2 !== 0;
                if (needsFlip) {
                    allImgs.forEach(img => { img.style.transition = 'none'; });
                    pushDownPhase = 1 - pushDownPhase;
                    applyStagger();
                }

                const scroll = target.offsetLeft - gallery.offsetWidth / 2 + target.offsetWidth / 2;
                gallery.style.scrollSnapType = 'none';
                gallery.scrollLeft = scroll;

                if (needsFlip) {
                    void gallery.offsetHeight;
                    allImgs.forEach(img => { img.style.transition = ''; });
                }

                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        gallery.style.scrollSnapType = '';
                        isRepositioning = false;
                    });
                });
            }
        }

        /* carousel setup / teardown */

        function setupCarousel() {
            if (carouselActive) return;
            carouselActive = true;
            pushDownPhase = 0;

            // prepend one full set of clones (in order)
            const refNode = originalImgs[0];
            for (let i = 0; i < N; i++) {
                const clone = originalImgs[i].cloneNode(true);
                clone.classList.add('social-clone', 'is-visible');
                gallery.insertBefore(clone, refNode);
            }

            // append one full set of clones
            for (let i = 0; i < N; i++) {
                const clone = originalImgs[i].cloneNode(true);
                clone.classList.add('social-clone', 'is-visible');
                gallery.appendChild(clone);
            }

            allImgs = [...gallery.querySelectorAll('.social-img')];

            // stagger by absolute position so the pattern is continuous
            // across clone → original boundaries
            applyStagger();

            originalImgs.forEach(img => img.classList.add('is-visible'));

            // scroll to first real image (centre it)
            requestAnimationFrame(() => {
                const first = originalImgs[0];
                const scroll = first.offsetLeft - gallery.offsetWidth / 2 + first.offsetWidth / 2;
                gallery.style.scrollSnapType = 'none';
                gallery.scrollLeft = scroll;
                requestAnimationFrame(() => { gallery.style.scrollSnapType = ''; });
            });

            // create dot indicators
            dotsEl = document.createElement('div');
            dotsEl.className = 'socials-dots';
            for (let i = 0; i < N; i++) {
                const dot = document.createElement('span');
                dot.className = 'socials-dot';
                if (i === 0) dot.classList.add('is-active');
                dotsEl.appendChild(dot);
            }
            gallery.after(dotsEl);

            gallery.addEventListener('scroll', onScroll, { passive: true });
            if ('onscrollend' in window) {
                gallery.addEventListener('scrollend', onScrollEnd);
            }
        }

        function teardownCarousel() {
            if (!carouselActive) return;
            carouselActive = false;
            clearTimeout(scrollEndTimer);

            gallery.querySelectorAll('.social-clone').forEach(c => c.remove());
            if (dotsEl) { dotsEl.remove(); dotsEl = null; }

            gallery.removeEventListener('scroll', onScroll);
            if ('onscrollend' in window) {
                gallery.removeEventListener('scrollend', onScrollEnd);
            }

            allImgs = [];
            isRepositioning = false;
            pushDownPhase = 0;
            updatePushDown();
        }

        /* init + resize */

        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                const mobile = window.innerWidth <= MOBILE_BP;
                if (mobile && !carouselActive) setupCarousel();
                else if (!mobile && carouselActive) teardownCarousel();
                if (!carouselActive) updatePushDown();
            }, 100);
        });

        if (window.innerWidth <= MOBILE_BP) setupCarousel();
        else updatePushDown();
    });
})();
