/* mission section — reflow joined copy at the same scale as before (min of per–CMS-line fitTextToWidth), then split wraps */
(() => {
    const { observeElementInOut } = window.AnimationUtils || {};
    const { fitTextToWidth, fitTextGroupToWidth } = window.AppUtils || {};

    const LINE_STAGGER_MS = 80;
    const mobileQuery = window.matchMedia('(max-width: 1023px)');
    let originalTexts = null;

    /** Resolved --size-h3 in px — floor so fitText cannot shrink mission lines to tiny sizes on long strings. */
    function missionFloorFontPx() {
        const probe = document.createElement('span');
        probe.setAttribute('aria-hidden', 'true');
        probe.style.cssText =
            'position:absolute;left:-9999px;top:0;visibility:hidden;pointer-events:none;white-space:nowrap;font-size:var(--size-h3);';
        probe.textContent = 'M';
        document.body.appendChild(probe);
        const px = parseFloat(getComputedStyle(probe).fontSize);
        probe.remove();
        return Number.isFinite(px) && px > 0 ? px : 48;
    }

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
        probe.className = 'type-h1';
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

        /* Breaks measured at same px as painted — avoids floor vs fit mismatch + ragged lines. */
        let measureFontPx = wrapFontPx;
        if (!mobileQuery.matches && wrapFontPx != null) {
            measureFontPx = Math.max(wrapFontPx, missionFloorFontPx());
        }

        const naturalLines = measureNaturalLines(group, fullText, measureFontPx);
        rebuildLines(group, naturalLines, revealed);

        if (!mobileQuery.matches && wrapFontPx != null) {
            const sizePx = measureFontPx;
            group.querySelectorAll('.animate-line').forEach(el => {
                el.style.fontSize = `${sizePx}px`;
            });
        } else if (!mobileQuery.matches && fitTextGroupToWidth) {
            const lines = [...group.querySelectorAll('.animate-line')];
            if (lines.length) fitTextGroupToWidth(lines);
            const floor = missionFloorFontPx();
            lines.forEach(el => {
                const n = parseFloat(el.style.fontSize);
                if (Number.isFinite(n) && n < floor) el.style.fontSize = `${floor}px`;
            });
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
