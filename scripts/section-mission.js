/* mission section */
(() => {
    const { wait, staggerTime, lockTime, observeElementInOut } = window.AnimationUtils || {};
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
        section.classList.add('is-active');

        const subtitle = section.querySelector('.text-mask');
        if (subtitle) subtitle.classList.add('is-visible');

        const lines = [...section.querySelectorAll('.animate-line')];
        lines.forEach((line, i) => {
            line.classList.remove('is-visible');
            setTimeout(() => line.classList.add('is-visible'), i * LINE_STAGGER_MS);
        });
    }

    function playMissionExit(section) {
        section.classList.remove('is-active');
        const subtitle = section.querySelector('.text-mask');
        if (subtitle) subtitle.classList.remove('is-visible');
        section.querySelectorAll('.animate-line').forEach(line => line.classList.remove('is-visible'));
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
                onExit: async () => {
                    playMissionExit(section);
                    await wait(lockTime);
                }
            }]);
        } else {
            observeElementInOut(section, {
                onEnter: () => playMissionEnter(section)
            });
        }
    });
})();
