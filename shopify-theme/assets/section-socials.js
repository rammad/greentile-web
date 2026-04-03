/* socials section – one-time entrance when visible, then stay */

(function () {
    const { observeElementInOut, staggerTime } = window.AnimationUtils || {};

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.querySelector('.socials-section');
        if (!section) return;

        const subhead  = section.querySelector('.socials-subhead');
        const title    = section.querySelector('.type-h1.animate-cascade');
        const subtitle = section.querySelector('.text-mask');
        const body     = section.querySelector('.type-body2, .type-body1');
        const icons    = section.querySelector('.socials-icons');
        const gallery  = section.querySelector('.socials-track');

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

        const imgs = gallery.querySelectorAll('.social-img');
        if (imgs.length === 0) return;

        const desktopMQ = window.matchMedia('(min-width: 1025px)');

        function updatePushDown() {
            const imgWidth = imgs[0].offsetWidth;
            const gap = parseFloat(getComputedStyle(gallery).columnGap) || 0;
            const total = imgs.length;

            const visibleCount = Math.min(
                total,
                Math.floor((window.innerWidth + gap) / (imgWidth + (gap * 2)) + 1
            );
            const firstVisible = Math.floor((total - visibleCount) / 2);

            const isDesktop = desktopMQ.matches;

            imgs.forEach((img, i) => {
                const isEdgePos = ((i - firstVisible) & 1) === 0;
                img.classList.toggle('push-down', isDesktop ? isEdgePos : !isEdgePos);
            });
        }

        let resizeId;
        window.addEventListener('resize', () => {
            clearTimeout(resizeId);
            resizeId = setTimeout(updatePushDown, 100);
        });

        updatePushDown();

        observeElementInOut(gallery, {
            enterThreshold: 0.01,
            onEnter() {
                imgs.forEach((img, i) => {
                    setTimeout(() => img.classList.add('is-visible'), stagger * i);
                });
            }
        });
    });
})();
