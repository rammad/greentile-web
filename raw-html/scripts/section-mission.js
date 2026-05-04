/* mission section — reflow joined copy at the same scale as before (min of per–CMS-line fitTextToWidth), then split wraps */
(() => {
    const { observeElementInOut } = window.AnimationUtils || {};
    const { fitTextToWidth, fitTextGroupToWidth } = window.AppUtils || {};

    const LINE_STAGGER_MS = 80;
    const mobileQuery = window.matchMedia('(max-width: 1024px)');
    let originalTexts = null;

    /** Same shared font size desktop used before: min of fitTextToWidth on each theme line (nowrap full-line width). */
    function computeLegacyDesktopMinFont(group, cmsLines) {
        if (!fitTextToWidth || !cmsLines.length) return null;
        const w = group.clientWidth;
        if (w <= 0) return null;

        const holder = document.createElement('div');
        holder.setAttribute('aria-hidden', 'true');
        holder.style.cssText =
            `position:absolute;left:-9999px;top:0;width:${w}px;visibility:hidden;pointer-events:none;`;
        const section = group.closest('.mission-section') || document.body;
        section.appendChild(holder);

        cmsLines.forEach(text => {
            const h = document.createElement('h1');
            h.className = 'type-display-hero animate-line';
            h.textContent = text;
            holder.appendChild(h);
        });

        const hs = [...holder.querySelectorAll('h1')];
        hs.forEach(h => {
            h.style.fontSize = '';
            fitTextToWidth(h);
        });
        const sizes = hs.map(h => parseFloat(h.style.fontSize)).filter(n => !Number.isNaN(n) && n > 0);
        holder.remove();

        return sizes.length ? Math.min(...sizes) : null;
    }

    function measureNaturalLines(group, fullText, fontSizePx = null) {
        const words = fullText.split(/\s+/).filter(Boolean);
        if (!words.length) return [fullText];

        const probe = document.createElement('h1');
        probe.className = 'type-display-hero';
        probe.style.visibility = 'hidden';
        if (fontSizePx != null && fontSizePx > 0) {
            probe.style.fontSize = `${fontSizePx}px`;
        }

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

        if (!originalTexts.length) return;

        const revealed = section.classList.contains('is-revealed');

        group.querySelectorAll('.animate-line').forEach(l => { l.style.fontSize = ''; });

        const fullText = originalTexts.join(' ');

        let wrapFontPx = null;
        if (!mobileQuery.matches) {
            wrapFontPx = computeLegacyDesktopMinFont(group, originalTexts);
            if (wrapFontPx == null && group.clientWidth <= 0) {
                requestAnimationFrame(() => layoutMissionLines(section));
                return;
            }
        }

        const naturalLines = measureNaturalLines(group, fullText, wrapFontPx);
        rebuildLines(group, naturalLines, revealed);

        if (!mobileQuery.matches && wrapFontPx != null) {
            group.querySelectorAll('.animate-line').forEach(el => {
                el.style.fontSize = `${wrapFontPx}px`;
            });
        } else if (!mobileQuery.matches && fitTextGroupToWidth) {
            const lines = [...group.querySelectorAll('.animate-line')];
            if (lines.length) fitTextGroupToWidth(lines);
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

        let resizeTimer;
        const scheduleLayout = () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => layoutMissionLines(section), 150);
        };
        window.addEventListener('resize', scheduleLayout);
        const onBreakpointChange = () => layoutMissionLines(section);
        if (typeof mobileQuery.addEventListener === 'function') {
            mobileQuery.addEventListener('change', onBreakpointChange);
        } else {
            mobileQuery.addListener(onBreakpointChange);
        }

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
