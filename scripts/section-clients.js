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

    function updateClientCommas() {
        document.querySelectorAll('.clients-list').forEach(list => {
            const items = [...list.querySelectorAll('.clients-item')];
            if (!items.length) return;

            list.querySelectorAll('.clients-sep').forEach(sep => {
                sep.style.display = '';
            });

            for (let pass = 0; pass < 10; pass++) {
                const endOfRow = new Set();
                let rowTop = items[0].getBoundingClientRect().top;
                let last = items[0];

                for (let i = 1; i < items.length; i++) {
                    const top = items[i].getBoundingClientRect().top;
                    if (Math.abs(top - rowTop) > 2) {
                        endOfRow.add(last);
                        rowTop = top;
                    }
                    last = items[i];
                }
                endOfRow.add(last);

                let changed = false;
                items.forEach(item => {
                    const sep = item.querySelector('.clients-sep');
                    if (!sep) return;
                    const shouldHide = endOfRow.has(item);
                    const isHidden = sep.style.display === 'none';
                    if (shouldHide && !isHidden) {
                        sep.style.display = 'none';
                        changed = true;
                    } else if (!shouldHide && isHidden) {
                        sep.style.display = '';
                        changed = true;
                    }
                });

                if (!changed) break;
            }
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
        updateClientCommas();
        document.fonts.ready.then(updateClientCommas);

        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(updateClientCommas, 150);
        });
    });
})();
