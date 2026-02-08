/* about-us page: scroll-spy for "What We Do" menu + slides (no ScrollManager) */

(function () {
    const { observeElementInOut } = window.AnimationUtils || {};

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.querySelector('.about.has-persistent-menu');
        if (!section) return;

        const viewport = document.getElementById('scroll-viewport') || null;
        const slides = section.querySelectorAll('.about-slide');
        const menuItems = section.querySelectorAll('.about-menu-persistent .menu-item[data-index]');
        if (!slides.length || !menuItems.length) return;

        observeElementInOut(section, {
            root: viewport,
            onEnter: () => {
                menuItems.forEach((item) => item.classList.add('is-visible'));
                const label = section.querySelector('.about-menu-persistent .menu-label .text-reveal-inner');
                const mask = section.querySelector('.about-menu-persistent .menu-label.text-mask');
                if (mask) mask.classList.add('is-visible');
                if (label) label.classList.add('is-visible');
            }
        });

        const setActiveSlide = (index) => {
            menuItems.forEach((item) => {
                const idx = parseInt(item.getAttribute('data-index'), 10);
                if (idx === index) {
                    item.classList.add('is-active');
                } else {
                    item.classList.remove('is-active');
                }
            });
            slides.forEach((slide, i) => {
                const content = slide.querySelector('.about-content');
                if (i === index && content) {
                    content.classList.add('is-visible');
                    const body = content.querySelector('.type-body1');
                    if (body) body.classList.add('is-visible');
                }
            });
        };

        slides.forEach((slide, index) => {
            observeElementInOut(slide, {
                root: viewport,
                enterThreshold: 0.2,
                repeat: true,
                onEnter: () => setActiveSlide(index)
            });
            slide.querySelectorAll('.scatter-img').forEach((img) => {
                observeElementInOut(img, {
                    root: viewport,
                    onEnter: () => img.classList.add('is-visible')
                });
            });
        });

        setActiveSlide(0);
    });
})();
