/* =========================================
   SECTION: EVENTS
   Handles: Auto-Shrink Title, 4-Card Stagger Sequence
   Includes: Timeout Manager & Scroll Locking (Force Wait)
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
    if(!document.querySelector('.events-section')) return;
    initEventsAnimation();
});

function initEventsAnimation() {
    const title = document.getElementById('event-title');
    const cards = document.querySelectorAll('.event-card');
    const btn = document.getElementById('event-btn');
    
    // --- 1. SETUP: Build Characters ---
    if(title && !title.classList.contains('is-built')) {
        const text = title.innerText;
        title.innerHTML = '';
        text.split('').forEach((char, index) => {
            const span = document.createElement('span');
            span.classList.add('char-reveal');
            span.textContent = char;
            span.style.transitionDelay = `${index * 30}ms`;
            title.appendChild(span);
        });
        title.classList.add('is-built');
    }

    // --- 2. TIMEOUT MANAGER (Prevents overlaps) ---
    let activeTimers = [];

    const addTimer = (fn, delay) => {
        const id = setTimeout(fn, delay);
        activeTimers.push(id);
        return id;
    };

    const killAllTimers = () => {
        activeTimers.forEach(id => clearTimeout(id));
        activeTimers = [];
    };

    // --- 3. LOCK MANAGER (The "Force Wait") ---
    // We use this to freeze the user in place without removing the scrollbar
    const LockManager = {
        scrollTop: 0,
        scrollLeft: 0,
        isLocked: false,
        
        lock: function() {
            if (this.isLocked) return;
            this.isLocked = true;
            
            // Memorize exactly where we are
            this.scrollTop = window.scrollY || document.documentElement.scrollTop;
            this.scrollLeft = window.scrollX || document.documentElement.scrollLeft;
            
            // Force window to stay here
            window.onscroll = () => {
                window.scrollTo(this.scrollLeft, this.scrollTop);
            };
            
            // Visual cue (optional, useful for debugging or styling)
            document.body.classList.add('is-locked');
        },
        
        unlock: function() {
            if (!this.isLocked) return;
            this.isLocked = false;
            
            // Release control
            window.onscroll = null;
            document.body.classList.remove('is-locked');
        }
    };


    // State Tracking
    let currentState = 'idle'; 

    new ScrollAnimator('.events-section', (data) => {
        const p = data.stickyProgress;
        
        // ==============================================
        // ZONE 1: ENTRANCE (0.1 to 0.8)
        // ==============================================
        if (p >= 0.1 && p < 0.8) {
            
            if (currentState !== 'entering') {
                currentState = 'entering';
                
                // 1. FREEZE THE USER
                LockManager.lock();

                // 2. CLEAR OLD ANIMATIONS
                killAllTimers();

                // 3. START SEQUENCE
                window.playCascade(title);
                
                // A. Shrink Title (1s)
                addTimer(() => {
                    title.classList.add('state-shrunk');
                }, 1000);

                // B. Show Content (1.8s)
                addTimer(() => {
                    cards.forEach((card, i) => {
                        addTimer(() => {
                            card.classList.add('is-visible');
                        }, i * 100); 
                    });
                    
                    if(btn) btn.classList.remove('not-active');
                }, 1800);

                // C. UNLOCK USER (2.8s)
                // We wait for the last card to finish appearing + a tiny buffer
                // 1800ms (start) + 300ms (stagger) + 800ms (transition) = ~2900ms
                addTimer(() => {
                    LockManager.unlock();
                }, 2900);
            }

        } 
        // ==============================================
        // ZONE 2: EXIT (0.9+ or < 0.05)
        // ==============================================
        else if (p >= 0.9 || p < 0.05) {
            
            if (currentState !== 'exiting') {
                currentState = 'exiting';

                // Ensure we aren't locked if they refreshed/scrolled fast
                LockManager.unlock();
                killAllTimers();
                
                // Reverse Stagger Out
                const totalCards = cards.length;
                cards.forEach((card, i) => {
                    const delay = (totalCards - 1 - i) * 100;
                    addTimer(() => {
                        card.classList.remove('is-visible');
                    }, delay); 
                });

                if(btn) btn.classList.add('not-active');

                // Cascade Title Out
                addTimer(() => {
                    window.reverseCascade(title);
                }, 600); 

                // Reset Title Position
                addTimer(() => {
                    title.classList.remove('state-shrunk');
                }, 1400);
            }
        }
    });
}