/* mission section */
(() => {
    const { observeElementInOut } = window.AnimationUtils || {};
    const { fitTextToWidth } = window.AppUtils || {};

    const LINE_STAGGER_MS = 80;
    const mobileQuery = window.matchMedia('(max-width: 1024px)');
    let originalTexts = null;

    function measureNaturalLines(group, fullText) {
        const words = fullText.split(/\s+/).filter(Boolean);
        if (!words.length) return [fullText];

        const probe = document.createElement('h1');
        probe.className = 'type-display-hero';
        probe.style.visibility = 'hidden';

        words.forEach((word, i) => {
            const span = document.createElement('span');
            span.textContent = word;
            probe.appendChild(span);
            if (i < words.length - 1) probe.appendChild(document.createTextNode(' '));
        });

        group.appendChild(probe);

        const spans = [...probe.querySelectorAll('span')];
        const lines = [];
        let prevTop = null;
        let currentLine = [];

        spans.forEach(span => {
            const top = Math.round(span.getBoundingClientRect().top);
            if (prevTop !== null && top !== prevTop) {
                lines.push(currentLine.join(' '));
                currentLine = [];
            }
            currentLine.push(span.textContent);
            prevTop = top;
        });
        if (currentLine.length) lines.push(currentLine.join(' '));

        group.removeChild(probe);
        return lines;
    }

    function rebuildLines(group, texts, revealed) {
        group.innerHTML = '';
        texts.forEach(text => {
            const h1 = document.createElement('h1');
            h1.className = 'type-display-hero animate-line';
            if (revealed) h1.classList.add('is-visible');
            h1.textContent = text;
            group.appendChild(h1);
        });
    }

    function layoutMissionLines(section) {
        const group = section.querySelector('.mission-lines');
        if (!group) return;

        if (!originalTexts) {
            originalTexts = [...group.querySelectorAll('.animate-line')].map(l => l.textContent);
        }

        const revealed = section.classList.contains('is-revealed');

        group.querySelectorAll('.animate-line').forEach(l => { l.style.fontSize = ''; });

        if (mobileQuery.matches) {
            const fullText = originalTexts.join(' ');
            const naturalLines = measureNaturalLines(group, fullText);
            rebuildLines(group, naturalLines, revealed);
        } else {
            const current = [...group.querySelectorAll('.animate-line')].map(l => l.textContent);
            if (current.length !== originalTexts.length ||
                current.some((t, i) => t !== originalTexts[i])) {
                rebuildLines(group, originalTexts, revealed);
            }
            if (fitTextToWidth) {
                const lines = [...group.querySelectorAll('.animate-line')];
                lines.forEach(line => { line.style.fontSize = ''; fitTextToWidth(line); });
                const minSize = Math.min(...lines.map(l => parseFloat(l.style.fontSize)));
                lines.forEach(line => line.style.fontSize = `${minSize}px`);
            }
        }
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

        document.fonts.ready.then(() => layoutMissionLines(section));
        window.addEventListener('resize', () => layoutMissionLines(section));

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
