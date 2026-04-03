/* PDP — original animation flow + Shopify cart integration */

(() => {
    const { wait, transitionCta, transitionHeader, staggerTime, observeElementInOut } = window.AnimationUtils || {};
    const MOBILE_BREAKPOINT = 1024;

    /* shopify product data */

    let productData = null;
    const productJsonEl = document.getElementById('product-json');
    if (productJsonEl) {
        try { productData = JSON.parse(productJsonEl.textContent); } catch (e) {}
    }

    const maxQty = parseInt(
        document.querySelector('.pdp-section')?.getAttribute('data-max-qty')
        || '4', 10
    );

    let qty = 1;
    let currentVariantId = null;
    let currentUnitPrice = 0;

    /* cart helpers */

    function formatPrice(cents) {
        if (productData) {
            return (cents / 100).toLocaleString('en-US', {
                style: 'currency',
                currency: productData.currency || 'USD'
            });
        }
        return '$' + (cents / 100).toFixed(2);
    }

    window.updateQty = function (change) {
        const qtyDisplay = document.getElementById('ticket-qty');
        const maxMsg = document.getElementById('max-qty-msg');
        if (!qtyDisplay) return;

        qty += change;
        if (qty < 1) qty = 1;
        if (qty > maxQty) qty = maxQty;

        qtyDisplay.innerText = qty;
        if (maxMsg) maxMsg.classList.toggle('is-visible', qty >= maxQty);
        syncPriceDisplay();
    };

    function syncPriceDisplay() {
        if (!currentUnitPrice) return;
        const total = currentUnitPrice * qty;
        document.querySelectorAll('.buy-price').forEach(el => { el.textContent = formatPrice(total); });
    }

    const buyLabel = document.querySelector('.pdp-section')?.dataset.buyLabel || 'Buy Now';
    let wasSoldOut = false;

    function updateBuyButton() {
        const buyBtn = document.getElementById('pdp-add-to-cart');
        const activeBtn = document.querySelector('.pdp-ticket-btn.active');

        if (activeBtn) {
            currentUnitPrice = parseInt(activeBtn.dataset.price, 10) || 0;
            currentVariantId = parseInt(activeBtn.dataset.variantId, 10);
            const abbr = activeBtn.dataset.abbr || '';
            if (buyBtn) buyBtn.dataset.variantId = currentVariantId;
            document.querySelectorAll('.buy-abbr').forEach(el => { el.textContent = abbr; });
        } else if (buyBtn) {
            currentVariantId = parseInt(buyBtn.dataset.variantId, 10);
            currentUnitPrice = parseInt(buyBtn.dataset.price, 10) || 0;
        }

        if (buyBtn && productData) {
            const variant = productData.variants.find(v => v.id === currentVariantId);
            const available = variant ? variant.available : false;
            const hasMultiple = productData.variants.length > 1;

            buyBtn.disabled = !available;
            buyBtn.classList.toggle('is-sold-out', !available);

            const qtyWrapper = document.querySelector('.qty-wrapper');
            if (qtyWrapper) qtyWrapper.style.display = available ? '' : 'none';

            if (!available) {
                buyBtn.querySelectorAll('.ui-roll-layer').forEach(layer => {
                    layer.innerHTML = '<span class="buy-label">Sold Out</span>';
                });
                wasSoldOut = true;
            } else if (wasSoldOut) {
                const abbr = hasMultiple
                    ? '<span class="buy-abbr">' + (activeBtn?.dataset.abbr || '') + '</span> &ndash; '
                    : '';
                buyBtn.querySelectorAll('.ui-roll-layer').forEach(layer => {
                    layer.innerHTML =
                        '<span>' + abbr + '<span class="buy-price">' + formatPrice(currentUnitPrice * qty) + '</span></span>' +
                        '<span class="buy-label">' + buyLabel + '</span>';
                });
                wasSoldOut = false;
            }
        }

        syncPriceDisplay();
    }

    function initTicketTypes() {
        const btns = document.querySelectorAll('.pdp-ticket-btn');
        if (!btns.length) return;

        btns.forEach(btn => {
            if (!btn.querySelector('.ui-roll')) {
                const label = btn.innerHTML.trim();
                btn.innerHTML = '';
                const roll = document.createElement('div');
                roll.className = 'ui-roll roll-hover is-visible';
                roll.innerHTML =
                    '<span class="ui-roll-layer ui-roll-visible">' + label + '</span>' +
                    '<span class="ui-roll-layer ui-roll-hidden">' + label + '</span>';
                btn.appendChild(roll);
            }

            btn.addEventListener('click', () => {
                if (btn.disabled) return;
                btns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                qty = 1;
                const qtyDisplay = document.getElementById('ticket-qty');
                if (qtyDisplay) qtyDisplay.innerText = qty;
                const maxMsg = document.getElementById('max-qty-msg');
                if (maxMsg) maxMsg.classList.remove('is-visible');
                updateBuyButton();
            });
        });
    }

    function initAddToCart() {
        const buyBtn = document.getElementById('pdp-add-to-cart');
        if (!buyBtn) return;

        updateBuyButton();

        window.addEventListener('pageshow', () => {
            buyBtn.style.pointerEvents = '';
            buyBtn.style.opacity = '';
        });

        buyBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (!currentVariantId) return;

            const routes = window.THEME_SETTINGS?.routes;
            const cartAddUrl = routes?.cartAdd || '/cart/add.js';
            const cartClearUrl = routes?.cartClear || '/cart/clear.js';

            buyBtn.style.pointerEvents = 'none';
            buyBtn.style.opacity = '0.6';

            try {
                const clearRes = await fetch(cartClearUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                if (!clearRes.ok) throw new Error('Clear cart failed: ' + clearRes.status);

                const addRes = await fetch(cartAddUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items: [{ id: currentVariantId, quantity: qty }] })
                });
                if (!addRes.ok) throw new Error('Add to cart failed: ' + addRes.status);

                window.location.href = '/checkout';
            } catch (err) {
                console.error('Buy now failed:', err);
                buyBtn.style.pointerEvents = '';
                buyBtn.style.opacity = '';
            }
        });
    }

    /* qty buttons via data attributes */

    function initQtyButtons() {
        const section = document.querySelector('.pdp-section');
        if (!section) return;
        section.querySelectorAll('[data-qty-change]').forEach(btn => {
            btn.addEventListener('click', () => {
                window.updateQty(parseInt(btn.dataset.qtyChange, 10));
            });
        });
    }

    /* desktop animations (from original) */

    async function initDesktopAnimations(section) {
        if (!transitionHeader) return;

        const title = section.querySelector('.animate-cascade');
        if (title) {
            const checkInit = setInterval(() => {
                if (title.classList.contains('is-initialized') && window.playCascade) {
                    clearInterval(checkInit);
                    transitionHeader(title, 'enter');
                }
            }, 50);
        }

        await wait(staggerTime);

        const subtitles = section.querySelectorAll('.text-mask');
        for (const sub of subtitles) {
            sub.classList.add('is-visible');
            await wait(staggerTime);
        }

        const ticketBtns = section.querySelectorAll('.pdp-ticket-btn');
        ticketBtns.forEach(b => b.classList.add('is-visible'));

        await wait(staggerTime);

        const tags = section.querySelectorAll('.pdp-tag');
        for (const tag of tags) {
            if (!tag.classList.contains('max-qty-label')) tag.classList.add('is-visible');
        }

        await wait(staggerTime);

        section.querySelectorAll('.pdp-poster').forEach(p => p.classList.add('is-visible'));

        await wait(200);

        section.querySelectorAll('.type-body1, .type-body2').forEach(el => el.classList.add('is-visible'));

        const qtyWrapper = section.querySelector('.qty-wrapper');
        if (qtyWrapper) {
            void qtyWrapper.offsetWidth;
            qtyWrapper.classList.add('is-visible');
            await wait(150);
        }

        const cta = section.querySelector('.buy-button-override');
        if (cta) transitionCta(cta, 'enter');
    }

    /* mobile animations (from original) */

    function initMobileAnimations(section) {
        if (!observeElementInOut) return;

        const title = section.querySelector('.pdp-hero-title');
        const ticketActions = section.querySelector('.ticket-actions');
        const cta = section.querySelector('.buy-button-override');
        const descWrapper = section.querySelector('.pdp-desc-wrapper');

        const imageCol = section.querySelector('.pdp-image-col');
        if (imageCol) {
            observeElementInOut(imageCol, {
                root: null,
                enterThreshold: 0.1,
                onEnter: () => {
                    section.querySelectorAll('.pdp-poster').forEach(p => p.classList.add('is-visible'));
                }
            });
        }

        const infoBlock = section.querySelector('.pdp-info');
        const waitForCascade = () => new Promise(resolve => {
            const el = section.querySelector('.animate-cascade');
            if (!el) { resolve(); return; }
            if (el.classList.contains('is-initialized') && window.playCascade) { resolve(); return; }
            const poll = setInterval(() => {
                if (el.classList.contains('is-initialized') && window.playCascade) {
                    clearInterval(poll);
                    resolve();
                }
            }, 50);
        });

        if (infoBlock) {
            observeElementInOut(infoBlock, {
                root: null,
                enterThreshold: 0.05,
                onEnter: async () => {
                    await waitForCascade();
                    const cascadeEl = section.querySelector('.animate-cascade');
                    if (cascadeEl && transitionHeader) transitionHeader(cascadeEl, 'enter');

                    if (wait && staggerTime) await wait(staggerTime);

                    const subtitles = section.querySelectorAll('.text-mask');
                    for (const sub of subtitles) {
                        sub.classList.add('is-visible');
                        if (wait && staggerTime) await wait(staggerTime);
                    }

                    section.querySelectorAll('.pdp-ticket-btn').forEach(b => b.classList.add('is-visible'));

                    if (wait && staggerTime) await wait(staggerTime);

                    const tags = section.querySelectorAll('.pdp-tag');
                    for (const tag of tags) {
                        if (!tag.classList.contains('max-qty-label')) tag.classList.add('is-visible');
                    }
                }
            });
        }

        if (descWrapper) {
            observeElementInOut(descWrapper, {
                root: null,
                enterThreshold: 0.05,
                onEnter: () => {
                    section.querySelectorAll('.type-body1, .type-body2').forEach(el => el.classList.add('is-visible'));
                }
            });
        }

        /* sticky purchase bar */
        if (title && ticketActions) {
            if (cta) {
                cta.classList.add('is-visible');
                const roll = cta.querySelector('.ui-roll');
                if (roll) roll.classList.add('is-visible');
            }

            const usesLenis = !document.documentElement.classList.contains('native-scroll');
            const scrollViewport = document.getElementById('scroll-viewport');
            if (usesLenis && scrollViewport) {
                document.body.appendChild(ticketActions);
            }

            const info = section.querySelector('.pdp-info');
            let prevBarH = 0;
            let rafId = 0;
            const syncPad = (scroll) => {
                if (!info || !ticketActions) return;
                const visible = ticketActions.classList.contains('is-sticky-visible');
                const h = visible ? ticketActions.offsetHeight : 0;
                info.style.paddingBottom = h ? h + 'px' : '';
                if (scroll && prevBarH > 0) {
                    const delta = h - prevBarH;
                    if (delta !== 0) {
                        if (window.lenis) window.lenis.scrollTo(window.lenis.scroll + delta, { immediate: true });
                        else window.scrollBy(0, delta);
                    }
                }
                prevBarH = h;
            };
            const pollHeight = () => { syncPad(true); rafId = requestAnimationFrame(pollHeight); };

            ticketActions.addEventListener('transitionstart', (e) => {
                if (e.propertyName !== 'padding-top') return;
                cancelAnimationFrame(rafId);
                rafId = requestAnimationFrame(pollHeight);
            });
            ticketActions.addEventListener('transitionend', (e) => {
                if (e.propertyName !== 'padding-top') return;
                cancelAnimationFrame(rafId);
                syncPad(true);
            });
            new ResizeObserver(() => syncPad(false)).observe(ticketActions);

            if (window.visualViewport) {
                const syncBottom = () => {
                    const offset = window.innerHeight - window.visualViewport.height - window.visualViewport.offsetTop;
                    ticketActions.style.bottom = Math.max(0, offset) + 'px';
                };
                window.visualViewport.addEventListener('resize', syncBottom);
                window.visualViewport.addEventListener('scroll', syncBottom);
            }

            const ioRoot = usesLenis ? (scrollViewport || null) : null;
            if (descWrapper) {
                observeElementInOut(descWrapper, {
                    root: ioRoot,
                    enterThreshold: 0.05,
                    repeat: true,
                    onEnter: () => { ticketActions.classList.add('is-sticky-visible'); syncPad(); },
                    onExit: () => { ticketActions.classList.remove('is-sticky-visible'); syncPad(); }
                });
            }
        }
    }

    /* image scroll (desktop) */

    function initImageScroll() {
        if (window.innerWidth <= MOBILE_BREAKPOINT) return;

        const col = document.querySelector('.pdp-image-col');
        const track = document.querySelector('.pdp-image-track');
        const desc = document.querySelector('.pdp-desc');
        const wrapper = document.querySelector('.pdp-sticky-wrapper');
        if (!col || !track) return;

        const LERP = 0.12;
        const SCALAR = 0.8;
        const DESC_SCALAR = 0.35;

        let targetY = 0;
        let currentY = 0;
        let rafId = null;

        function maxScroll() { return Math.max(0, track.offsetHeight - col.clientHeight); }
        function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

        function tick() {
            currentY += (targetY - currentY) * LERP;
            track.style.transform = `translate3d(0,${-currentY}px,0)`;
            if (Math.abs(targetY - currentY) > 0.1) {
                rafId = requestAnimationFrame(tick);
            } else {
                currentY = targetY;
                track.style.transform = `translate3d(0,${-currentY}px,0)`;
                rafId = null;
            }
        }

        function nudge(delta) {
            targetY = clamp(targetY + delta * SCALAR, 0, maxScroll());
            if (!rafId) rafId = requestAnimationFrame(tick);
        }

        if (wrapper) {
            wrapper.addEventListener('wheel', e => e.preventDefault(), { passive: false });
        }

        col.addEventListener('wheel', e => nudge(e.deltaY), { passive: true });

        if (desc) {
            desc.addEventListener('wheel', e => { desc.scrollTop += e.deltaY * DESC_SCALAR; }, { passive: true });
        }

        let touchY = 0;
        col.addEventListener('touchstart', e => { touchY = e.touches[0].clientY; }, { passive: true });
        col.addEventListener('touchmove', e => {
            const dy = touchY - e.touches[0].clientY;
            touchY = e.touches[0].clientY;
            nudge(dy);
        }, { passive: true });

        window.addEventListener('resize', () => {
            targetY = clamp(targetY, 0, maxScroll());
            currentY = targetY;
            track.style.transform = `translate3d(0,${-currentY}px,0)`;
        });
    }

    /* mobile image dots */

    function initMobileDots() {
        if (window.innerWidth > MOBILE_BREAKPOINT) return;

        const track = document.querySelector('.pdp-image-track');
        const container = document.querySelector('.pdp-dots');
        if (!track || !container) return;

        const posters = track.querySelectorAll('.pdp-poster');
        if (!posters.length) return;

        posters.forEach((_, i) => {
            const dot = document.createElement('span');
            dot.classList.add('pdp-dot');
            if (i === 0) dot.classList.add('is-active');
            container.appendChild(dot);
        });

        const dots = container.querySelectorAll('.pdp-dot');

        track.addEventListener('scroll', () => {
            const sl = track.scrollLeft;
            let active = 0;
            posters.forEach((p, i) => {
                if (Math.abs(p.offsetLeft - sl) < Math.abs(posters[active].offsetLeft - sl)) active = i;
            });
            dots.forEach((d, i) => d.classList.toggle('is-active', i === active));
        }, { passive: true });
    }

    /* init */

    document.addEventListener('DOMContentLoaded', () => {
        const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
        const section = document.querySelector('.pdp-section');
        if (!section) return;

        section.classList.add('is-active');

        initTicketTypes();
        initQtyButtons();
        initAddToCart();
        window.updateQty(0);

        if (isMobile) {
            initMobileAnimations(section);
        } else {
            initDesktopAnimations(section);
        }

        initImageScroll();
        initMobileDots();
    });
})();
