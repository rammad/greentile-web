/**
 * SCROLL ENGINE
 * A reusable class that handles the heavy lifting of scroll math.
 * It calculates progress and passes it to a callback function.
 */
class ScrollAnimator {
    constructor(targetSelector, onUpdate) {
        this.target = document.querySelector(targetSelector);
        if (!this.target) return;

        // The function to run every frame (defined in animations.js)
        this.onUpdate = onUpdate;

        this.update = this.update.bind(this);
        window.addEventListener('scroll', this.update, { passive: true });
        window.addEventListener('resize', this.update);
        
        this.update(); // Initial check
    }

    update() {
        const rect = this.target.getBoundingClientRect();
        const windowHeight = window.innerHeight;

        // 1. NORMAL SCROLL PROGRESS (0.0 to 1.0)
        // Good for fading things in as they enter the screen.
        const startOffset = windowHeight * 0.9; 
        const endOffset = windowHeight * 0.2;
        let scrollProgress = (startOffset - rect.top) / (startOffset - endOffset);
        scrollProgress = Math.min(Math.max(scrollProgress, 0), 1);

        // 2. STICKY PROGRESS (0.0 to 1.0)
        // Good for pinned sections. Calculates based on how deep we are into the track.
        const totalDistance = rect.height - windowHeight;
        let stickyProgress = (rect.top * -1) / totalDistance;
        stickyProgress = Math.min(Math.max(stickyProgress, 0), 1);

        // 3. HAND OFF DATA
        // We pass these numbers to your custom logic
        if (this.onUpdate) {
            this.onUpdate({ 
                target: this.target, 
                scrollProgress: scrollProgress, 
                stickyProgress: stickyProgress 
            });
        }
    }
}

// Make it available globally so animations.js can see it
window.ScrollAnimator = ScrollAnimator;