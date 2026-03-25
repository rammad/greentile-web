/* archives page */

(() => {
    const { wait, transitionCta, transitionHeader, staggerTime } = window.AnimationUtils;

    document.addEventListener('DOMContentLoaded', () => {
        document.documentElement.style.overflow = 'auto';
        document.body.style.overflow = 'auto';

        const page = document.querySelector('.archives-page');
        if (page) setTimeout(() => page.classList.add('is-active'), 100);

        const title = document.querySelector('.animate-cascade');
        if (title) {
            const checkInit = setInterval(() => {
                if (title.classList.contains('is-initialized') && window.playCascade) {
                    clearInterval(checkInit);
                    setTimeout(() => window.playCascade(title), 100);
                }
            }, 50);
        }

        const cta = document.querySelector('.cta-btn');
        if(cta) transitionCta(cta, 'enter');

        initRowPacker();
    });

    function initRowPacker() {
        const container = document.getElementById('dynamic-archive-container');
        if (!container) return;

        const allCells = Array.from(document.querySelectorAll('.archive-cell'));
        container.innerHTML = '';
        container.classList.add('calendar-grid-packed');
        container.style.display = 'flex';

        const monthGroups = [];
        let currentMonthName = null;
        let currentGroup = null;

        allCells.forEach(cell => {
            const m = cell.getAttribute('data-month');
            const img = cell.querySelector('img');
            const imgSrc = img ? img.getAttribute('src') : '';
            const href = cell.getAttribute('href');

            if (m !== currentMonthName) {
                currentGroup = { name: m, items: [] };
                monthGroups.push(currentGroup);
                currentMonthName = m;
            }

            const card = document.createElement('a');
            card.href = href;
            card.className = 'grid-card';
            card.innerHTML = `<img src="${imgSrc}" class="grid-card-poster">`;

            currentGroup.items.push(card);
        });

        const ROWS = [];
        let currentRow = { capacity: 6, chunks: [] };

        monthGroups.forEach(group => {
            let itemsToPlace = [...group.items];
            let isContinuation = false; 

            while (itemsToPlace.length > 0) {
                if (currentRow.capacity === 0) {
                    ROWS.push(currentRow);
                    currentRow = { capacity: 6, chunks: [] };
                }

                const count = Math.min(itemsToPlace.length, currentRow.capacity);
                const chunkItems = itemsToPlace.splice(0, count);

                currentRow.chunks.push({
                    monthName: group.name,
                    items: chunkItems,
                    span: count,
                    isContinuation: isContinuation
                });

                currentRow.capacity -= count;
                isContinuation = true;
            }
        });
        if (currentRow.chunks.length > 0) ROWS.push(currentRow);

        const flatItemList = [];

        ROWS.forEach(rowData => {
            const rowEl = document.createElement('div');
            rowEl.className = 'packed-row';
            
            rowData.chunks.forEach(chunk => {
                const chunkEl = document.createElement('div');
                chunkEl.className = `packed-chunk span-${chunk.span}`;
                
                const header = document.createElement('div');
                header.className = 'month-header';
                header.classList.add('type-subBold2')
                if (chunk.isContinuation) {
                    header.innerHTML = '<span class="spacer-line"></span>';
                    header.classList.add('continuation-header');
                } else {
                    header.innerText = chunk.monthName;
                }
                chunkEl.appendChild(header);

                const gridEl = document.createElement('div');
                gridEl.className = `chunk-grid cols-${chunk.span}`;
                
                chunk.items.forEach(item => {
                    gridEl.appendChild(item);
                    flatItemList.push(item);
                });

                chunkEl.appendChild(gridEl);
                rowEl.appendChild(chunkEl);
            });

            container.appendChild(rowEl);
        });

        container.querySelectorAll('.grid-card').forEach(card => {
            const sign = Math.random() < 0.5 ? -1 : 1;
            const deg  = sign * (2 + Math.random() * 2);
            card.style.setProperty('--hover-rotate', `${deg.toFixed(1)}deg`);
        });

        initPagination(flatItemList);
    }

    function initPagination(items) {
        const loadBtn = document.getElementById('btn-load-more');
        const BATCH_SIZE = 12;
        let visibleCount = 0;

        const updateLayoutVisibility = () => {
            const rows = document.querySelectorAll('.packed-row');
            rows.forEach(row => {
                const cards = row.querySelectorAll('.grid-card');
                const hasVisible = Array.from(cards).some(el => el.style.display !== 'none');
                row.style.display = hasVisible ? 'grid' : 'none';
            });
        };

        items.forEach((item, index) => {
            if (index >= BATCH_SIZE) {
                item.style.display = 'none';
                item.style.opacity = '0';
            } else {
                item.style.opacity = '1';
            }
        });

        visibleCount = BATCH_SIZE;
        updateLayoutVisibility();

        if (items.length <= BATCH_SIZE) {
            if(loadBtn) loadBtn.style.display = 'none';
            return;
        }

        if (loadBtn) {
            loadBtn.addEventListener('click', () => {
                const nextLimit = visibleCount + BATCH_SIZE;
                let newlyVisible = [];
                
                for (let i = visibleCount; i < nextLimit && i < items.length; i++) {
                    const item = items[i];
                    item.style.display = 'block';
                    newlyVisible.push(item);
                }
                
                visibleCount = nextLimit;
                updateLayoutVisibility();

                setTimeout(() => {
                    newlyVisible.forEach(item => {
                        item.style.transition = 'opacity 0.6s ease';
                        item.style.opacity = '1';
                    });
                }, 50);

                if (visibleCount >= items.length) {
                    loadBtn.style.opacity = '0';
                    loadBtn.style.pointerEvents = 'none';
                }
            });
        }
    }
})();