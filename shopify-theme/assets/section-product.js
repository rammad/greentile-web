/* PDP — Shopify theme adapted
   Reads product data from #product-json for cart integration.
   Preserves all original animation/scroll behavior. */

(function() {
    const section = document.querySelector('.pdp-section');
    if (!section) return;

    // Shopify product data
    let productData = null;
    const productJsonEl = document.getElementById('product-json');
    if (productJsonEl) {
        try { productData = JSON.parse(productJsonEl.textContent); } catch(e) {}
    }

    const maxQty = parseInt(document.querySelector('.main-product-wrapper')?.dataset?.maxQty) || 4;
    let qty = 1;
    let currentVariantId = null;

    const qtyEl = document.getElementById('ticket-qty');
    const maxMsg = document.getElementById('max-qty-msg');
    const buyBtn = document.getElementById('pdp-add-to-cart');
    const ticketBtns = section.querySelectorAll('.pdp-ticket-btn');

    // init variant from active button or first available
    const activeBtn = section.querySelector('.pdp-ticket-btn.active');
    if (activeBtn) {
        currentVariantId = parseInt(activeBtn.dataset.variantId);
    } else if (buyBtn) {
        currentVariantId = parseInt(buyBtn.dataset.variantId);
    }

    function updateQty(change) {
        const newQty = qty + change;
        if (newQty < 1 || newQty > maxQty) return;
        qty = newQty;
        if (qtyEl) qtyEl.textContent = qty;
        if (maxMsg) maxMsg.classList.toggle('is-visible', qty >= maxQty);
        updateBuyButton();
    }
    window.updateQty = updateQty;

    // qty buttons via data attributes
    section.querySelectorAll('[data-qty-change]').forEach(btn => {
        btn.addEventListener('click', () => {
            updateQty(parseInt(btn.dataset.qtyChange));
        });
    });

    function updateBuyButton() {
        if (!buyBtn) return;

        const active = section.querySelector('.pdp-ticket-btn.active');
        if (!active) return;

        const price = parseInt(active.dataset.price) || 0;
        const abbr = active.dataset.abbr || '';
        const variantId = parseInt(active.dataset.variantId);

        currentVariantId = variantId;
        buyBtn.dataset.variantId = variantId;

        const totalCents = price * qty;
        const formatted = productData
            ? (totalCents / 100).toLocaleString('en-US', { style: 'currency', currency: productData.currency || 'USD' })
            : `$${totalCents / 100}`;

        buyBtn.querySelectorAll('.buy-abbr').forEach(el => el.textContent = abbr);
        buyBtn.querySelectorAll('.buy-price').forEach(el => el.textContent = formatted);
    }

    ticketBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.disabled) return;
            ticketBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            qty = 1;
            if (qtyEl) qtyEl.textContent = qty;
            if (maxMsg) maxMsg.classList.remove('is-visible');
            updateBuyButton();
        });
    });

    // add to cart
    if (buyBtn) {
        buyBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (!currentVariantId) return;

            const routes = window.THEME_SETTINGS?.routes;
            const cartAddUrl = routes?.cartAdd || '/cart/add.js';

            buyBtn.style.pointerEvents = 'none';
            buyBtn.style.opacity = '0.6';

            try {
                const res = await fetch(cartAddUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        items: [{
                            id: currentVariantId,
                            quantity: qty
                        }]
                    })
                });

                if (!res.ok) throw new Error(res.status);

                window.location.href = routes?.cart || '/cart';
            } catch(err) {
                console.error('Add to cart failed:', err);
                buyBtn.style.pointerEvents = '';
                buyBtn.style.opacity = '';
            }
        });
    }

    // ── entrance animation (preserved from original) ──

    const { animate, waitForTransition, transitionHeader, transitionCta, observeElementInOut } = window.AnimationUtils || {};
    if (!animate) return;

    const imageCol = section.querySelector('.pdp-image-col');
    const infoCol = section.querySelector('.pdp-info');
    const descWrapper = section.querySelector('.pdp-desc-wrapper');
    const stickyWrapper = section.querySelector('.pdp-sticky-wrapper');

    const masks = section.querySelectorAll('.text-mask');
    const tags = section.querySelectorAll('.pdp-tag:not(.max-qty-label)');
    const posters = section.querySelectorAll('.pdp-poster');
    const bodyText = section.querySelectorAll('.type-body1, .type-body2');
    const cascadeTitle = section.querySelector('.animate-cascade');
    const ticketActions = section.querySelector('.ticket-actions');

    let headerDone = false;

    async function playEntrance() {
        if (headerDone) return;
        headerDone = true;

        const overlap = 150;

        for (const mask of masks) { await animate(mask, 'is-visible', overlap); }
        if (cascadeTitle && window.playCascade) await window.playCascade(cascadeTitle, overlap);

        ticketBtns.forEach((btn, i) => {
            setTimeout(() => {
                btn.classList.add('is-visible');
                const roll = btn.querySelector('.ui-roll');
                if (roll) roll.classList.add('is-visible');
            }, i * 80);
        });

        tags.forEach((tag, i) => {
            setTimeout(() => tag.classList.add('is-visible'), i * 60);
        });

        posters.forEach((p, i) => {
            setTimeout(() => p.classList.add('is-visible'), i * 100);
        });

        bodyText.forEach(el => el.classList.add('is-visible'));

        if (ticketActions) {
            setTimeout(() => ticketActions.classList.add('is-visible'), 300);
        }
    }

    if (imageCol) {
        observeElementInOut(imageCol, { onEnter: playEntrance });
    }
    if (infoCol) {
        observeElementInOut(infoCol, { onEnter: playEntrance });
    }

    // ── mobile image dots ──

    function initMobileDots() {
        if (window.innerWidth > 1024) return;
        const track = section.querySelector('.pdp-image-track');
        const dotsWrap = section.querySelector('.pdp-dots');
        if (!track || !dotsWrap || dotsWrap.children.length > 0) return;

        const images = track.querySelectorAll('.pdp-poster');
        if (images.length <= 1) return;

        images.forEach((_, i) => {
            const dot = document.createElement('span');
            dot.className = 'pdp-dot' + (i === 0 ? ' active' : '');
            dotsWrap.appendChild(dot);
        });

        track.addEventListener('scroll', () => {
            const scrollLeft = track.scrollLeft;
            const width = track.offsetWidth;
            const idx = Math.round(scrollLeft / width);
            dotsWrap.querySelectorAll('.pdp-dot').forEach((d, i) => {
                d.classList.toggle('active', i === idx);
            });
        });
    }

    initMobileDots();

    // ── desktop image scroll ──

    if (window.innerWidth > 1024 && imageCol) {
        const track = imageCol.querySelector('.pdp-image-track');
        if (track) {
            imageCol.addEventListener('wheel', (e) => {
                e.preventDefault();
                track.scrollTop += e.deltaY;
            }, { passive: false });
        }
    }

    // ── sticky bar (mobile) ──

    if (ticketActions && window.innerWidth <= 1024) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                ticketActions.classList.toggle('is-sticky-visible', !entry.isIntersecting);
            });
        }, { threshold: 0 });

        const descEl = section.querySelector('.pdp-desc');
        if (descEl) observer.observe(descEl);
    }
})();
