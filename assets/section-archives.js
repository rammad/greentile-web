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

        // Pull the rest of the catalogue immediately rather than on scroll, so the
        // grid settles into its final date order once, early, instead of reshuffling
        // later. Page 1 still paints right away; this just fills in behind it.
        if (_state.hasNext) {
            loadRemainingPages().then(checkEmptyState);
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
    const PREFETCH_CONCURRENCY = 4;
    const MAX_PREFETCH_PAGES = 30;
    const _state = { items: [], activeCols: 0, bound: false, page: 1, totalPages: 1, hasNext: false, sectionId: '', loading: false };

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
                    if (item.href) card.dataset.key = item.href;
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

    /* Re-rendering the whole grid re-flows everything above the viewport too, so a
       batch of newly-merged events would otherwise yank the page under the visitor.
       Pin the topmost visible card and restore its screen position afterwards. */

    function getScroller() {
        if (document.documentElement.classList.contains('ios-body-scroll')) return document.body;
        const viewport = document.getElementById('scroll-viewport');
        if (viewport && viewport.scrollHeight > viewport.clientHeight + 1) return viewport;
        return document.scrollingElement || document.documentElement;
    }

    function captureAnchor() {
        const cards = document.querySelectorAll('#dynamic-archive-container .grid-card');
        for (const card of cards) {
            const rect = card.getBoundingClientRect();
            if (rect.bottom > 0 && card.dataset.key) return { key: card.dataset.key, top: rect.top };
        }
        return null;
    }

    function restoreAnchor(anchor) {
        if (!anchor) return;
        const escaped = window.CSS && CSS.escape ? CSS.escape(anchor.key) : anchor.key.replace(/"/g, '\\"');
        const card = document.querySelector(`#dynamic-archive-container .grid-card[data-key="${escaped}"]`);
        if (!card) return;

        const delta = card.getBoundingClientRect().top - anchor.top;
        if (Math.abs(delta) < 1) return;

        const scroller = getScroller();
        const target = scroller.scrollTop + delta;
        const viewport = document.getElementById('scroll-viewport');

        if (window.lenis && scroller === viewport) {
            window.lenis.scrollTo(target, { immediate: true, force: true });
            return;
        }
        // html carries scroll-behavior:smooth, which would animate this correction
        const previous = scroller.style.scrollBehavior;
        scroller.style.scrollBehavior = 'auto';
        scroller.scrollTop = target;
        scroller.style.scrollBehavior = previous;
    }

    function rebuildGrid({ preserveScroll = false } = {}) {
        const container = document.getElementById('dynamic-archive-container');
        if (!container) return;
        const anchor = preserveScroll ? captureAnchor() : null;
        _state.activeCols = getGridColCount();
        renderArchiveGrid(container, groupByMonth(sortItems(_state.items)), _state.activeCols);
        if (anchor) restoreAnchor(anchor);
    }

    function initRowPacker() {
        const pageState = document.getElementById('archive-pagination-state');
        _state.sectionId = pageState?.dataset.sectionId || '';
        _state.page = parseInt(pageState?.dataset.currentPage, 10) || 1;
        _state.totalPages = parseInt(pageState?.dataset.totalPages, 10) || 1;
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
                    if (newCols !== _state.activeCols) rebuildGrid({ preserveScroll: true });
                }, 150);
            });
        }
    }

    /* page loading — Shopify pages collections.all in catalogue order, and the sort
       key we actually want (the event date) lives in a metafield it can't order by.
       So page N can hold events belonging anywhere in the final date order: loading
       pages lazily on scroll means every arrival reshuffles the grid under the
       visitor. Instead fetch all remaining pages up front and in parallel, then
       render the complete, date-sorted set once. */

    function sectionUrlForPage(page) {
        const url = new URL(window.location.href);
        url.searchParams.set('section_id', _state.sectionId);
        url.searchParams.set('page', String(page));
        return url.toString();
    }

    async function fetchPageItems(page) {
        const res = await fetch(sectionUrlForPage(page));
        if (!res.ok) throw new Error('Archive page fetch failed: ' + res.status);
        const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
        return Array.from(doc.querySelectorAll('.archive-cell')).map(cellToItem);
    }

    async function loadRemainingPages() {
        if (_state.loading || !_state.hasNext || !_state.sectionId) return;

        // MAX_PREFETCH_PAGES keeps a huge non-event catalogue from firing hundreds of
        // requests at once; anything past it stays behind the load-more control.
        const lastPage = Math.min(_state.totalPages, _state.page + MAX_PREFETCH_PAGES);
        const pages = [];
        for (let p = _state.page + 1; p <= lastPage; p++) pages.push(p);
        if (!pages.length) {
            _state.hasNext = false;
            return;
        }

        _state.loading = true;
        try {
            // Results are slotted by index so the merged list stays in page order —
            // the grid sorts by date anyway, but this keeps undated events stable.
            const results = new Array(pages.length);
            let cursor = 0;

            const worker = async () => {
                while (cursor < pages.length) {
                    const index = cursor++;
                    try {
                        results[index] = await fetchPageItems(pages[index]);
                    } catch (err) {
                        // one bad page shouldn't cost us every other page in flight
                        console.error('Failed to load archived events:', err);
                        results[index] = [];
                    }
                }
            };

            const workers = Math.min(PREFETCH_CONCURRENCY, pages.length);
            await Promise.all(Array.from({ length: workers }, worker));

            results.forEach(items => { if (items) _state.items.push(...items); });
            _state.page = lastPage;
            _state.hasNext = lastPage < _state.totalPages;

            rebuildGrid({ preserveScroll: true });
            checkEmptyState();
        } finally {
            _state.loading = false;
        }
    }

    function initInfiniteScroll() {
        const loadBtn = document.getElementById('btn-load-more');
        if (!loadBtn) return;

        loadBtn.addEventListener('click', loadRemainingPages);

        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                if (entries.some(entry => entry.isIntersecting)) loadRemainingPages();
            }, { rootMargin: '600px 0px' });
            observer.observe(loadBtn);
        }
    }
})();
