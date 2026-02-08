/* about section – column-based image animation; slide stack with body visibility */

(function () {
    const { transitionCta, observeElementInOut } = window.AnimationUtils || {};

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.getElementById('about');
        if (!section) return;

        const viewport = document.getElementById('scroll-viewport') || null;
        const track = section.querySelector('.about-image-track');
        const images = track ? Array.from(track.querySelectorAll('.scatter-img')) : [];
        let trackHeight = 0;

        const initLayout = () => {
            const isMobile = window.innerWidth < 768;
            const stepY = isMobile ? 140 : 160;
            let currentY = 0;

            images.forEach((img, index) => {
                const isLeft = index % 2 === 0;
                /* left column: 2–22%; right column: 78–98% (viewport %) so both sides appear on screen */
                const minX = isLeft ? 2 : 78;
                const maxX = isLeft ? 22 : 98;
                const randomX = Math.floor(Math.random() * (maxX - minX + 1)) + minX;
                const minW = isMobile ? 40 : 12;
                const maxW = isMobile ? 55 : 20;
                const randomW = Math.floor(Math.random() * (maxW - minW + 1)) + minW;
                const jitter = Math.floor(Math.random() * 120) - 60;
                const finalY = currentY + jitter;

                img.style.width = `${randomW}vw`;
                img.style.left = `${randomX}%`;
                img.style.top = `${finalY}px`;
                img.style.zIndex = Math.floor(Math.random() * 20);
                const startX = isLeft ? '-20vw' : '20vw';
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

            const slideHeight = trackHeight / 3;
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

            /* Observe each body block – animate in when the body is visible, not the parent */
            section.querySelectorAll('.about-text-block').forEach((block, i) => {
                observeElementInOut(block, {
                    root: viewport,
                    enterThreshold: 0.2,
                    onEnter() {
                        block.style.pointerEvents = 'auto';
                        Array.from(block.children).forEach((child, j) => {
                            setTimeout(() => {
                                if (child.classList.contains('cta-btn') && transitionCta) transitionCta(child, 'enter');
                                else child.classList.add('is-visible');
                            }, j * 100);
                        });
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
                enterThreshold: 0.1,
                onEnter() { leftImages.forEach((img) => img.classList.add('is-visible')); }
            });
            observeElementInOut(colRight, {
                root: viewport,
                enterThreshold: 0.1,
                onEnter() { rightImages.forEach((img) => img.classList.add('is-visible')); }
            });
        }

        initLayout();
        buildSlideStack();
        setupColumnObservers();

        /* Track: absolute so slides define section height; track sits behind */
        track.classList.add('about-image-track-positioned');

        let timer;
        window.addEventListener('resize', () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                initLayout();
                const slides = section.querySelectorAll('.about-slide');
                const slideHeight = trackHeight / 3;
                slides.forEach((s) => { s.style.height = `${slideHeight}px`; });
            }, 200);
        });
    });
})();
