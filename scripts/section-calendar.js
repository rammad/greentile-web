/* =========================================
   PAGE: EVENTS (Calendar Logic)
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
    const { staggerTime, wait } = window.AnimationUtils;

    // 1. ANIMATE HERO TITLE (Wait for Global JS)
    const title = document.querySelector('.animate-cascade');
    if (title) {
        const checkInit = setInterval(() => {
            if (title.classList.contains('is-initialized')) {
                clearInterval(checkInit);
                if (window.playCascade) window.playCascade(title);
            }
        }, 50);
    }

    // 2. ANIMATE UI CONTROLS
    const header = document.querySelector('.calendar-header');
    if (header) {
        setTimeout(() => {
            header.classList.add('is-active');
        }, 200); 
    }

    // 3. ANIMATE CALENDAR LIST (Cleaned up)
    const rows = document.querySelectorAll('.calendar-row');
    
    // Start after header is mostly visible
    const initialDelay = 400; 

    if (rows.length > 0) {
        rows.forEach((row, index) => {
            setTimeout(() => {
                row.classList.add('is-visible');
            }, initialDelay + (index * 100)); // 100ms stagger is cleaner for lists than 300ms
        });
    }

    // 4. SETUP UI INTERACTIONS
    initEventInteractions();
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
            // Trigger animation for poster wrapper if active
            const wrapper = document.getElementById('poster-wrapper');
            if(wrapper) wrapper.style.opacity = '1';
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
                        // Keep poster visible but maybe behind? Or hide it?
                        // Usually for Coming Soon, we might not have a poster yet.
                        // posterImg.style.opacity = '0.5'; 
                    } 
                    else if (status === 'sold-out') {
                        if(statusSold) {
                            statusSold.style.opacity = '1';
                            // Randomize sticker position relative to this container
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