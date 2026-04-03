/* about section (index.html) — hardcoded image placement, line detection, animate-in */
(() => {
    const { observeElementInOut } = window.AnimationUtils || {};

    // build
    //
    // Each image carries data-word: the number of words from the start of the
    // text block after which the image is inserted. This is viewport-agnostic —
    // lines reflow freely while images stay anchored to the same words.

    function buildLines(textEl, originalText, imageEls) {
        const words = originalText.split(/\s+/).filter(Boolean);

        // insert images into word list at their data-word positions
        // Sort highest-offset first so splicing doesn't shift later indices.
        const placements = imageEls
            .map(el => ({
                el,
                after: Math.max(0, Math.min(words.length, parseInt(el.dataset.word, 10) || 0)),
            }))
            .sort((a, b) => b.after - a.after);

        const items = words.map(w => ({ kind: 'word', text: w }));
        for (const p of placements) {
            items.splice(p.after, 0, { kind: 'img', el: p.el });
        }

        // render with probe spans for line measurement
        function render() {
            textEl.innerHTML = '';
            items.forEach((item, i) => {
                if (i > 0) textEl.appendChild(document.createTextNode(' '));
                if (item.kind === 'word') {
                    const span = document.createElement('span');
                    span.className = 'about-word-probe';
                    span.textContent = item.text;
                    item.probeEl = span;
                    textEl.appendChild(span);
                } else {
                    textEl.appendChild(item.el);
                }
            });
        }

        // measure + assign line indices
        render();

        let lineIdx = 0;
        let lastFinalTop = null;
        const lineTops = [];

        items.forEach(item => {
            if (item.kind !== 'word') return;
            const top = Math.round(item.probeEl.getBoundingClientRect().top);
            if (lastFinalTop === null || top !== lastFinalTop) {
                if (lastFinalTop !== null) lineIdx++;
                lineTops.push(top);
                lastFinalTop = top;
            }
            item.lineIdx = lineIdx;
        });

        const totalLines = lineIdx + 1;

        const lineCenters = lineTops.map((top, i) =>
            lineTops[i + 1] !== undefined
                ? top + (lineTops[i + 1] - top) / 2
                : top + (imageEls[0]?.getBoundingClientRect().height ?? 40) / 2
        );

        items.forEach(item => {
            if (item.kind !== 'img') return;
            const rect    = item.el.getBoundingClientRect();
            const centerY = rect.top + rect.height / 2;
            let bestIdx = 0, bestDist = Infinity;
            lineCenters.forEach((lc, li) => {
                const d = Math.abs(centerY - lc);
                if (d < bestDist) { bestDist = d; bestIdx = li; }
            });
            item.lineIdx = bestIdx;
        });

        // reconstruct: one display:block .animate-line span per line
        const lineGroups = Array.from({ length: totalLines }, () => []);
        items.forEach(item => lineGroups[item.lineIdx].push(item));

        textEl.innerHTML = '';
        lineGroups.forEach(group => {
            if (!group.length) return;
            const span = document.createElement('span');
            span.className = 'animate-line';
            group.forEach((item, gi) => {
                if (gi > 0) span.appendChild(document.createTextNode(' '));
                if (item.kind === 'word') {
                    span.appendChild(document.createTextNode(item.text));
                } else {
                    const wrap = document.createElement('span');
                    wrap.className = 'about-img-wrap';
                    wrap.appendChild(item.el);
                    span.appendChild(wrap);
                }
            });
            textEl.appendChild(span);
        });
    }

    // observe

    function observeLines(section) {
        if (!observeElementInOut) return;
        section.querySelectorAll('.animate-line').forEach(line => {
            observeElementInOut(line, {
                onEnter: () => line.classList.add('is-visible'),
                enterThreshold: 0.3,
            });
        });
    }

    // init

    document.addEventListener('DOMContentLoaded', () => {
        const section      = document.getElementById('about');
        if (!section) return;

        const textEl       = section.querySelector('.about-text');
        const imgContainer = section.querySelector('.about-images');
        if (!textEl || !imgContainer) return;

        const originalText = textEl.textContent.trim();
        const imageEls     = Array.from(imgContainer.querySelectorAll('.about-inline-img'));
        imgContainer.remove();

        imageEls.forEach(img => {
            const pool = (img.dataset.images || '').split('|').filter(Boolean);
            if (pool.length > 1) img.src = pool[Math.floor(Math.random() * pool.length)];
        });

        // Guard: prevents the synthetic resize we fire after building from
        // immediately triggering another rebuild of this section.
        let suppressResize = false;

        function build() {
            buildLines(textEl, originalText, imageEls);
            observeLines(section);

            // The about section's height just changed. Scroll-driven sections
            // (e.g. events) cache their offsetTop on fonts.ready — which fires
            // before our build runs. Signal them to recalculate, but skip our
            // own resize listener while doing so.
            suppressResize = true;
            requestAnimationFrame(() => {
                window.dispatchEvent(new Event('resize'));
                suppressResize = false;
            });
        }

        document.fonts.ready.then(() => requestAnimationFrame(build));

        let lastWidth = window.innerWidth;
        let resizeTimer;
        window.addEventListener('resize', () => {
            if (suppressResize) return;
            if (window.innerWidth === lastWidth) return;
            lastWidth = window.innerWidth;
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(build, 200);
        });
    });
})();
