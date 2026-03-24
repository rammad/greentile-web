/* footer section – one-time entrance + marquee init */

(function () {
    const { observeElementInOut, staggerTime, scrollSpeed } = window.AnimationUtils || {};

    document.addEventListener('DOMContentLoaded', () => {
        const footerSection = document.querySelector('.footer-section');
        if (!footerSection) return;

        if (typeof MarqueeManager !== 'undefined') {
            new MarqueeManager('.marquee-content', scrollSpeed || 40, false);
        }

        const resetAndPlay = (element) => {
            if (!element) return;
            const chars = element.querySelectorAll('.char-reveal');
            chars.forEach((c) => {
                c.style.transition = 'none';
                c.classList.remove('is-visible');
            });
            void element.offsetWidth;
            requestAnimationFrame(() => {
                chars.forEach((c, i) => {
                    c.style.transition = '';
                    c.style.transitionDelay = `${i * 30}ms`;
                });
                if (window.playCascade) window.playCascade(element);
            });
        };

        const title = footerSection.querySelector('.animate-cascade');
        const links = footerSection.querySelectorAll('.ui-roll');

        if (title) {
            observeElementInOut(title, {
                onEnter() { resetAndPlay(title); }
            });
        }

        links.forEach((link, i) => {
            observeElementInOut(link, {
                onEnter() {
                    setTimeout(() => link.classList.add('is-visible'), (staggerTime || 200) * (i + 1));
                }
            });
        });
    });
})();
