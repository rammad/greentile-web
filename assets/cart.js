/* cart drawer — global slide-out cart (sections/cart-drawer.liquid).

   Every cart mutation asks Shopify to re-render the cart-drawer section in the same request
   (Section Rendering API: `sections` on /cart/add.js and /cart/change.js, `?sections=` for a
   plain refresh), and the returned #cart-drawer-body replaces the current one. All line-item
   markup therefore lives in Liquid; this file only wires events and swaps HTML.

   Public API (window.Cart):
     open() / close() / isOpen()
     refresh()                         re-render from the current cart
     add(itemsOrFormData)              add to cart, re-render, open the drawer
     change(lineKey, quantity)         set a line's quantity (0 removes)
     productQuantity(productId)        total quantity of a product in the cart, all lines
     remainingFor(productId)           how many more of that product the limit allows
     maxQty                            per-product limit (theme setting cart_max_qty)

   Fires `cart:updated` on document with { itemCount } after every re-render. */

(() => {
    const SECTION_ID = 'cart-drawer';

    const panel = document.getElementById('cart-drawer');
    const backdrop = document.getElementById('cart-drawer-backdrop');
    if (!panel || !backdrop || !window.Drawer) return;

    const routes = (window.THEME_SETTINGS && window.THEME_SETTINGS.routes) || {};
    const rootUrl = routes.root || '/';
    const cartAddUrl = routes.cartAdd || '/cart/add.js';
    const cartChangeUrl = routes.cartChange || '/cart/change.js';
    const cartJsonUrl = (routes.cart || '/cart') + '.js';

    const maxQty = parseInt(panel.dataset.maxQty || '4', 10);

    const drawer = window.Drawer.create(panel, backdrop, { bodyClass: 'cart-is-open' });

    const getBody = () => document.getElementById('cart-drawer-body');

    /* rendering */

    function render(sectionHtml) {
        if (!sectionHtml) return;
        const doc = new DOMParser().parseFromString(sectionHtml, 'text/html');
        const fresh = doc.getElementById('cart-drawer-body');
        const current = getBody();
        if (!fresh || !current) return;
        current.replaceWith(fresh);
        syncCount(parseInt(fresh.dataset.itemCount || '0', 10));
    }

    function syncCount(count) {
        const suffix = count > 0 ? ' (' + count + ')' : '';

        document.querySelectorAll('[data-cart-count]').forEach(el => { el.textContent = suffix; });

        /* mobile menu link: animate-cascade has split its text into letters, so rewrite the
           whole label and let the cascade re-split it */
        let resplit = false;
        document.querySelectorAll('[data-cart-label]').forEach(el => {
            const text = el.dataset.cartLabel + suffix;
            if (el.textContent.trim() === text) return;
            el.textContent = text;
            el.classList.remove('is-initialized');
            resplit = true;
        });
        if (resplit && typeof window.initCascadeReveal === 'function') window.initCascadeReveal();

        document.dispatchEvent(new CustomEvent('cart:updated', { detail: { itemCount: count } }));
    }

    function setBusy(busy) {
        const body = getBody();
        if (body) body.classList.toggle('is-busy', busy);
    }

    function showError(message) {
        const status = document.getElementById('cart-drawer-status');
        if (!status) return;
        const text = status.querySelector('span');
        if (text) text.textContent = message || panel.dataset.errorMsg || 'Something went wrong — please try again';
        status.classList.add('is-visible');
    }

    /* requests */

    async function postJson(url, body) {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const err = new Error(data.description || data.message || ('Cart request failed: ' + res.status));
            err.status = res.status;
            throw err;
        }
        return data;
    }

    async function refresh() {
        const res = await fetch(rootUrl + '?sections=' + SECTION_ID);
        if (!res.ok) throw new Error('Cart refresh failed: ' + res.status);
        const data = await res.json();
        render(data[SECTION_ID]);
    }

    /* items: [{ id, quantity, properties? }] or a FormData from a product form (e.g. the
       attendee form's items[VID][...] fields) */
    async function add(items) {
        let data;
        if (items instanceof FormData) {
            items.append('sections', SECTION_ID);
            items.append('sections_url', window.location.pathname);
            const res = await fetch(cartAddUrl, {
                method: 'POST',
                headers: { Accept: 'application/json' },
                body: items
            });
            data = await res.json().catch(() => ({}));
            if (!res.ok) {
                const err = new Error(data.description || data.message || ('Add to cart failed: ' + res.status));
                err.status = res.status;
                throw err;
            }
        } else {
            data = await postJson(cartAddUrl, {
                items,
                sections: SECTION_ID,
                sections_url: window.location.pathname
            });
        }

        if (data.sections) render(data.sections[SECTION_ID]);
        else await refresh();

        drawer.open();
        return data;
    }

    async function change(lineKey, quantity) {
        setBusy(true);
        try {
            const data = await postJson(cartChangeUrl, {
                id: lineKey,
                quantity: Math.max(0, quantity),
                sections: SECTION_ID,
                sections_url: window.location.pathname
            });
            render(data.sections && data.sections[SECTION_ID]);
            return data;
        } catch (err) {
            console.error('Cart change failed:', err);
            setBusy(false);
            showError(err.status === 422 ? err.message : null);
            throw err;
        }
    }

    async function getCart() {
        const res = await fetch(cartJsonUrl, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error('Cart fetch failed: ' + res.status);
        return res.json();
    }

    async function productQuantity(productId) {
        const cart = await getCart();
        return cart.items
            .filter(item => String(item.product_id) === String(productId))
            .reduce((n, item) => n + item.quantity, 0);
    }

    async function remainingFor(productId) {
        return Math.max(0, maxQty - await productQuantity(productId));
    }

    /* events */

    /* quantity steppers and remove buttons — delegated, since the body is re-rendered */
    panel.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-cart-change]');
        if (!btn || btn.disabled) return;
        const line = btn.closest('[data-line-key]');
        if (!line) return;
        change(line.dataset.lineKey, parseInt(btn.dataset.cartChange, 10)).catch(() => {});
    });

    /* header / mobile menu "CART (n)" links and any [data-cart-trigger] */
    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('[data-cart-trigger]');
        if (!trigger) return;
        e.preventDefault();
        if (window.mobileMenu && window.mobileMenu.isOpen()) window.mobileMenu.close();
        if (drawer.isOpen()) drawer.close();
        else drawer.open();
    });

    /* #cart in the URL opens the drawer — same pattern as #contact / #tickets */
    function consumeHash() {
        if (window.location.hash !== '#cart') return;
        drawer.open();
        history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', consumeHash);
    } else {
        consumeHash();
    }
    window.addEventListener('hashchange', consumeHash);

    /* back from checkout via the browser's back button restores this page from bfcache with a
       stale cart */
    window.addEventListener('pageshow', (e) => {
        if (e.persisted) refresh().catch(err => console.error(err));
    });

    window.Cart = {
        open: () => drawer.open(),
        close: () => drawer.close(),
        isOpen: () => drawer.isOpen(),
        refresh,
        add,
        change,
        getCart,
        productQuantity,
        remainingFor,
        maxQty
    };
})();
