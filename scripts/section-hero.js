/* hero section – one-time entrance when visible (new animation system) */

(function () {
    const { observeElementInOut } = window.AnimationUtils || {};

    function runHeroEnter(heroTitle) {
        heroTitle.classList.remove('header-hidden');
        heroTitle.classList.add('is-initialized');
        if (window.playCascade) window.playCascade(heroTitle);
    }

    document.addEventListener('DOMContentLoaded', () => {
        const heroTitle = document.querySelector('#hero .type-display-hero');
        if (!heroTitle) return;

        const viewport = document.getElementById('scroll-viewport');
        observeElementInOut(heroTitle, {
            root: viewport || null,
            enterThreshold: 0.15,
            onEnter: runHeroEnter
        });
    });
})();
