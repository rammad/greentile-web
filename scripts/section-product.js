/* =========================================
   PAGE: PRODUCT DETAIL
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. ACTIVATE SECTION
    const section = document.querySelector('.pdp-section');
    if (section) {
        setTimeout(() => {
            section.classList.add('is-active');
        }, 100);
    }

    // 2. ANIMATE TITLE (Cascade)
    const title = document.querySelector('.animate-cascade');
    if (title && window.playCascade) {
        setTimeout(() => {
             window.playCascade(title);
        }, 200);
    }

    // 3. ANIMATE BODY TEXT
    const blurElements = document.querySelectorAll('.blur-fade-text');
    if (blurElements.length > 0) {
        blurElements.forEach((el, index) => {
            setTimeout(() => {
                el.classList.add('is-visible');
            }, 600 + (index * 100)); 
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

/* INTERACTION LOGIC */
let qty = 1;
window.updateQty = function(change) {
    const qtyDisplay = document.getElementById('ticket-qty');
    if (!qtyDisplay) return;
    qty += change;
    if (qty < 1) qty = 1;
    if (qty > 10) qty = 10; 
    qtyDisplay.innerText = qty;
}