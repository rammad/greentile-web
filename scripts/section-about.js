/* about section – observer-driven + sticky text + image scroll-spy */

(function () {
    const { transitionCta } = window.AnimationUtils || {};

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.getElementById('about');
        if (!section) return;

        const track = section.querySelector('.about-image-track');
        const images = track ? Array.from(track.querySelectorAll('.scatter-img')) : [];
        const textBlocks = section.querySelectorAll('.about-text-block');

        let currentGroup = null;

        const initLayout = () => {
            const isMobile = window.innerWidth < 768;
            const startY = isMobile ? 0 : 0;
            const stepY = isMobile ? 140 : 160;
            let currentY = startY;

            images.forEach((img, index) => {
                const isLeft = index % 2 === 0;
                const minX = isLeft ? -5 : 75;
                const maxX = isLeft ? 15 : 95;
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

            if (track) track.style.height = `${currentY}px`;
        };

        const activateText = (index) => {
            if (currentGroup === index) return;

            if (currentGroup !== null) {
                const oldTarget = document.getElementById(`text-${currentGroup}`);
                if (oldTarget) {
                    oldTarget.style.pointerEvents = 'none';
                    Array.from(oldTarget.children).forEach((child) => {
                        if (child.classList.contains('cta-btn')) {
                            if (transitionCta) transitionCta(child, 'exit');
                        } else {
                            child.classList.remove('is-visible');
                        }
                    });
                }
            }

            currentGroup = index;

            const newTarget = document.getElementById(`text-${index}`);
            if (newTarget) {
                newTarget.style.pointerEvents = 'auto';
                const children = Array.from(newTarget.children);
                children.forEach((child, i) => {
                    setTimeout(() => {
                        if (child.classList.contains('cta-btn')) {
                            if (transitionCta) transitionCta(child, 'enter');
                            else child.classList.add('is-visible');
                        } else {
                            child.classList.add('is-visible');
                        }
                    }, i * 100);
                });
            }
        };

        const initScrollSpy = () => {
            const observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        if (!entry.isIntersecting) return;
                        const img = entry.target;
                        img.classList.add('is-visible');
                        if (img.style.transform) img.style.transform = img.style.transform.replace('scale(0.9)', 'scale(1)');
                        const groupIndex = img.dataset.group;
                        if (groupIndex !== undefined) activateText(Number(groupIndex));
                    });
                },
                { root: null, threshold: 0.15, rootMargin: '0px 0px -20% 0px' }
            );
            images.forEach((img) => observer.observe(img));
        };

        const sectionObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    activateText(0);
                });
            },
            { threshold: 0.1 }
        );
        sectionObserver.observe(section);

        initLayout();
        initScrollSpy();
        activateText(0);

        let timer;
        window.addEventListener('resize', () => {
            clearTimeout(timer);
            timer = setTimeout(initLayout, 200);
        });
    });
})();
