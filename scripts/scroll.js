/* =========================================
   SCROLL MANAGER (Hybrid System)
   ========================================= */

window.ScrollManager = {
    currentStep: 0,
    isLocked: false, 
    steps: [],      
    
    // Observer for "Natural" sections (nested inside a scroll wrapper)
    nestedObserver: null,

    init() {
        console.log("ScrollManager: Starting Hybrid System...");

        // 1. Setup Standard Inputs (Wheel/Touch)
        window.addEventListener('wheel', this.handleInput.bind(this), { passive: false });
        let touchStartY = 0;
        window.addEventListener('touchstart', e => touchStartY = e.touches[0].clientY, { passive: false });
        window.addEventListener('touchend', e => {
            const delta = touchStartY - e.changedTouches[0].clientY;
            if (Math.abs(delta) > 30) this.handleTouch(delta);
        }, { passive: false });

        // 2. Setup Nested Observer (For sections inside a Natural Scroll Wrapper)
        this.initNestedObserver();

        // 3. Init First Step (if exists)
        setTimeout(() => {
            if(this.steps.length > 0) {
                this.steps[0].onEnter('down');
            } else {
                document.body.style.overflow = "auto"; 
            }
        }, 100);
    },

    /* --- THE HYBRID REGISTRAR --- */
    addSteps(newSteps) {
        newSteps.forEach(step => {
            const el = document.getElementById(step.id);
            
            // ERROR CHECK
            if (!el) {
                console.warn(`ScrollManager: Element with id '${step.id}' not found. Skipping.`);
                return;
            }

            // CHECK CONTEXT: Is this element inside a Natural Scroll Wrapper?
            const wrapper = el.closest('.natural-scroll-section');

            if (wrapper) {
                // CASE A: NESTED (Plug-and-Play Mode)
                // We attach the logic to the element, but DO NOT add to main 'steps' array.
                // The IntersectionObserver will trigger these instead.
                console.log(`ScrollManager: Registered nested section '${step.id}'`);
                
                el._scrollLogic = {
                    onEnter: step.onEnter,
                    onExit: step.onExit,
                    isActive: false
                };
                
                // Start watching it
                this.nestedObserver.observe(el);

            } else {
                // CASE B: STANDALONE (Director Mode)
                // This is a top-level page step (like Hero or About).
                console.log(`ScrollManager: Registered main step '${step.id}'`);
                this.steps.push(step);
            }
        });

        // Re-sort main steps by DOM order to ensure flow matches HTML
        this.steps.sort((a, b) => {
            const elA = document.getElementById(a.id);
            const elB = document.getElementById(b.id);
            if(!elA || !elB) return 0;
            return (elA.compareDocumentPosition(elB) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1;
        });
    },

    /* --- NESTED OBSERVER LOGIC --- */
    initNestedObserver() {
        const options = { threshold: 0.25 }; // Trigger when 25% visible
        
        this.nestedObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const el = entry.target;
                if (!el._scrollLogic) return;

                if (entry.isIntersecting && !el._scrollLogic.isActive) {
                    // ENTER
                    el._scrollLogic.isActive = true;
                    // We pass 'down' as default direction for natural scrolling
                    el._scrollLogic.onEnter('down'); 
                } 
                else if (!entry.isIntersecting && el._scrollLogic.isActive) {
                    // EXIT (Optional: Reset if you want them to play again when scrolling back up)
                    // You can comment this out if you want animations to only play once.
                    el._scrollLogic.isActive = false;
                    el._scrollLogic.onExit('up');
                }
            });
        }, options);
    },

    /* --- INPUT HANDLING (Main Steps) --- */
    handleInput(e) {
        if (this.isLocked) { e.preventDefault(); return; }

        const delta = e.deltaY;
        const target = e.target;
        
        // CHECK: Are we scrolling INSIDE a natural wrapper?
        const scrollContainer = target.closest('.scrollable-content');
        
        if (scrollContainer) {
            // Allow native scroll until we hit the edge
            const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
            const isAtTop = scrollTop <= 0;
            const isAtBottom = Math.ceil(scrollTop + clientHeight) >= scrollHeight;

            if ((delta > 0 && !isAtBottom) || (delta < 0 && !isAtTop)) {
                // Allow default scroll, don't trigger step change
                return; 
            }
        }

        // If we are at the edge, OR not in a container, trigger Main Step Change
        e.preventDefault();
        if (delta > 5) this.trigger(1);
        else if (delta < -5) this.trigger(-1);
    },

    handleTouch(delta) {
        if (this.isLocked) return;
        this.trigger(delta > 0 ? 1 : -1);
    },

    async trigger(direction) {
        const nextIndex = this.currentStep + direction;
        if (nextIndex < 0 || nextIndex >= this.steps.length) return;

        this.isLocked = true;
        const currentScene = this.steps[this.currentStep];
        const nextScene = this.steps[nextIndex];
        const dirStr = direction > 0 ? 'down' : 'up';

        await currentScene.onExit(dirStr);
        
        // Deactivate all sections generically
        document.querySelectorAll('section').forEach(s => s.classList.remove('is-active'));
        
        await nextScene.onEnter(dirStr);

        this.currentStep = nextIndex;
        this.isLocked = false;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.ScrollManager.init();
});