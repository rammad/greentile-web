/* =========================================
   PAGE: PRODUCT DETAIL (Async Animation)
   ========================================= */
(() => {
    const { wait, transitionCta, transitionHeader, staggerTime } = window.AnimationUtils;

    document.addEventListener('DOMContentLoaded', () => {
        initProductPage();
        updateQty(0); // Initialize Qty Display
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
                    transitionHeader(title, 'enter');
                }
            }, 50);
        }

        await(staggerTime);

        const subtitles = document.querySelectorAll('.text-mask');
        if (subtitles.length > 0) {
            for (const sub of subtitles) {
                sub.classList.add('is-visible');
                await wait(staggerTime)
            }
        }

       

        const tags = section.querySelectorAll('.pdp-tag');
        if (tags.length > 0) {
            for (const subt of tags) {
                if (!subt.classList.contains('max-qty-label')) {
                    subt.classList.add('is-visible');
                }
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

        const cta = document.querySelector('.cta-btn');
        if(cta) transitionCta(cta, 'enter');
    }

    /* --- INTERACTION LOGIC (Ticket Qty) --- */
    let qty = 1;
    const MAX_QTY = 4;

    window.updateQty = function(change) {
        const qtyDisplay = document.getElementById('ticket-qty');
        const maxMsg = document.getElementById('max-qty-msg');
        
        if (!qtyDisplay) return;
        
        qty += change;
        
        // Clamp values
        if (qty < 1) qty = 1;
        if (qty > MAX_QTY) qty = MAX_QTY; 
        
        // Update Text
        qtyDisplay.innerText = qty;

        // Toggle Max Label
        if (qty === MAX_QTY) {
            if(maxMsg) maxMsg.classList.add('is-visible');
        } else {
            if(maxMsg) maxMsg.classList.remove('is-visible');
        }
    }
})();