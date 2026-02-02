/* =========================================
   PAGE: PRODUCT DETAIL (Async Animation)
   ========================================= */
(() => {
    const { wait, staggerTime } = window.AnimationUtils;

    document.addEventListener('DOMContentLoaded', () => {
        initProductPage();
    });

    async function initProductPage() {
        

        // 1. ACTIVATE SECTION (Background Fade)
        const section = document.querySelector('.pdp-section');
        if (section) section.classList.add('is-active');

        // 2. ANIMATE TITLE (Wait for Global JS Init)
        const title = document.querySelector('.animate-cascade');
        if (title) {
            // Simple polling to ensure global.js has split the text
            const checkInit = setInterval(async () => {
                if (title.classList.contains('is-initialized') && window.playCascade) {
                    clearInterval(checkInit);
                    await window.playCascade(title);
                }
            }, 50);
        }

        await wait(staggerTime)

        const subtTitles = section.querySelectorAll('.pdp-tag');
        if (subtTitles.length > 0) {
            for (const subt of subtTitles) {
                subt.classList.add('is-visible');
            }
        }

        await wait(staggerTime);
        
        const poster = document.querySelector('.pdp-poster');
        if (poster) poster.classList.add('is-visible');

        // 4. TEXT & DETAILS (Staggered)
        await wait(200);
        const textElements = document.querySelectorAll('.type-body1, .type-body2');
        if (textElements.length > 0) {
            for (const el of textElements) {
                el.classList.add('is-visible');
            }
        }
    }

    /* --- INTERACTION LOGIC (Ticket Qty) --- */
    let qty = 1;
    window.updateQty = function(change) {
        const qtyDisplay = document.getElementById('ticket-qty');
        if (!qtyDisplay) return;
        qty += change;
        if (qty < 1) qty = 1;
        if (qty > 4) qty = 4; 
        qtyDisplay.innerText = qty;
    }
})();