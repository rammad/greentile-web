/* team section */

(function () {
    const { observeElementInOut } = window.AnimationUtils || {};

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.getElementById('team');
        if (!section) return;

        const posters = section.querySelectorAll('.team-poster-wrap');

        if (observeElementInOut && posters.length) {
            posters.forEach((wrap, i) => {
                wrap.style.transitionDelay = `${i * 80}ms`;
                observeElementInOut(wrap, {
                    onEnter: () => wrap.classList.add('is-visible'),
                });
            });
        } else {
            posters.forEach(w => w.classList.add('is-visible'));
        }
    });
})();
