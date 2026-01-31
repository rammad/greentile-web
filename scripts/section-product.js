/* =========================================
   PAGE: PRODUCT DETAIL
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. ACTIVATE SECTION (Triggers UI Rolls)
    const section = document.querySelector('.pdp-section');
    if (section) {
        setTimeout(() => {
            section.classList.add('is-active');
        }, 100);
    }

    // 2. ANIMATE TITLE (Cascade)
    const title = document.querySelector('.animate-cascade');
    if (title) {
        const checkInit = setInterval(() => {
            if (title.classList.contains('is-initialized')) {
                clearInterval(checkInit);
                // Tiny delay to let the container settle
                setTimeout(() => {
                    if (window.playCascade) window.playCascade(title);
                }, 100);
            }
        }, 50);
    }

    // 3. ANIMATE BODY (Blur Fade Stagger)
    const blurElements = document.querySelectorAll('.blur-fade-text');
    if (blurElements.length > 0) {
        blurElements.forEach((el, index) => {
            setTimeout(() => {
                el.classList.add('is-visible');
            }, 600 + (index * 100)); // Start after title, stagger by 100ms
        });
    }

    // 4. REVEAL IMAGE
    const poster = document.querySelector('.pdp-poster');
    if (poster) {
        setTimeout(() => {
            poster.classList.add('is-visible');
        }, 400);
    }
});

/* =========================================
   INTERACTION LOGIC
   ========================================= */
let qty = 1;

function updateQty(change) {
    const qtyDisplay = document.getElementById('ticket-qty');
    if (!qtyDisplay) return;

    qty += change;
    
    if (qty < 1) qty = 1;
    if (qty > 10) qty = 10; 

    qtyDisplay.innerText = qty;
}

window.updateQty = updateQty;