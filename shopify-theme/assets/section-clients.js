/* clients section */
(() => {
    const { observeElementInOut } = window.AnimationUtils || {};

    function buildClientItems() {
        document.querySelectorAll('.clients-list').forEach(list => {
            const children = [...list.querySelectorAll(':scope > a, :scope > .clients-plain')];
            if (!children.length) return;

            list.innerHTML = '';

            children.forEach((child, i) => {
                const item = document.createElement('span');
                item.className = 'clients-item';
                item.appendChild(child);

                if (i < children.length - 1) {
                    const sep = document.createElement('span');
                    sep.className = 'clients-sep';
                    sep.textContent = '/';
                    item.appendChild(sep);
                }

                list.appendChild(item);
                if (i < children.length - 1) {
                    list.appendChild(document.createTextNode(' '));
                }
            });
        });
    }

    function preventOrphans() {
        document.querySelectorAll('.clients-list').forEach(list => {
            list.querySelectorAll('.clients-pair').forEach(wrapper => {
                while (wrapper.firstChild) wrapper.parentNode.insertBefore(wrapper.firstChild, wrapper);
                wrapper.remove();
            });

            const items = [...list.querySelectorAll('.clients-item')];
            if (items.length < 3) return;

            const last = items[items.length - 1];
            const prev = items[items.length - 2];

            if (Math.abs(last.getBoundingClientRect().top - prev.getBoundingClientRect().top) > 2) {
                const pair = document.createElement('span');
                pair.className = 'clients-pair';
                prev.parentNode.insertBefore(pair, prev);
                pair.appendChild(prev);
                while (pair.nextSibling && pair.nextSibling !== last) {
                    pair.appendChild(pair.nextSibling);
                }
                pair.appendChild(last);
            }
        });
    }

    const PRESS_SPEED = 50;
    const PRESS_GAP = 64;

    function initPressMarquee() {
        document.querySelectorAll('.press-marquee-track').forEach(track => {
            if (track.classList.contains('is-initialized')) return;
            const items = Array.from(track.children);
            if (!items.length) return;

            track.style.gap = `${PRESS_GAP}px`;
            const first = items[0];
            void first.offsetWidth;

            let patternWidth = 0;
            items.forEach(item => { patternWidth += item.offsetWidth; });
            patternWidth += PRESS_GAP * items.length;

            const copies = Math.ceil(window.innerWidth / patternWidth) + 2;
            const fragment = document.createDocumentFragment();
            for (let c = 0; c < copies; c++) {
                items.forEach(item => fragment.appendChild(item.cloneNode(true)));
            }
            track.appendChild(fragment);

            const duration = patternWidth / PRESS_SPEED;
            track.style.setProperty('--press-scroll-dist', `-${patternWidth}px`);
            track.style.setProperty('--marquee-duration', `${duration}s`);
            track.classList.add('has-seamless-animation');
            track.classList.add('is-initialized');
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.querySelector('.clients-section');
        if (!section) return;

        const columns = section.querySelector('.clients-columns');

        if (columns && observeElementInOut) {
            observeElementInOut(columns, {
                onEnter: () => columns.classList.add('is-visible')
            });
        }

        buildClientItems();
        preventOrphans();
        document.fonts.ready.then(preventOrphans);

        initPressMarquee();

        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(preventOrphans, 150);
        });
    });
})();
