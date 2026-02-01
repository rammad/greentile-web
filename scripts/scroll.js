/* =========================================
   SCROLL MANAGER (Ghost Fix Edition)
   ========================================= */

window.ScrollManager = {
    currentStep: 0,
    isLocked: false, 
    steps: [],      
    
    // Trackers for the "Natural" sections
    nestedObserver: null,
    nestedEls: [], // <--- NEW: Keep track of nested elements

    init() {
        console.log("ScrollManager: Starting Hybrid System...");

        window.addEventListener('wheel', this.handleInput.bind(this), { passive: false });
        let touchStartY = 0;
        window.addEventListener('touchstart', e => touchStartY = e.touches[0].clientY, { passive: false });
        window.addEventListener('touchend', e => {
            const delta = touchStartY - e.changedTouches[0].clientY;
            if (Math.abs(delta) > 30) this.handleTouch(delta);
        }, { passive: false });

        // Init First Step
        setTimeout(() => {
            if(this.steps.length > 0) {
                this.steps[0].onEnter('down');
            } else {
                document.body.style.overflow = "auto"; 
            }
        }, 100);
    },

    addSteps(newSteps) {
        newSteps.forEach(step => {
            const el = document.getElementById(step.id);
            if (!el) {
                console.warn(`ScrollManager: Element with id '${step.id}' not found.`);
                return;
            }

            // Check PARENT to prevent self-detection
            const wrapper = el.parentElement ? el.parentElement.closest('.natural-scroll-section') : null;

            if (wrapper) {
                // CASE A: NESTED
                console.log(`ScrollManager: Registered nested section '${step.id}'`);
                el.classList.add('relative-mode');
                
                el._scrollLogic = {
                    onEnter: step.onEnter,
                    onExit: step.onExit,
                    isActive: false
                };
                
                // Track it so we can wake it up later
                this.nestedEls.push(el);

                if(!this.nestedObserver) this.initNestedObserver();
                this.nestedObserver.observe(el);

            } else {
                // CASE B: MAIN STEP
                console.log(`ScrollManager: Registered main step '${step.id}'`);
                this.steps.push(step);
            }
        });

        // Sort main steps
        this.steps.sort((a, b) => {
            const elA = document.getElementById(a.id);
            const elB = document.getElementById(b.id);
            if(!elA || !elB) return 0;
            return (elA.compareDocumentPosition(elB) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1;
        });
    },

    initNestedObserver() {
        const options = { threshold: 0.75 };
        
        this.nestedObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const el = entry.target;
                if (!el._scrollLogic) return;

                // --- FIX PART 1: THE GUARD CLAUSE ---
                // If the parent wrapper is not active (invisible), IGNORE this intersection.
                const wrapper = el.closest('.natural-scroll-section');
                if (wrapper && !wrapper.classList.contains('is-active')) return;

                if (entry.isIntersecting && !el._scrollLogic.isActive) {
                    el._scrollLogic.isActive = true;
                    el._scrollLogic.onEnter('down'); 
                } 
                else if (!entry.isIntersecting && el._scrollLogic.isActive) {
                    el._scrollLogic.isActive = false;
                    el._scrollLogic.onExit('up');
                }
            });
        }, options);
    },

    handleInput(e) {
        if (this.isLocked) {
            e.preventDefault();
            return;
        }

        const delta = e.deltaY;
        const target = e.target;
        const scrollContainer = target.closest('.scrollable-content');

        // --- THE FIX ---
        // Only allow native scrolling if the container is actually ACTIVE.
        // If it's hidden (opacity: 0), we should ignore it and trigger the main step transition instead.
        const isActiveContainer = scrollContainer && scrollContainer.classList.contains('is-active');

        if (isActiveContainer) {
            const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
            const isAtTop = scrollTop <= 0;
            const isAtBottom = Math.ceil(scrollTop + clientHeight) >= scrollHeight;

            // If we can scroll natively in this active container, let it happen
            if (delta > 0 && !isAtBottom) return; 
            if (delta < 0 && !isAtTop) return; 
        }

        // Otherwise, trigger the page transition
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

        // --- CLEANUP NESTED CHILDREN ---
        const currentEl = document.getElementById(currentScene.id);
        if (currentEl && currentEl.classList.contains('natural-scroll-section')) {
            this.nestedEls.forEach(nested => {
                // Check if this child belongs to the wrapper we just left
                if (nested.closest('.natural-scroll-section') === currentEl) {
                    if (nested._scrollLogic && nested._scrollLogic.isActive) {
                        // Manually trigger exit and reset state
                        nested._scrollLogic.onExit(dirStr);
                        nested._scrollLogic.isActive = false; 
                    }
                }
            });
        }

        document.querySelectorAll('section').forEach(s => s.classList.remove('is-active'));
        
        await nextScene.onEnter(dirStr);

        // --- FIX PART 2: THE WAKE UP CALL ---
        // We just made a section active. Check if it's a Wrapper.
        // If it is, we must restart the observers for its children so they realize they are visible.
        const activeEl = document.getElementById(nextScene.id);
        if (activeEl) {
            this.nestedEls.forEach(el => {
                // If this child belongs to the newly active wrapper...
                if (el.closest('.natural-scroll-section') === activeEl) {
                    // ...Toggle the observer to force an update immediately
                    this.nestedObserver.unobserve(el);
                    this.nestedObserver.observe(el);
                }
            });
        }

        this.currentStep = nextIndex;
        this.isLocked = false;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.ScrollManager.init();
});