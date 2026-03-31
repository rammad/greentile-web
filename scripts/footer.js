/* footer section – one-time entrance + marquee init */

(function () {
    const { observeElementInOut, staggerTime, scrollSpeed } = window.AnimationUtils || {};

    function constrainFooterTitle() {
        if (window.innerWidth > 768) return;

        const main = document.querySelector('.footer-main');
        const title = main?.querySelector('.type-display-hero');
        const linksEl = main?.querySelector('.footer-links');
        if (!main || !title || !linksEl) return;

        const mainHeight = main.clientHeight;

        const savedGrow = linksEl.style.flexGrow;
        linksEl.style.flexGrow = '0';
        const minLinksHeight = linksEl.offsetHeight;
        linksEl.style.flexGrow = savedGrow;

        const titleHeight = title.offsetHeight;
        const available = mainHeight - minLinksHeight;

        if (titleHeight > available && available > 0 && titleHeight > 0) {
            const scale = available / titleHeight;
            const currentSize = parseFloat(title.style.fontSize);
            if (currentSize) title.style.fontSize = `${currentSize * scale}px`;
        }
    }

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

        document.fonts.ready.then(constrainFooterTitle);

        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(constrainFooterTitle, 100);
        });
    });
})();
