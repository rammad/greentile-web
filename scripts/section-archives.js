/* =========================================
   PAGE: ARCHIVES (Standardized Packer)
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'auto';

    const page = document.querySelector('.archives-page');
    if (page) setTimeout(() => page.classList.add('is-active'), 100);

    // ANIMATE TITLE
    const title = document.querySelector('.animate-cascade');
    if (title) {
        const checkInit = setInterval(() => {
            if (title.classList.contains('is-initialized') && window.playCascade) {
                clearInterval(checkInit);
                setTimeout(() => window.playCascade(title), 100); 
            }
        }, 50);
    }

    initRowPacker();
});

function initRowPacker() {
    const container = document.getElementById('dynamic-archive-container');
    if (!container) return;

    // 1. EXTRACT DATA
    const allCells = Array.from(document.querySelectorAll('.archive-cell'));
    container.innerHTML = ''; 
    // Add the class that section-calendar.css expects
    container.classList.add('calendar-grid-packed'); 
    // Override display:none from calendar css
    container.style.display = 'flex'; 

    const monthGroups = [];
    let currentMonthName = null;
    let currentGroup = null;

    allCells.forEach(cell => {
        const m = cell.getAttribute('data-month');
        // Get image source from the old .archive-poster
        const img = cell.querySelector('img');
        const imgSrc = img ? img.getAttribute('src') : '';
        const href = cell.getAttribute('href');

        if (m !== currentMonthName) {
            currentGroup = { name: m, items: [] };
            monthGroups.push(currentGroup);
            currentMonthName = m;
        }

        // CREATE NEW CARD (Standardized Structure)
        // We convert the .archive-cell data into a .grid-card
        const card = document.createElement('a');
        card.href = href;
        card.className = 'grid-card';
        
        // Use grid-card-poster class to inherit standard styles
        card.innerHTML = `<img src="${imgSrc}" class="grid-card-poster">`;

        currentGroup.items.push(card);
    });

    // 2. PACKING ALGORITHM (Standard)
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

    // 3. RENDER
    const flatItemList = []; 

    ROWS.forEach(rowData => {
        const rowEl = document.createElement('div');
        rowEl.className = 'packed-row';
        
        rowData.chunks.forEach(chunk => {
            const chunkEl = document.createElement('div');
            chunkEl.className = `packed-chunk span-${chunk.span}`;
            
            const header = document.createElement('div');
            header.className = 'month-header';
            header.classList.add('type-sub2')
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

    // 4. PAGINATION (Logic preserved, classes updated)
    initPagination(flatItemList);
}

function initPagination(items) {
    const loadBtn = document.getElementById('btn-load-more');
    const BATCH_SIZE = 12;
    let visibleCount = 0;

    const updateLayoutVisibility = () => {
        // We need to hide empty rows to prevent whitespace gaps
        const rows = document.querySelectorAll('.packed-row');
        rows.forEach(row => {
            const cards = row.querySelectorAll('.grid-card');
            const hasVisible = Array.from(cards).some(el => el.style.display !== 'none');
            row.style.display = hasVisible ? 'grid' : 'none';
        });
    };

    // Initial Hide
    items.forEach((item, index) => {
        if (index >= BATCH_SIZE) {
            item.style.display = 'none';
            // We use standard animation classes if needed, or simple display toggle
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

            // Animate them in
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