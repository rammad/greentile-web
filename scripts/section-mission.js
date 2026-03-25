/* mission section */
(() => {
    const { observeElementInOut } = window.AnimationUtils || {};
    const { fitTextToWidth } = window.AppUtils || {};

    const LINE_STAGGER_MS = 80;

    function fitMissionLines(section) {
        if (!fitTextToWidth) return;
        const lines = [...section.querySelectorAll('.animate-line')];
        if (!lines.length) return;
        lines.forEach(line => fitTextToWidth(line));
        // use the size the longest line produced (smallest value) so all lines match
        const minSize = Math.min(...lines.map(line => parseFloat(line.style.fontSize)));
        lines.forEach(line => line.style.fontSize = `${minSize}px`);
    }

    async function playMissionEnter(section) {
        if (!section) return;
        section.classList.add('is-revealed');

        const subtitle = section.querySelector('.text-mask');
        if (subtitle) subtitle.classList.add('is-visible');

        const lines = [...section.querySelectorAll('.animate-line')];
        lines.forEach((line, i) => {
            line.classList.remove('is-visible');
            setTimeout(() => line.classList.add('is-visible'), i * LINE_STAGGER_MS);
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.querySelector('.mission-section');
        if (!section) return;

        document.fonts.ready.then(() => fitMissionLines(section));
        window.addEventListener('resize', () => fitMissionLines(section));

        if (window.ScrollManager) {
            ScrollManager.addSteps([{
                id: 'mission',
                onEnter: async () => { await playMissionEnter(section); },
            }]);
        } else {
            observeElementInOut(section, {
                onEnter: () => playMissionEnter(section)
            });
        }
    });
})();
