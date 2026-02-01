/* =========================================
   SCROLL MANAGER (Async / Await Edition)
   ========================================= */

window.ScrollManager = {
    currentStep: 0,
    isLocked: false, 
    steps: [],      

    init() {
        console.log("ScrollManager: Starting...");

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
                // We treat the first load as a "down" entry
                this.steps[0].onEnter('down');
            } else {
                document.body.style.overflow = "auto"; 
            }
        }, 300);
    },

    addSteps(newSteps) {
        this.steps = this.steps.concat(newSteps);
    },

    handleInput(e) {
        if (this.isLocked) {
            e.preventDefault();
            return;
        }

        const delta = e.deltaY;
        const target = e.target;
        const scrollContainer = target.closest('.scrollable-content');

        if (scrollContainer) {
            const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
            const isAtTop = scrollTop <= 0;
            const isAtBottom = Math.ceil(scrollTop + clientHeight) >= scrollHeight;

            if (delta > 0 && !isAtBottom) return; 
            if (delta < 0 && !isAtTop) return; 
        }

        e.preventDefault();
        if (delta > 5) this.trigger(1);
        else if (delta < -5) this.trigger(-1);
    },

    handleTouch(delta) {
        if (this.isLocked) return;
        this.trigger(delta > 0 ? 1 : -1);
    },

    /* --- THE ASYNC TRIGGER --- */
    async trigger(direction) {
        const nextIndex = this.currentStep + direction;
        if (nextIndex < 0 || nextIndex >= this.steps.length) return;

        this.isLocked = true; // Lock immediately
        
        const currentScene = this.steps[this.currentStep];
        const nextScene = this.steps[nextIndex];
        const dirStr = direction > 0 ? 'down' : 'up';

        // 1. EXIT CURRENT (Async)
        // If onExit is async, we wait. If not, it resolves instantly.
        await currentScene.onExit(dirStr);

        // 2. CLEAR ACTIVE CLASSES
        document.querySelectorAll('section').forEach(s => s.classList.remove('is-active'));
        
        // 3. ENTER NEXT (Async)
        // This is where we wait for your animation sequence!
        await nextScene.onEnter(dirStr);

        // 4. UNLOCK
        // Once the sequence is done, we unlock.
        this.currentStep = nextIndex;
        this.isLocked = false;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.ScrollManager.init();
});