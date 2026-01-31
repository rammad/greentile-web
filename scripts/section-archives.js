/* =========================================
   PAGE: ARCHIVES (Row Packer Algorithm)
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'auto';

    const page = document.querySelector('.archives-page');
    if (page) setTimeout(() => page.classList.add('is-active'), 100);

    initRowPacker();
});

function initRowPacker() {
    const container = document.getElementById('dynamic-archive-container');
    if (!container) return;

    // 1. EXTRACT DATA
    // Pull all cells out of DOM and group them by month
    const allCells = Array.from(document.querySelectorAll('.archive-cell'));
    container.innerHTML = ''; // Clear for rebuilding
    container.classList.add('packed-grid-container');

    const monthGroups = [];
    let currentMonthName = null;
    let currentGroup = null;

    allCells.forEach(cell => {
        const m = cell.getAttribute('data-month');
        if (m !== currentMonthName) {
            currentGroup = { name: m, items: [] };
            monthGroups.push(currentGroup);
            currentMonthName = m;
        }
        currentGroup.items.push(cell);
    });

    // 2. THE PACKING ALGORITHM
    const ROWS = [];
    let currentRow = { capacity: 6, chunks: [] }; // A row has 6 slots

    monthGroups.forEach(group => {
        let itemsToPlace = [...group.items];
        let isContinuation = false; // Is this a split part of a month?

        while (itemsToPlace.length > 0) {
            // Check if current row is full
            if (currentRow.capacity === 0) {
                ROWS.push(currentRow);
                currentRow = { capacity: 6, chunks: [] };
            }

            // How many can we fit?
            const count = Math.min(itemsToPlace.length, currentRow.capacity);
            
            // Slice the items for this chunk
            const chunkItems = itemsToPlace.splice(0, count);

            // Create Data Object for this chunk
            currentRow.chunks.push({
                monthName: group.name,
                items: chunkItems,
                span: count,
                isContinuation: isContinuation
            });

            // Update Math
            currentRow.capacity -= count;
            
            // Next loop iteration is definitely a continuation
            isContinuation = true;
        }
    });
    // Push final row
    if (currentRow.chunks.length > 0) ROWS.push(currentRow);

    // 3. RENDER TO DOM
    const flatItemList = []; // Keep track for pagination

    ROWS.forEach(rowData => {
        // Create Row Element
        const rowEl = document.createElement('div');
        rowEl.className = 'packed-row';
        
        rowData.chunks.forEach(chunk => {
            // Create Chunk Wrapper (The Month Block)
            const chunkEl = document.createElement('div');
            chunkEl.className = `packed-chunk span-${chunk.span}`;
            
            // Header (Text + Line)
            const header = document.createElement('div');
            header.className = 'month-header';
            
            // Only show text if it's NOT a continuation line
            if (chunk.isContinuation) {
                header.innerHTML = '<span class="spacer-line"></span>';
                header.classList.add('continuation-header');
            } else {
                header.innerText = chunk.monthName;
            }
            chunkEl.appendChild(header);

            // Grid for Items
            const gridEl = document.createElement('div');
            gridEl.className = `chunk-grid cols-${chunk.span}`;
            
            chunk.items.forEach(item => {
                gridEl.appendChild(item);
                flatItemList.push(item); // Add to flat list for load more
            });

            chunkEl.appendChild(gridEl);
            rowEl.appendChild(chunkEl);
        });

        container.appendChild(rowEl);
    });

    // 4. PAGINATION
    initPagination(flatItemList);
}

function initPagination(items) {
    const loadBtn = document.getElementById('btn-load-more');
    const BATCH_SIZE = 12;
    let visibleCount = 0;

    // Helper to check if a row is empty of visible items
    const updateLayoutVisibility = () => {
        document.querySelectorAll('.packed-row').forEach(row => {
            const hasVisible = Array.from(row.querySelectorAll('.archive-cell'))
                .some(el => el.style.display !== 'none');
            row.style.display = hasVisible ? 'grid' : 'none';
        });

        document.querySelectorAll('.packed-chunk').forEach(chunk => {
             const hasVisible = Array.from(chunk.querySelectorAll('.archive-cell'))
                .some(el => el.style.display !== 'none');
             chunk.style.visibility = hasVisible ? 'visible' : 'hidden';
        });
    };

    // Initial Hide
    items.forEach((item, index) => {
        if (index >= BATCH_SIZE) {
            item.style.display = 'none';
            item.classList.add('hidden');
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
            for (let i = visibleCount; i < nextLimit && i < items.length; i++) {
                const item = items[i];
                item.style.display = 'block';
                // Small delay for fade in
                setTimeout(() => {
                    item.classList.remove('hidden');
                    item.classList.add('is-appearing');
                }, 10);
            }
            visibleCount = nextLimit;
            updateLayoutVisibility();

            if (visibleCount >= items.length) {
                loadBtn.style.opacity = '0';
                loadBtn.style.pointerEvents = 'none';
            }
        });
    }
}