/* mission section */
(() => {
    const { observeElementInOut } = window.AnimationUtils || {};
    const { fitTextToWidth } = window.AppUtils || {};

    const LINE_STAGGER_MS = 80;

    function getVisibleLines(section) {
        const groups = [...section.querySelectorAll('.mission-lines')];
        const visible = groups.find(g => getComputedStyle(g).display !== 'none');
        if (visible) return [...visible.querySelectorAll('.animate-line')];
        return [...section.querySelectorAll('.animate-line')];
    }

    function fitMissionLines(section) {
        if (!fitTextToWidth) return;
        section.querySelectorAll('.mission-lines').forEach(group => {
            const lines = [...group.querySelectorAll('.animate-line')];
            if (!lines.length) return;
            lines.forEach(line => { line.style.fontSize = ''; fitTextToWidth(line); });
            const minSize = Math.min(...lines.map(line => parseFloat(line.style.fontSize)));
            lines.forEach(line => line.style.fontSize = `${minSize}px`);
        });
    }

    async function playMissionEnter(section) {
        if (!section) return;
        section.classList.add('is-revealed');

        const subtitle = section.querySelector('.text-mask');
        if (subtitle) subtitle.classList.add('is-visible');

        const lines = getVisibleLines(section);
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
