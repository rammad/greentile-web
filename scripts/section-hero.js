/* hero section – one-time entrance when visible (new animation system) */

(function () {
    const { observeElementInOut } = window.AnimationUtils || {};

    function runHeroEnter(heroTitle) {
        heroTitle.classList.remove('header-hidden');
        heroTitle.classList.add('is-initialized');
        if (!window.playCascade) return;
        const words = heroTitle.querySelectorAll('.word-wrapper');
        if (words.length > 0) {
            words.forEach(word => window.playCascade(word));
        } else {
            window.playCascade(heroTitle);
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        const heroTitle = document.querySelector('.type-display-hero');
        if (!heroTitle) return;

        const viewport = document.getElementById('scroll-viewport');
        observeElementInOut(heroTitle, {
            root: viewport || null,
            enterThreshold: 0.15,
            onEnter: runHeroEnter
        });
    });
})();
