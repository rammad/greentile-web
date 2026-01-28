/* =========================================
   SCROLL MANAGER (formerly Director)
   Manages the "Steps" of the website.
   ========================================= */

window.ScrollManager = {
    currentStep: 0,
    isLocked: false, 
    steps: [],      

    init() {
        console.log("ScrollManager: Starting...");

        // 1. LISTEN FOR INPUT (Wheel + Touch)
        // passive: false is CRITICAL for preventing native scroll
        window.addEventListener('wheel', this.handleInput.bind(this), { passive: false });
        
        let touchStartY = 0;
        window.addEventListener('touchstart', e => touchStartY = e.touches[0].clientY, { passive: false });
        window.addEventListener('touchend', e => {
            const touchEndY = e.changedTouches[0].clientY;
            const delta = touchStartY - touchEndY;
            if (Math.abs(delta) > 30) this.trigger(delta > 0 ? 1 : -1);
        }, { passive: false });

        // 2. INITIALIZE FIRST STEP
        // We check after a short delay to allow other scripts to register steps
        setTimeout(() => {
            console.log(`ScrollManager: Registered ${this.steps.length} steps.`);
            
            if(this.steps.length > 0) {
                // Activate the first step immediately
                this.steps[0].onEnter('down');
            } else {
                console.error("ScrollManager: No steps found! Unlocking native scroll.");
                document.body.style.overflow = "auto"; // Emergency Fallback
            }
        }, 300);
    },

    // Allow other scripts to add their logic
    addSteps(newSteps) {
        this.steps = this.steps.concat(newSteps);
    },

    handleInput(e) {
        // Prevent default browser scrolling
        e.preventDefault();
        
        if (this.isLocked) return;

        // TRACKPAD SENSITIVITY FIX
        // Trackpads give small deltaY (e.g., 4 or 5). Mice give large (100).
        // Threshold of 2 catches everything without misfiring on jitter.
        if (e.deltaY > 2) this.trigger(1);  
        else if (e.deltaY < -2) this.trigger(-1);
    },

    trigger(direction) {
        const nextIndex = this.currentStep + direction;

        // Bounds Check (Start/End)
        if (nextIndex < 0 || nextIndex >= this.steps.length) return;

        this.isLocked = true;
        const currentScene = this.steps[this.currentStep];
        const nextScene = this.steps[nextIndex];

        // 1. EXIT CURRENT
        const exitDuration = currentScene.onExit(direction > 0 ? 'down' : 'up');

        // 2. ENTER NEXT (Delayed overlap)
        setTimeout(() => {
            // Reset active classes
            document.querySelectorAll('section').forEach(s => s.classList.remove('is-active'));
            
            // Run Enter Logic
            const enterDuration = nextScene.onEnter(direction > 0 ? 'down' : 'up');
            
            // 3. UNLOCK INPUT
            const totalLockTime = Math.max(exitDuration, enterDuration, 600); 
            
            setTimeout(() => {
                this.currentStep = nextIndex;
                this.isLocked = false;
            }, totalLockTime);

        }, 100); // Overlap delay
    }
};

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.ScrollManager.init();
});