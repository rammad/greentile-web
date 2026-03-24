/* about section (index.html) — procedural line detection, image distribution, animate-in */
(() => {
    const { observeElementInOut } = window.AnimationUtils || {};

    // ── build ─────────────────────────────────────────────────────────────────
    //
    // Iterative approach: images are inserted one at a time. After each
    // insertion the DOM is re-rendered and lines re-measured, so every
    // subsequent placement sees the real layout (including the width of
    // previously inserted images). This prevents images from drifting to
    // line boundaries.
    //
    // Placement alternates: even images → one word in from the FRONT of
    // their target line; odd images → one word in from the BACK.

    function buildLines(textEl, originalText, imageEls) {
        const words = originalText.split(/\s+/).filter(Boolean);
        const M = imageEls.length;

        const items = words.map(w => ({ kind: 'word', text: w }));

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

        function measureWordLines() {
            const lines = [];
            let lastTop = null;
            items.forEach((item, idx) => {
                if (item.kind !== 'word') return;
                const top = Math.round(item.probeEl.getBoundingClientRect().top);
                if (lastTop === null || top !== lastTop) {
                    lines.push([]);
                    lastTop = top;
                }
                lines[lines.length - 1].push(idx);
            });
            return lines;
        }

        // ── Iterative image insertion ───────────────────────────────────────
        for (let imgIdx = 0; imgIdx < M; imgIdx++) {
            render();
            const lines     = measureWordLines();
            const lineCount = lines.length;
            const targetLine = Math.round((imgIdx + 1) * lineCount / (M + 1)) - 1;
            const clamped    = Math.max(0, Math.min(lineCount - 1, targetLine));
            const lineWordIndices = lines[clamped];

            let insertIdx;
            if (imgIdx % 2 === 0) {
                insertIdx = lineWordIndices[0] + 1;
            } else {
                const backPos = Math.max(0, lineWordIndices.length - 3);
                insertIdx = lineWordIndices[backPos] + 1;
            }

            items.splice(insertIdx, 0, { kind: 'img', el: imageEls[imgIdx] });
        }

        // ── Final render + measurement ──────────────────────────────────────
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

        // ── Reconstruct: one display:block .animate-line span per line ──────
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

    // ── observe ───────────────────────────────────────────────────────────────

    function observeLines(section) {
        if (!observeElementInOut) return;
        section.querySelectorAll('.animate-line').forEach(line => {
            observeElementInOut(line, {
                onEnter: () => line.classList.add('is-visible'),
                enterThreshold: 0.3,
            });
        });
    }

    // ── init ──────────────────────────────────────────────────────────────────

    document.addEventListener('DOMContentLoaded', () => {
        const section      = document.getElementById('about');
        if (!section) return;

        const textEl       = section.querySelector('.about-text');
        const imgContainer = section.querySelector('.about-images');
        if (!textEl || !imgContainer) return;

        const originalText = textEl.textContent.trim();
        const imageEls     = Array.from(imgContainer.querySelectorAll('.about-inline-img'));
        imgContainer.remove();

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

        let resizeTimer;
        window.addEventListener('resize', () => {
            if (suppressResize) return;
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(build, 200);
        });
    });
})();
