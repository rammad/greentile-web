/* =========================================
   SCROLL MANAGER (Hybrid Mode)
   Handles both "Director" steps AND internal scrolling.
   ========================================= */

window.ScrollManager = {
    currentStep: 0,
    isLocked: false, 
    steps: [],      

    init() {
        console.log("ScrollManager: Starting Hybrid Mode...");

        // 1. LISTEN FOR INPUT
        window.addEventListener('wheel', this.handleInput.bind(this), { passive: false });
        
        // Touch Logic
        let touchStartY = 0;
        window.addEventListener('touchstart', e => touchStartY = e.touches[0].clientY, { passive: false });
        window.addEventListener('touchend', e => {
            const touchEndY = e.changedTouches[0].clientY;
            const delta = touchStartY - touchEndY;
            if (Math.abs(delta) > 30) this.handleTouch(delta);
        }, { passive: false });

        // 2. INITIALIZE FIRST STEP
        setTimeout(() => {
            if(this.steps.length > 0) {
                this.steps[0].onEnter('down');
            } else {
                document.body.style.overflow = "auto"; 
            }
        }, 300);
    },

    addSteps(newSteps) {
        this.steps = this.steps.concat(newSteps);
    },

    /* --- THE GATEKEEPER --- */
    handleInput(e) {
        if (this.isLocked) {
            e.preventDefault();
            return;
        }

        const delta = e.deltaY;
        const target = e.target;

        // 1. CHECK FOR INTERNAL SCROLL ZONES
        const scrollContainer = target.closest('.scrollable-content');

        if (scrollContainer) {
            const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
            const isAtTop = scrollTop <= 0;
            const isAtBottom = Math.ceil(scrollTop + clientHeight) >= scrollHeight;

            // SCROLLING DOWN
            if (delta > 0) {
                if (!isAtBottom) {
                    // Allow native scroll (don't preventDefault)
                    // The user is scrolling CONTENT, not SECTIONS
                    return; 
                }
            } 
            // SCROLLING UP
            else if (delta < 0) {
                if (!isAtTop) {
                    // Allow native scroll
                    return; 
                }
            }
        }

        // 2. DIRECTOR MODE (If we passed the checks above)
        e.preventDefault(); // Stop browser from scrolling

        // Threshold check to avoid jitter
        if (delta > 5) this.trigger(1);
        else if (delta < -5) this.trigger(-1);
    },

    /* --- TOUCH HANDLER (Same Logic) --- */
    handleTouch(delta) {
        if (this.isLocked) return;

        // Note: Touch events target the element you started on.
        // We can check the active element, but for simplicity, 
        // we usually rely on the 'wheel' logic or just trigger 
        // if the user swipes hard enough on the body.
        
        // Simple Direction Trigger for now:
        this.trigger(delta > 0 ? 1 : -1);
    },

    trigger(direction) {
        const nextIndex = this.currentStep + direction;

        // Bounds Check
        if (nextIndex < 0 || nextIndex >= this.steps.length) return;

        this.isLocked = true;
        const currentScene = this.steps[this.currentStep];
        const nextScene = this.steps[nextIndex];

        // 1. EXIT
        const exitDuration = currentScene.onExit(direction > 0 ? 'down' : 'up');

        // 2. ENTER
        setTimeout(() => {
            document.querySelectorAll('section').forEach(s => s.classList.remove('is-active'));
            const enterDuration = nextScene.onEnter(direction > 0 ? 'down' : 'up');
            
            // 3. UNLOCK
            const totalLockTime = Math.max(exitDuration, enterDuration, 600); 
            setTimeout(() => {
                this.currentStep = nextIndex;
                this.isLocked = false;
            }, totalLockTime);

        }, 50); 
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.ScrollManager.init();
});