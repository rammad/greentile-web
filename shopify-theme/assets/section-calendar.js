/* events / calendar page */

function buildStickerAssets() {
    const el = document.getElementById('cal-page-container');
    if (!el) return { 'coming-soon': { blanks: [], text: '', color: '' }, 'sold-out': { blanks: [], text: '', color: '' } };
    const d = el.dataset;
    return {
        'coming-soon': {
            blanks: [d.stickerCsBlank1, d.stickerCsBlank2, d.stickerCsBlank3, d.stickerCsBlank4].filter(Boolean),
            text: d.stickerCsText || '',
            color: d.stickerCsColor || '',
        },
        'sold-out': {
            blanks: [d.stickerSoBlank1, d.stickerSoBlank2, d.stickerSoBlank3, d.stickerSoBlank4].filter(Boolean),
            text: d.stickerSoText || '',
            color: d.stickerSoColor || '',
        }
    };
}

function randomPick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function buildBadgeHTML(type) {
    const assets = buildStickerAssets()[type];
    const blankSrc = randomPick(assets.blanks);
    const colorStyle = assets.color ? `background-color:${assets.color};` : '';
    return `<div class="badge-layer badge-layer-blank" style="-webkit-mask-image:url('${blankSrc}');mask-image:url('${blankSrc}');${colorStyle}"></div>` +
           `<img class="badge-layer badge-layer-text" src="${assets.text}" alt="">`;
}

function populateBadge(el, type) {
    if (!el) return;
    el.innerHTML = buildBadgeHTML(type);
}

document.addEventListener('DOMContentLoaded', () => {
    const { staggerTime, wait, transitionHeader } = window.AnimationUtils;

    const animateEntrance = async () => {
        const title = document.querySelector('#cal-page-container .animate-cascade');
        const mobileTitleLines = document.querySelectorAll('.calendar-title-mobile .fit-text');
        const isMobile = window.innerWidth <= 1024;
        const subtitle = document.querySelector('.text-mask');
        const filters = document.querySelectorAll('.ui-roll');
        const rows = document.querySelectorAll('.calendar-row');

        if (isMobile && mobileTitleLines.length) {
            const { fitTextToWidth } = window.AppUtils || {};
            await document.fonts.ready;
            if (fitTextToWidth) {
                Array.from(mobileTitleLines).forEach(line => {
                    line.style.fontSize = '';
                    fitTextToWidth(line);
                });
            }
            for (let i = 0; i < mobileTitleLines.length; i++) {
                mobileTitleLines[i].classList.add('is-initialized');
                await wait(staggerTime * 0.3);
            }
        } else {
            while (!title.classList.contains('is-initialized')) {
                await wait(50);
            }
            if (title) await transitionHeader(title, 'enter');
        }

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
    initMobileFilterToggle();
    initMonthFilters();
    initRowPacker();
    animateEntrance();
    initMobileScrollSpy();
    initControlsClamping();
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
                if (window.innerWidth > 1024 && !pageContainer.classList.contains('mode-grid')) {
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
                if (window.innerWidth > 1024) {
                    posterWrapper.classList.remove('active');
                    posterImg.classList.remove('is-sold-out');
                }
            });

            row.addEventListener('click', (e) => {
                if (window.innerWidth > 1024) {
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
    const top = Math.random() * 75 + 10;
    const left = 80;

    element.style.top = `${top}%`;
    element.style.left = `${left}%`;

    const rotation = Math.floor(Math.random() * 60) - 30;
    element.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
}

/* mobile: two-rail layout — date strip on top, poster+title carousel below */
function initMobileScrollSpy() {
    if (window.innerWidth > 1024) return;

    const wrapper = document.querySelector('.calendar-interface-wrapper');
    const list = document.querySelector('.calendar-list');
    const items = document.querySelectorAll('.calendar-row:not(.filtered-out)');

    if (!wrapper || !list || items.length === 0) return;

    /* ── build top rail of dates ── */
    const datesRail = document.createElement('div');
    datesRail.className = 'calendar-dates-rail';

    const datesTrack = document.createElement('div');
    datesTrack.className = 'calendar-dates-track';

    const startSpacer = document.createElement('div');
    startSpacer.className = 'date-rail-spacer';
    datesTrack.appendChild(startSpacer);

    items.forEach((item, i) => {
        const dateText = item.querySelector('.cal-date').textContent.trim();
        const dateEl = document.createElement('span');
        dateEl.className = 'cal-date-item type-h2';
        dateEl.textContent = dateText;
        dateEl.dataset.index = i;
        datesTrack.appendChild(dateEl);

        dateEl.addEventListener('click', () => {
            dateEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        });
    });

    const endSpacer = document.createElement('div');
    endSpacer.className = 'date-rail-spacer';
    datesTrack.appendChild(endSpacer);

    datesRail.appendChild(datesTrack);
    wrapper.prepend(datesRail);
    const dateItems = datesTrack.querySelectorAll('.cal-date-item');

    const setSpacerWidths = () => {
        const w = datesRail.clientWidth / 2;
        startSpacer.style.minWidth = w + 'px';
        endSpacer.style.minWidth = w + 'px';
    };

    const sizeRailOverlap = () => {
        const h = list.offsetHeight;
        datesRail.style.paddingBottom = h + 'px';
        datesRail.style.marginBottom  = -h + 'px';
    };

    /* ── inject inline poster + badges into each slide ── */
    items.forEach(item => {
        const imgUrl = item.getAttribute('data-img');
        const status = item.getAttribute('data-status');
        const calName = item.querySelector('.cal-name');

        const wrap = document.createElement('div');
        wrap.className = 'cal-poster-wrap';

        if (status === 'coming-soon') {
            const badge = document.createElement('div');
            badge.className = 'status-badge badge-soon';
            badge.innerHTML = buildBadgeHTML('coming-soon');
            Object.assign(badge.style, {
                top: '50%', left: '50%', width: '90%', height: '90%',
                transform: 'translate(-50%, -50%)', opacity: '1'
            });
            wrap.appendChild(badge);
        } else if (imgUrl) {
            const img = document.createElement('img');
            img.src = imgUrl;
            img.alt = item.getAttribute('data-title') || '';
            img.className = 'cal-poster-inline';
            if (status === 'sold-out') img.classList.add('is-sold-out');
            wrap.appendChild(img);
        }

        if (status === 'sold-out') {
            const badge = document.createElement('div');
            badge.className = 'status-badge badge-sold';
            badge.innerHTML = buildBadgeHTML('sold-out');
            Object.assign(badge.style, {
                top: '10%', right: '10%', width: '120px', height: '120px',
                transform: 'rotate(-15deg)', opacity: '1'
            });
            wrap.appendChild(badge);
        }

        item.insertBefore(wrap, calName);
    });

    /* ── sync: when centered date changes, lerp poster into place ── */
    let activeIndex = -1;
    let lerpRaf = 0;

    const lerpPoster = (idx) => {
        cancelAnimationFrame(lerpRaf);
        const target = items[idx].offsetLeft;
        const start = list.scrollLeft;
        const dist = target - start;
        if (Math.abs(dist) < 1) { list.scrollLeft = target; return; }

        const duration = 300;
        const t0 = performance.now();

        const step = (now) => {
            const t = Math.min((now - t0) / duration, 1);
            const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            list.scrollLeft = start + dist * ease;
            if (t < 1) lerpRaf = requestAnimationFrame(step);
        };
        lerpRaf = requestAnimationFrame(step);
    };

    const onDateScroll = () => {
        const railRect = datesRail.getBoundingClientRect();
        const railCenterX = railRect.left + railRect.width / 2;
        let closestIdx = 0;
        let closestDist = Infinity;

        dateItems.forEach((d, i) => {
            const r = d.getBoundingClientRect();
            const dist = Math.abs(r.left + r.width / 2 - railCenterX);
            if (dist < closestDist) { closestDist = dist; closestIdx = i; }
        });

        if (closestIdx !== activeIndex) {
            activeIndex = closestIdx;
            dateItems.forEach((d, i) => d.classList.toggle('is-active', i === activeIndex));
            lerpPoster(activeIndex);
        }
    };

    datesRail.addEventListener('scroll', onDateScroll, { passive: true });

    /* ── swipe handler: detect direction, scrollTo ±1 ── */
    {
        let swStartX = 0;
        let swStartScroll = 0;
        let swStartIdx = 0;
        const HINT_MAX = 50;
        const HINT_DAMPING = 3;

        const getCenterIdx = () => {
            const cx = datesRail.getBoundingClientRect().left + datesRail.clientWidth / 2;
            let best = 0, bestDist = Infinity;
            dateItems.forEach((d, i) => {
                const r = d.getBoundingClientRect();
                const dist = Math.abs(r.left + r.width / 2 - cx);
                if (dist < bestDist) { bestDist = dist; best = i; }
            });
            return best;
        };

        const centerScrollFor = (idx) =>
            dateItems[idx].offsetLeft + dateItems[idx].offsetWidth / 2 - datesRail.clientWidth / 2;

        datesRail.addEventListener('touchstart', (e) => {
            swStartX = e.touches[0].clientX;
            swStartScroll = datesRail.scrollLeft;
            swStartIdx = getCenterIdx();
            datesRail.style.scrollSnapType = 'none';
        }, { passive: true });

        datesRail.addEventListener('touchmove', (e) => {
            const dx = e.touches[0].clientX - swStartX;
            const hint = Math.max(-HINT_MAX, Math.min(HINT_MAX, dx / HINT_DAMPING));
            datesRail.scrollLeft = swStartScroll - hint;
        }, { passive: true });

        datesRail.addEventListener('touchend', (e) => {
            const dx = e.changedTouches[0].clientX - swStartX;
            let targetScroll;
            if (Math.abs(dx) < 20) {
                targetScroll = swStartScroll;
            } else {
                let target = swStartIdx;
                if (dx < 0) target = Math.min(swStartIdx + 1, dateItems.length - 1);
                else target = Math.max(swStartIdx - 1, 0);
                targetScroll = centerScrollFor(target);
            }

            datesRail.scrollTo({ left: targetScroll, behavior: 'smooth' });
            datesRail.addEventListener('scrollend', () => {
                datesRail.style.scrollSnapType = '';
            }, { once: true });
        }, { passive: true });

        datesRail.addEventListener('touchcancel', () => {
            datesRail.style.scrollSnapType = '';
        });
    }

    /* ── forward taps from the rail's extended touch area to poster links ── */
    let railTouchScroll = 0;
    datesRail.addEventListener('touchstart', () => {
        railTouchScroll = datesRail.scrollLeft;
    }, { passive: true });

    datesRail.addEventListener('click', (e) => {
        const trackRect = datesTrack.getBoundingClientRect();
        if (e.clientY <= trackRect.bottom) return;
        if (Math.abs(datesRail.scrollLeft - railTouchScroll) > 5) return;
        datesRail.style.pointerEvents = 'none';
        const below = document.elementFromPoint(e.clientX, e.clientY);
        datesRail.style.pointerEvents = '';
        if (below) {
            const link = below.closest('a');
            if (link) link.click();
        }
    });

    /* ── initial state ── */
    document.fonts.ready.then(() => {
        requestAnimationFrame(() => {
            setSpacerWidths();
            sizeRailOverlap();
            dateItems[0].scrollIntoView({ inline: 'center', block: 'nearest' });
            activeIndex = 0;
            dateItems[0].classList.add('is-active');
            list.scrollTo({ left: 0 });
        });
    });
}

/* pack list rows into a grid grouped by month */
function initRowPacker() {
    const container = document.getElementById('dynamic-grid-container');
    const listRows = document.querySelectorAll('.calendar-row:not(.filtered-out)');

    if (!container || listRows.length === 0) {
        if (container) container.innerHTML = '';
        return;
    }

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
        if (status === 'coming-soon') {
            const ox = Math.round((Math.random() - 0.5) * 80);
            const oy = Math.round((Math.random() - 0.5) * 80 - 30);
            card.innerHTML = `
                <div class="grid-card-placeholder">
                    <div class="status-badge badge-soon" style="left:calc(50% + ${ox}px);top:calc(40% + ${oy}px);transform:translate(-50%,-50%)">${buildBadgeHTML('coming-soon')}</div>
                    <span class="grid-card-label type-subBold1">${row.getAttribute('data-title') || ''}</span>
                </div>
            `;
        } else {
            card.innerHTML = `
                <img src="${imgUrl}" class="grid-card-poster">
                ${status === 'sold-out' ? `<div class="status-badge badge-sold">${buildBadgeHTML('sold-out')}</div>` : ''}
            `;
        }

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

        rowData.chunks.forEach((chunk, chunkIdx) => {
            const chunkEl = document.createElement('div');
            chunkEl.className = `packed-chunk span-${chunk.span}`;

            const header = document.createElement('div');
            header.className = 'month-header';
            header.classList.add('type-subBold2');
            if (chunk.isContinuation && chunkIdx > 0) {
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

function initMobileFilterToggle() {
    if (window.innerWidth > 1024) return;

    const controls = document.querySelector('.calendar-controls');
    if (!controls) return;

    const filtersLists = controls.querySelectorAll('.filters-list');
    if (filtersLists.length < 2) return;

    const filtersList1 = filtersLists[0];
    const filtersList2 = filtersLists[1];
    const filterBtns = Array.from(filtersList1.querySelectorAll('.filter-btn'));
    const btnGrid = document.getElementById('btn-grid');
    const archivesLink = filtersList2.querySelector('a.filter-btn');

    filtersList1.style.display = 'none';
    filtersList2.style.display = 'none';

    const topRow = document.createElement('div');
    topRow.className = 'mobile-controls-top';

    const filtersToggle = document.createElement('button');
    filtersToggle.className = 'filters-toggle type-subRegular1 ui-roll';
    filtersToggle.innerHTML =
        '<span class="ui-roll-layer ui-roll-visible">Filters</span>' +
        '<span class="ui-roll-layer ui-roll-hidden">Filters</span>';
    topRow.appendChild(filtersToggle);

    const divider1 = document.createElement('span');
    divider1.className = 'mobile-divider type-subRegular1';
    divider1.textContent = '/';
    topRow.appendChild(divider1);

    if (btnGrid) topRow.appendChild(btnGrid);

    const divider2 = document.createElement('span');
    divider2.className = 'mobile-divider type-subRegular1';
    divider2.textContent = '/';
    topRow.appendChild(divider2);

    if (archivesLink) topRow.appendChild(archivesLink);

    const optionsRow = document.createElement('div');
    optionsRow.className = 'mobile-filter-options';
    filterBtns.forEach(btn => optionsRow.appendChild(btn));

    controls.appendChild(topRow);
    controls.appendChild(optionsRow);

    filtersToggle.addEventListener('click', () => {
        const isOpening = controls.classList.toggle('filters-open');
        if (isOpening) {
            filtersToggle.classList.add('is-rolling');
        } else {
            filtersToggle.classList.remove('is-rolling');
        }
    });

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            controls.classList.remove('filters-open');
            filtersToggle.classList.remove('is-rolling');
        });
    });

    if (btnGrid) {
        const pageContainer = document.getElementById('cal-page-container');
        const newBtnGrid = btnGrid.cloneNode(true);
        newBtnGrid.classList.remove('roll-hover');
        btnGrid.parentNode.replaceChild(newBtnGrid, btnGrid);

        const rollMs = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--time-roll')) * 1000 || 1000;
        let gridRolling = false;

        newBtnGrid.addEventListener('click', () => {
            if (gridRolling) return;
            gridRolling = true;

            const isGrid = pageContainer.classList.toggle('mode-grid');
            const visible = newBtnGrid.querySelector('.ui-roll-visible');
            const hidden = newBtnGrid.querySelector('.ui-roll-hidden');
            const newLabel = isGrid ? 'List' : 'Grid';
            const oldLabel = isGrid ? 'Grid' : 'List';

            hidden.textContent = newLabel;

            newBtnGrid.classList.add('is-rolling');

            setTimeout(() => {
                visible.style.transition = 'none';
                hidden.style.transition = 'none';

                visible.textContent = newLabel;
                hidden.textContent = oldLabel;
                newBtnGrid.classList.remove('is-rolling');

                newBtnGrid.offsetHeight;
                visible.style.transition = '';
                hidden.style.transition = '';
                gridRolling = false;
            }, rollMs);
        });
    }
}

function destroyMobileLayout() {
    const rail = document.querySelector('.calendar-dates-rail');
    if (rail) rail.remove();
    document.querySelectorAll('.cal-poster-wrap').forEach(el => el.remove());
}

function initMonthFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn[data-filter]');
    if (!filterBtns.length) return;

    const monthMap = {
        january: '01', february: '02', march: '03', april: '04',
        may: '05', june: '06', july: '07', august: '08',
        september: '09', october: '10', november: '11', december: '12'
    };

    filterBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.dataset.filter;
            const monthNum = monthMap[filter];
            const allRows = document.querySelectorAll('.calendar-row');

            allRows.forEach(row => {
                if (filter === 'all' || row.dataset.month === monthNum) {
                    row.classList.remove('filtered-out');
                } else {
                    row.classList.add('filtered-out');
                }
            });

            initRowPacker();

            if (window.innerWidth <= 1024) {
                destroyMobileLayout();
                initMobileScrollSpy();
            }

            const { staggerTime, wait } = window.AnimationUtils || {};
            if (staggerTime && wait) {
                const visibleRows = document.querySelectorAll('.calendar-row:not(.filtered-out)');
                visibleRows.forEach(r => r.classList.remove('is-visible'));
                for (const row of visibleRows) {
                    row.classList.add('is-visible');
                    await wait(staggerTime * 0.3);
                }
            }
        });
    });
}

function initControlsClamping() {
    if (window.innerWidth > 1024) return;
}

