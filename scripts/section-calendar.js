/* events / calendar page */

const STICKER_ASSETS = {
    'coming-soon': {
        blanks: [
            'images/graphics/coming-soon/Blank/GTSC WEB EVENT STICKER_CS SHAPE 1 INSIDE BLANK.svg',
            'images/graphics/coming-soon/Blank/GTSC WEB EVENT STICKER_CS SHAPE 3 INSIDE BLANK.svg',
            'images/graphics/coming-soon/Blank/GTSC WEB EVENT STICKER_CS SHAPE 4 INSIDE BLANK.svg',
        ],
        text: 'images/graphics/coming-soon/Text only/GTSC WEB EVENT STICKER_CS INSIDE TEXT ONLY WHITE.svg',
    },
    'sold-out': {
        blanks: [
            'images/graphics/sold-out/Blank/GTSC WEB EVENT STICKER_SO SHAPE 1 BLANK.svg',
            'images/graphics/sold-out/Blank/GTSC WEB EVENT STICKER_SO SHAPE 2 BLANK.svg',
            'images/graphics/sold-out/Blank/GTSC WEB EVENT STICKER_SO SHAPE 3 BLANK.svg',
            'images/graphics/sold-out/Blank/GTSC WEB EVENT STICKER_SO SHAPE 4 BLANK.svg',
        ],
        text: 'images/graphics/sold-out/Text only/GTSC WEB EVENT STICKER_SO TEXT ONLY WHITE.svg',
    }
};

function randomPick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function buildBadgeHTML(type) {
    const assets = STICKER_ASSETS[type];
    return `<img class="badge-layer badge-layer-blank" src="${randomPick(assets.blanks)}" alt="">` +
           `<img class="badge-layer badge-layer-text" src="${assets.text}" alt="">`;
}

function populateBadge(el, type) {
    if (!el) return;
    el.innerHTML = buildBadgeHTML(type);
}

document.addEventListener('DOMContentLoaded', () => {
    const { staggerTime, wait, transitionHeader } = window.AnimationUtils;

    const animateEntrance = async () => {
        const title = document.querySelector('.animate-cascade');
        const subtitle = document.querySelector('.text-mask');
        const filters = document.querySelectorAll('.ui-roll');
        const rows = document.querySelectorAll('.calendar-row');

        while (!title.classList.contains('is-initialized')) {
            await wait(50);
        }

        if (title) await transitionHeader(title, 'enter');

        await wait(staggerTime);

        if (subtitle) subtitle.classList.add('is-visible');

        await wait(staggerTime);

        if (filters.length > 0) {
            for (let i = 0; i < filters.length; i++) {
                filters[i].classList.add('is-visible');
            }
        }

        await wait(staggerTime);

        if (rows.length > 0) {
            for (let i = 0; i < rows.length; i++) {
                rows[i].classList.add('is-visible');
                await wait(staggerTime * 0.5);
            }
        }
    };

    initEventInteractions();
    initRowPacker();
    animateEntrance();
    initMobileScrollSpy();
});

function initEventInteractions() {
    const pageContainer = document.getElementById('cal-page-container');
    const btnList = document.getElementById('btn-list');
    const btnGrid = document.getElementById('btn-grid');

    if (btnList && btnGrid && pageContainer) {
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

    const rows = document.querySelectorAll('.calendar-row');
    const posterWrapper = document.getElementById('poster-wrapper');
    const posterImg = document.getElementById('poster-img');
    const statusSoon = document.getElementById('status-soon');
    const statusSold = document.getElementById('status-sold');

    populateBadge(statusSoon, 'coming-soon');
    populateBadge(statusSold, 'sold-out');

    if (rows.length > 0 && posterWrapper && posterImg) {
        rows.forEach(row => {
            row.addEventListener('mouseenter', () => {
                if (window.innerWidth > 768 && !pageContainer.classList.contains('mode-grid')) {
                    const imgUrl = row.getAttribute('data-img');
                    const status = row.getAttribute('data-status');

                    if (imgUrl) {
                        posterImg.src = imgUrl;
                        posterWrapper.classList.add('active');
                    }

                    if (statusSoon) statusSoon.style.opacity = '0';
                    if (statusSold) statusSold.style.opacity = '0';
                    posterImg.style.opacity = '1';
                    posterImg.classList.remove('is-sold-out');

                    if (status === 'coming-soon') {
                        if (statusSoon) {
                            populateBadge(statusSoon, 'coming-soon');
                            statusSoon.style.opacity = '1';
                        }
                        posterImg.style.opacity = '0';
                    } else if (status === 'sold-out') {
                        if (statusSold) {
                            populateBadge(statusSold, 'sold-out');
                            statusSold.style.opacity = '1';
                            randomizeSticker(statusSold);
                        }
                        posterImg.classList.add('is-sold-out');
                        posterImg.style.opacity = '0.5';
                    }
                }
            });

            row.addEventListener('mouseleave', () => {
                if (window.innerWidth > 768) {
                    posterWrapper.classList.remove('active');
                    posterImg.classList.remove('is-sold-out');
                }
            });

            row.addEventListener('click', (e) => {
                if (window.innerWidth > 768) {
                    window.location.href = row.getAttribute('href');
                }
            });
        });
    }

    randomizeGridStickers();
}

function randomizeGridStickers() {
    const gridStickers = document.querySelectorAll('.grid-item .badge-sold');
    gridStickers.forEach(el => {
        randomizeSticker(el);
    });
}

function randomizeSticker(element) {
    const side = Math.floor(Math.random() * 4);
    const offset = Math.random() * 75 + 10;

    let top, left;

    switch (side) {
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

/* mobile: sync poster image to the centered list item via scroll spy */
function initMobileScrollSpy() {
    if (window.innerWidth > 768) return;

    const list = document.querySelector('.calendar-list');
    const items = document.querySelectorAll('.calendar-row');
    const poster = document.getElementById('poster-img');

    if (!list || !poster) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const newSrc = entry.target.getAttribute('data-img');
                if (newSrc && poster.src !== newSrc) {
                    poster.src = newSrc;
                }
            }
        });
    }, {
        root: list,
        threshold: 0.6
    });

    items.forEach(item => observer.observe(item));
}

/* pack list rows into a grid grouped by month */
function initRowPacker() {
    const container = document.getElementById('dynamic-grid-container');
    const listRows = document.querySelectorAll('.calendar-row');

    if (!container || listRows.length === 0) return;

    container.innerHTML = '';

    const monthGroups = [];
    let currentMonthName = null;
    let currentGroup = null;

    const getMonthName = (dateStr) => {
        const monthNum = dateStr.split('.')[0];
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        return months[parseInt(monthNum) - 1] || "Upcoming";
    };

    listRows.forEach(row => {
        const dateText = row.querySelector('.cal-date').innerText.trim();
        const monthName = getMonthName(dateText);
        const imgUrl = row.getAttribute('data-img');
        const href = row.getAttribute('href');
        const status = row.getAttribute('data-status');

        if (monthName !== currentMonthName) {
            currentGroup = { name: monthName, items: [] };
            monthGroups.push(currentGroup);
            currentMonthName = monthName;
        }

        const card = document.createElement('a');
        card.href = href;
        card.className = 'grid-card' + (status ? ` grid-${status}` : '');
        card.innerHTML = `
            <img src="${imgUrl}" class="grid-card-poster" ${status === 'coming-soon' ? 'style="opacity: 0;">' : '>'}
            ${status === 'coming-soon' ? `<div class="status-badge badge-soon">${buildBadgeHTML('coming-soon')}</div>` : ''}
            ${status === 'sold-out' ? `<div class="status-badge badge-sold">${buildBadgeHTML('sold-out')}</div>` : ''}
        `;

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

    ROWS.forEach(rowData => {
        const rowEl = document.createElement('div');
        rowEl.className = 'packed-row';

        rowData.chunks.forEach(chunk => {
            const chunkEl = document.createElement('div');
            chunkEl.className = `packed-chunk span-${chunk.span}`;

            const header = document.createElement('div');
            header.className = 'month-header';
            header.classList.add('type-subBold2');
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

    container.querySelectorAll('.grid-card').forEach(card => {
        const sign = Math.random() < 0.5 ? -1 : 1;
        const deg  = sign * (2 + Math.random() * 2);
        card.style.setProperty('--hover-rotate', `${deg.toFixed(1)}deg`);
    });
}
