/* =========================================
   PAGE: EVENTS (Calendar Logic)
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. ANIMATE HERO TITLE
    // We simply wait for the element. The CSS handles the visibility state.
    // The Global JS handles the splitting.
    const title = document.querySelector('.animate-cascade');
    
    // Simple check loop to wait for Global JS to finish init
    if (title) {
        const checkInit = setInterval(() => {
            if (title.classList.contains('is-initialized')) {
                clearInterval(checkInit);
                if (window.playCascade) window.playCascade(title);
            }
        }, 50); // Check every 50ms
    }

    // 2. ANIMATE UI CONTROLS
    const header = document.querySelector('.calendar-header');
    if (header) {
        setTimeout(() => {
            header.classList.add('is-active');
        }, 600); 
    }

    // 3. ANIMATE CALENDAR LIST
    const rows = document.querySelectorAll('.calendar-row');
    const startDelay = 800; 

    if (rows.length > 0) {
        rows.forEach((row, index) => {
            setTimeout(() => {
                row.classList.add('is-visible');
            }, startDelay + (index * 100)); 
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

    // These are the overlays inside the main poster wrapper
    const statusSoon = document.getElementById('status-soon');
    const statusSold = document.getElementById('status-sold');

    if (rows.length > 0 && posterWrapper && posterImg) {
        rows.forEach(row => {
            row.addEventListener('mouseenter', () => {
                if (window.innerWidth > 768 && !pageContainer.classList.contains('mode-grid')) {
                    const imgUrl = row.getAttribute('data-img');
                    const status = row.getAttribute('data-status'); // Get status

                    // 1. Set Main Poster Source
                    if(imgUrl) {
                        posterImg.src = imgUrl;
                        posterWrapper.classList.add('active');
                    }

                    // 2. Reset Status Images (Hide all initially)
                    if(statusSoon) statusSoon.style.opacity = '0';
                    if(statusSold) statusSold.style.opacity = '0';
                    
                    // Default: Show the poster image
                    posterImg.style.opacity = '1';

                    // 3. Handle Status Logic
                    if (status === 'coming-soon') {
                        // Show "Coming Soon" spinner, Hide poster image if desired (or keep it dim)
                        if(statusSoon) statusSoon.style.opacity = '1';
                         posterImg.style.opacity = '0'; // Optional: Hide poster if it's just a placeholder
                    } 
                    else if (status === 'sold-out') {
                        // Show "Sold Out" sticker over the poster
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
             row.addEventListener('click', () => {
                if(window.innerWidth > 768) {
                    window.location.href = 'event-detail.html';
                }
            });
        });
    }

    // --- GRID LOGIC ---
    // Trigger randomization for grid items on load
    randomizeGridStickers();
}

// Scrambles the position of "Sold Out" stickers in the grid
function randomizeGridStickers() {
    const gridStickers = document.querySelectorAll('.grid-item .badge-sold');
    gridStickers.forEach(el => {
        randomizeSticker(el); 
    });
}

// Helper: Calculates random position along the edge
function randomizeSticker(element) {
    // Pick a side: 0=Top, 1=Right, 2=Bottom, 3=Left
    const side = Math.floor(Math.random() * 4);
    
    // Random position between 10% and 85% (to keep it visible)
    const offset = Math.random() * 75 + 10; 
    
    let top, left;

    switch(side) {
        case 0: // Top Edge
            top = 5; 
            left = offset;
            break;
        case 1: // Right Edge
            top = offset;
            left = 85; 
            break;
        case 2: // Bottom Edge
            top = 85;
            left = offset;
            break;
        case 3: // Left Edge
            top = offset;
            left = 5; 
            break;
    }

    element.style.top = `${top}%`;
    element.style.left = `${left}%`;
    
    // Add a random rotation variation between -30 and 30 deg
    const rotation = Math.floor(Math.random() * 60) - 30;
    element.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
}