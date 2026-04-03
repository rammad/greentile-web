/* archives page */

(() => {
    const { wait, transitionCta, transitionHeader, staggerTime } = window.AnimationUtils;

    document.addEventListener('DOMContentLoaded', () => {
        document.documentElement.style.overflow = 'auto';
        document.body.style.overflow = 'auto';

        const page = document.querySelector('.archives-page');
        if (page) setTimeout(() => page.classList.add('is-active'), 100);

        const title = document.querySelector('.archives-page .animate-cascade');
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
        initEmptyState();
    });

    function initEmptyState() {
        const comingSoon = document.querySelector('.archives-coming-soon');
        if (!comingSoon) return;
        if (_state.totalItems === 0) {
            const loadBtn = document.getElementById('btn-load-more');
            if (loadBtn) loadBtn.closest('.load-more-container').style.display = 'none';
            setTimeout(() => comingSoon.classList.add('is-visible'), staggerTime);
        }
    }

    /* responsive grid packing */

    const GRID_CARD_MIN_W = 200;
    const GRID_MAX_COLS = 6;
    const BATCH_SIZE = 12;
    const _state = { monthGroups: null, activeCols: 0, visibleCount: 0, totalItems: 0, bound: false };

    function getGridColCount() {
        if (window.innerWidth <= 1024) return GRID_MAX_COLS;
        const container = document.getElementById('dynamic-archive-container');
        let width;
        if (container && container.clientWidth > 0) {
            width = container.clientWidth;
        } else {
            const gutter = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--page-gutter')) || 20;
            width = window.innerWidth - gutter * 2;
        }
        const gap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--poster-gap')) || 20;
        return Math.min(GRID_MAX_COLS, Math.max(2, Math.floor((width + gap) / (GRID_CARD_MIN_W + gap))));
    }

    function renderArchiveGrid(container, monthGroups, totalCols) {
        container.innerHTML = '';

        const ROWS = [];
        let currentRow = { capacity: totalCols, chunks: [] };

        monthGroups.forEach(group => {
            let itemsToPlace = [...group.items];
            let isContinuation = false;

            while (itemsToPlace.length > 0) {
                if (currentRow.capacity === 0) {
                    ROWS.push(currentRow);
                    currentRow = { capacity: totalCols, chunks: [] };
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
            rowEl.style.gridTemplateColumns = `repeat(${totalCols}, 1fr)`;

            rowData.chunks.forEach((chunk, chunkIdx) => {
                const chunkEl = document.createElement('div');
                chunkEl.className = `packed-chunk span-${chunk.span}`;

                const header = document.createElement('div');
                header.className = 'month-header type-subBold2';
                if (chunk.isContinuation && chunkIdx > 0) {
                    header.innerHTML = '<span class="spacer-line"></span>';
                    header.classList.add('continuation-header');
                } else {
                    header.innerText = chunk.monthName;
                }
                chunkEl.appendChild(header);

                const gridEl = document.createElement('div');
                gridEl.className = `chunk-grid cols-${chunk.span}`;

                chunk.items.forEach(item => {
                    const card = document.createElement('a');
                    card.href = item.href;
                    card.className = 'grid-card';
                    card.innerHTML = `<img src="${item.imgSrc}" class="grid-card-poster">`;
                    gridEl.appendChild(card);
                    flatItemList.push(card);
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

        return flatItemList;
    }

    function applyPagination(flatItemList) {
        flatItemList.forEach((item, index) => {
            if (index >= _state.visibleCount) {
                item.style.display = 'none';
                item.style.opacity = '0';
            } else {
                item.style.display = '';
                item.style.opacity = '1';
            }
        });

        document.querySelectorAll('#dynamic-archive-container .packed-row').forEach(row => {
            const cards = row.querySelectorAll('.grid-card');
            const hasVisible = Array.from(cards).some(el => el.style.display !== 'none');
            row.style.display = hasVisible ? 'grid' : 'none';
        });

        const loadBtn = document.getElementById('btn-load-more');
        if (loadBtn) {
            if (_state.visibleCount >= _state.totalItems) {
                loadBtn.style.opacity = '0';
                loadBtn.style.pointerEvents = 'none';
            } else {
                loadBtn.style.opacity = '';
                loadBtn.style.pointerEvents = '';
            }
        }
    }

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

            currentGroup.items.push({ imgSrc, href });
        });

        _state.monthGroups = monthGroups;
        _state.totalItems = allCells.length;
        _state.activeCols = getGridColCount();

        const flatItemList = renderArchiveGrid(container, monthGroups, _state.activeCols);
        initPagination(flatItemList);

        if (!_state.bound) {
            _state.bound = true;
            let timer;
            window.addEventListener('resize', () => {
                clearTimeout(timer);
                timer = setTimeout(() => {
                    if (!_state.monthGroups) return;
                    const newCols = getGridColCount();
                    if (newCols !== _state.activeCols) {
                        _state.activeCols = newCols;
                        const c = document.getElementById('dynamic-archive-container');
                        if (c) {
                            const items = renderArchiveGrid(c, _state.monthGroups, newCols);
                            applyPagination(items);
                        }
                    }
                }, 150);
            });
        }
    }

    function initPagination(items) {
        const loadBtn = document.getElementById('btn-load-more');
        _state.visibleCount = Math.min(BATCH_SIZE, items.length);

        items.forEach((item, index) => {
            if (index >= BATCH_SIZE) {
                item.style.display = 'none';
                item.style.opacity = '0';
            } else {
                item.style.opacity = '1';
            }
        });

        document.querySelectorAll('#dynamic-archive-container .packed-row').forEach(row => {
            const cards = row.querySelectorAll('.grid-card');
            const hasVisible = Array.from(cards).some(el => el.style.display !== 'none');
            row.style.display = hasVisible ? 'grid' : 'none';
        });

        if (items.length <= BATCH_SIZE) {
            if (loadBtn) loadBtn.style.display = 'none';
            return;
        }

        if (loadBtn) {
            loadBtn.addEventListener('click', () => {
                const currentCards = Array.from(document.querySelectorAll('#dynamic-archive-container .grid-card'));
                const nextLimit = Math.min(_state.visibleCount + BATCH_SIZE, _state.totalItems);
                let newlyVisible = [];

                for (let i = _state.visibleCount; i < nextLimit && i < currentCards.length; i++) {
                    currentCards[i].style.display = '';
                    newlyVisible.push(currentCards[i]);
                }

                _state.visibleCount = nextLimit;

                document.querySelectorAll('#dynamic-archive-container .packed-row').forEach(row => {
                    const cards = row.querySelectorAll('.grid-card');
                    const hasVisible = Array.from(cards).some(el => el.style.display !== 'none');
                    row.style.display = hasVisible ? 'grid' : 'none';
                });

                setTimeout(() => {
                    newlyVisible.forEach(item => {
                        item.style.transition = 'opacity 0.6s ease';
                        item.style.opacity = '1';
                    });
                }, 50);

                if (_state.visibleCount >= _state.totalItems) {
                    loadBtn.style.opacity = '0';
                    loadBtn.style.pointerEvents = 'none';
                }
            });
        }
    }
})();