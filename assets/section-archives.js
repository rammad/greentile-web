/* archives page */

(() => {
    const { wait, transitionCta, transitionHeader, staggerTime } = window.AnimationUtils || {};

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
        if (cta && transitionCta) transitionCta(cta, 'enter');

        initRowPacker();
        initInfiniteScroll();

        // A page can land entirely on non-archived products with more pages still
        // to check; only resolve to "coming soon" once nothing is left to fetch.
        if (_state.items.length === 0 && _state.hasNext) {
            loadNextPage().then(checkEmptyState);
        } else {
            checkEmptyState();
        }
    });

    function checkEmptyState() {
        const comingSoon = document.querySelector('.archives-coming-soon');
        const loadMoreContainer = document.querySelector('.load-more-container');
        const isEmpty = _state.items.length === 0;

        if (loadMoreContainer) loadMoreContainer.style.display = (isEmpty || !_state.hasNext) ? 'none' : '';
        if (!comingSoon) return;
        if (isEmpty) {
            setTimeout(() => comingSoon.classList.add('is-visible'), staggerTime || 0);
        } else {
            comingSoon.classList.remove('is-visible');
        }
    }

    /* responsive grid packing */

    const GRID_CARD_MIN_W = 200;
    const GRID_MAX_COLS = 6;
    const MAX_EMPTY_FETCHES = 10;
    const _state = { items: [], activeCols: 0, bound: false, page: 1, hasNext: false, sectionId: '', loading: false };

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
    }

    function parseEventDate(cell) {
        const raw = (cell.getAttribute('data-event-date') || '').trim();
        if (!raw) return null;
        const t = Date.parse(`${raw}T00:00:00`);
        return Number.isNaN(t) ? null : t;
    }

    function cellToItem(cell) {
        const img = cell.querySelector('img');
        return {
            imgSrc: img ? img.getAttribute('src') : '',
            href: cell.getAttribute('href'),
            month: cell.getAttribute('data-month'),
            ts: parseEventDate(cell)
        };
    }

    function sortItems(items) {
        return items.slice().sort((a, b) => {
            // Most recent first for dated events; keep undated entries stable at the end.
            if (a.ts !== null && b.ts !== null) return b.ts - a.ts;
            if (a.ts !== null) return -1;
            if (b.ts !== null) return 1;
            return 0;
        });
    }

    function groupByMonth(items) {
        const monthGroups = [];
        let currentMonthName = null;
        let currentGroup = null;

        items.forEach(item => {
            if (item.month !== currentMonthName) {
                currentGroup = { name: item.month, items: [] };
                monthGroups.push(currentGroup);
                currentMonthName = item.month;
            }
            currentGroup.items.push({ imgSrc: item.imgSrc, href: item.href });
        });

        return monthGroups;
    }

    function rebuildGrid() {
        const container = document.getElementById('dynamic-archive-container');
        if (!container) return;
        _state.activeCols = getGridColCount();
        renderArchiveGrid(container, groupByMonth(sortItems(_state.items)), _state.activeCols);
    }

    function initRowPacker() {
        const pageState = document.getElementById('archive-pagination-state');
        _state.sectionId = pageState?.dataset.sectionId || '';
        _state.page = parseInt(pageState?.dataset.currentPage, 10) || 1;
        _state.hasNext = pageState?.dataset.hasNext === 'true';

        const container = document.getElementById('dynamic-archive-container');
        if (!container) return;

        container.classList.add('calendar-grid-packed');
        container.style.display = 'flex';

        _state.items = Array.from(document.querySelectorAll('.archive-cell')).map(cellToItem);

        rebuildGrid();

        if (!_state.bound) {
            _state.bound = true;
            let timer;
            window.addEventListener('resize', () => {
                clearTimeout(timer);
                timer = setTimeout(() => {
                    if (!_state.items.length) return;
                    const newCols = getGridColCount();
                    if (newCols !== _state.activeCols) rebuildGrid();
                }, 150);
            });
        }
    }

    /* infinite scroll — fetch the next page via the Section Rendering API when the
       load-more control scrolls into view; the button itself stays as a manual/no-JS fallback */

    async function loadNextPage() {
        if (_state.loading || !_state.hasNext || !_state.sectionId) return;
        _state.loading = true;

        try {
            let gained = 0;
            let fetches = 0;
            // A raw collection page can land entirely on current-season products with
            // no archive matches; keep advancing until a page contributes cells or pages run out.
            // MAX_EMPTY_FETCHES stops a large non-event catalogue from firing an unbounded
            // chain of requests in one go — the next scroll/click resumes where this left off.
            while (_state.hasNext && gained === 0 && fetches < MAX_EMPTY_FETCHES) {
                fetches += 1;
                const nextPage = _state.page + 1;
                const url = new URL(window.location.href);
                url.searchParams.set('section_id', _state.sectionId);
                url.searchParams.set('page', String(nextPage));
                const res = await fetch(url.toString());
                if (!res.ok) throw new Error('Archive page fetch failed: ' + res.status);

                const html = await res.text();
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const newCells = Array.from(doc.querySelectorAll('.archive-cell'));
                const fetchedPageState = doc.getElementById('archive-pagination-state');

                _state.items.push(...newCells.map(cellToItem));
                _state.page = nextPage;
                _state.hasNext = fetchedPageState?.dataset.hasNext === 'true';
                gained = newCells.length;
            }

            rebuildGrid();
            checkEmptyState();
        } catch (err) {
            console.error('Failed to load more archived events:', err);
        } finally {
            _state.loading = false;
        }
    }

    function initInfiniteScroll() {
        const loadBtn = document.getElementById('btn-load-more');
        if (!loadBtn) return;

        loadBtn.addEventListener('click', loadNextPage);

        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                if (entries.some(entry => entry.isIntersecting)) loadNextPage();
            }, { rootMargin: '600px 0px' });
            observer.observe(loadBtn);
        }
    }
})();
