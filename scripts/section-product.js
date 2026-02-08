/* product page */
(() => {
    const { wait, transitionCta, transitionHeader, staggerTime } = window.AnimationUtils;

    document.addEventListener('DOMContentLoaded', () => {
        initProductPage();
        updateQty(0);
    });

    async function initProductPage() {
        const section = document.querySelector('.pdp-section');
        if (section) section.classList.add('is-active');

        const title = document.querySelector('.animate-cascade');
        if (title) {
            const checkInit = setInterval(async () => {
                if (title.classList.contains('is-initialized') && window.playCascade) {
                    clearInterval(checkInit);
                    transitionHeader(title, 'enter');
                }
            }, 50);
        }

        await wait(staggerTime);

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

        const posters = document.querySelectorAll('.pdp-poster');
        if (posters.length > 0) posters.forEach( poster => {
            poster.classList.add('is-visible');
        })
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

    let qty = 1;
    const MAX_QTY = 4;

    window.updateQty = function(change) {
        const qtyDisplay = document.getElementById('ticket-qty');
        const maxMsg = document.getElementById('max-qty-msg');
        
        if (!qtyDisplay) return;
        
        qty += change;
        if (qty < 1) qty = 1;
        if (qty > MAX_QTY) qty = MAX_QTY; 
        
        qtyDisplay.innerText = qty;

        if (qty === MAX_QTY) {
            if(maxMsg) maxMsg.classList.add('is-visible');
        } else {
            if(maxMsg) maxMsg.classList.remove('is-visible');
        }
    }
})();