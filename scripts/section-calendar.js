/* =========================================
   PAGE: EVENTS (Calendar Logic)
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
    const { staggerTime, wait, transitionHeader } = window.AnimationUtils;

    const animateEntrance = async () =>{
    const title = document.querySelector('.animate-cascade');
    const subtitle = document.querySelector('.text-mask');
    const filters = document.querySelectorAll('.ui-roll');
    const rows = document.querySelectorAll('.calendar-row');

    while (!title.classList.contains('is-initialized')){
        await wait(50);
    }

    if(title) transitionHeader(title);

    await wait(staggerTime);

    if(subtitle) subtitle.classList.add('is-visible');

    await wait(staggerTime);

    if(filters.length > 0) {
        for (let i = 0; i < filters.length; i++){
            filters[i].classList.add('is-visible');
        }
    }

    await wait(staggerTime);

    if(rows.length > 0) {
        for (let i = 0; i < rows.length; i++){
            rows[i].classList.add('is-visible');
            await wait(staggerTime * 0.5);
        }
    }
}

    initEventInteractions();
    initRowPacker();
    animateEntrance();
    initMobileScrollSpy();
});



function initEventInteractions() {
    const pageContainer = document.getElementById('cal-page-container');
    const btnList = document.getElementById('btn-list');
    const btnGrid = document.getElementById('btn-grid');
    
    // --- VIEW TOGGLE ---
    if(btnList && btnGrid && pageContainer) {
        btnList.addEventListener('click', () => {
            pageContainer.classList.remove('mode-grid');
            btnList.classList.add('active');
            btnGrid.classList.remove('active');
        });

        btnGrid.addEventListener('click', () => {
            pageContainer.classList.add('mode-grid');
            btnGrid.classList.add('active');
            btnList.classList.remove('active');
        });
    }

    // --- HOVER LOGIC (LIST VIEW) ---
    const rows = document.querySelectorAll('.calendar-row');
    const posterWrapper = document.getElementById('poster-wrapper');
    const posterImg = document.getElementById('poster-img');

    // Overlays
    const statusSoon = document.getElementById('status-soon');
    const statusSold = document.getElementById('status-sold');

    if (rows.length > 0 && posterWrapper && posterImg) {
        rows.forEach(row => {
            row.addEventListener('mouseenter', () => {
                // Only on desktop & list mode
                if (window.innerWidth > 768 && !pageContainer.classList.contains('mode-grid')) {
                    const imgUrl = row.getAttribute('data-img');
                    const status = row.getAttribute('data-status');

                    // 1. Set Image
                    if(imgUrl) {
                        posterImg.src = imgUrl;
                        posterWrapper.classList.add('active');
                    }

                    // 2. Reset Statuses
                    if(statusSoon) statusSoon.style.opacity = '0';
                    if(statusSold) statusSold.style.opacity = '0';
                    posterImg.style.opacity = '1';

                    // 3. Handle Status
                    if (status === 'coming-soon') {
                        if(statusSoon) statusSoon.style.opacity = '1';
                        posterImg.style.opacity = '0'; 
                    } 
                    else if (status === 'sold-out') {
                        if(statusSold) {
                            statusSold.style.opacity = '1';
                            randomizeSticker(statusSold);
                        }
                    }
                }
            });

            row.addEventListener('mouseleave', () => {
                if (window.innerWidth > 768) {
                    posterWrapper.classList.remove('active');
                }
            });

            row.addEventListener('click', (e) => {
                if(window.innerWidth > 768) {
                    // Navigate
                    window.location.href = row.getAttribute('href');
                }
            });
        });
    }

    // --- GRID LOGIC ---
    randomizeGridStickers();
}

// Scrambles the position of "Sold Out" stickers in the grid
function randomizeGridStickers() {
    const gridStickers = document.querySelectorAll('.grid-item .badge-sold');
    gridStickers.forEach(el => {
        randomizeSticker(el); 
    });
}

// Helper: Calculates random position
function randomizeSticker(element) {
    // Pick a side: 0=Top, 1=Right, 2=Bottom, 3=Left
    const side = Math.floor(Math.random() * 4);
    
    // Random position between 10% and 85%
    const offset = Math.random() * 75 + 10; 
    
    let top, left;

    switch(side) {
        case 0: top = 10; left = offset; break;
        case 1: top = offset; left = 80; break;
        case 2: top = 80; left = offset; break;
        case 3: top = offset; left = 10; break;
    }

    element.style.top = `${top}%`;
    element.style.left = `${left}%`;
    
    const rotation = Math.floor(Math.random() * 60) - 30;
    element.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
}

/* =========================================
   MOBILE POSTER SYNC
   ========================================= */
function initMobileScrollSpy() {
    if (window.innerWidth > 768) return; // Desktop handled by hover

    const list = document.querySelector('.calendar-list');
    const items = document.querySelectorAll('.calendar-row');
    const poster = document.getElementById('poster-img');

    if (!list || !poster) return;

    // Use IntersectionObserver to see which item is centered
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Get image from the data attribute of the centered text item
                const newSrc = entry.target.getAttribute('data-img');
                
                // Update the fixed poster
                if (newSrc && poster.src !== newSrc) {
                    poster.src = newSrc;
                }
            }
        });
    }, {
        root: list,    // Watch the scrolling list
        threshold: 0.6 // Trigger when 60% of the item is visible (mostly centered)
    });

    items.forEach(item => observer.observe(item));
};

/* =========================================
   THE ROW PACKER (Adapted for Events)
   ========================================= */
function initRowPacker() {
    const container = document.getElementById('dynamic-grid-container');
    const listRows = document.querySelectorAll('.calendar-row');
    
    if (!container || listRows.length === 0) return;

    container.innerHTML = ''; // Clear

    // 1. PARSE DATA
    const monthGroups = [];
    let currentMonthName = null;
    let currentGroup = null;

    // Helper: Convert "03.07" -> "March"
    const getMonthName = (dateStr) => {
        const monthNum = dateStr.split('.')[0];
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        return months[parseInt(monthNum) - 1] || "Upcoming";
    };

    listRows.forEach(row => {
        const dateText = row.querySelector('.cal-date').innerText.trim(); // "03.07"
        const monthName = getMonthName(dateText);
        
        // Extract Data for the Card
        const imgUrl = row.getAttribute('data-img');
        const href = row.getAttribute('href');
        const status = row.getAttribute('data-status');

        if (monthName !== currentMonthName) {
            currentGroup = { name: monthName, items: [] };
            monthGroups.push(currentGroup);
            currentMonthName = monthName;
        }

        // Create the Grid Card DOM Element
        const card = document.createElement('a');
        card.href = href;
        card.className = 'grid-card';
        card.innerHTML = `
            <img src="${imgUrl}" class="grid-card-poster" ${status === 'coming-soon' ? 'style="opacity: 0;">' : '>'}
            ${status === 'coming-soon' ? '<div class="status-badge badge-soon"></div>' : ''}
            ${status === 'sold-out' ? '<div class="status-badge badge-sold"></div>' : ''}
        `;

        currentGroup.items.push(card);
    });

    // 2. PACKING ALGORITHM (Same as Archives)
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
            chunk.items.forEach(item => gridEl.appendChild(item));

            chunkEl.appendChild(gridEl);
            rowEl.appendChild(chunkEl);
        });

        container.appendChild(rowEl);
    });
}