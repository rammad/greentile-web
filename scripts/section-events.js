/* =========================================
   STEP 3: EVENTS (Director Mode - Fixed CTA)
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
    if(!document.querySelector('.events-section')) return;
    initEventsDirector();
});

function initEventsDirector() {
    const section = document.querySelector('.events-section');
    const title = document.getElementById('event-title');
    const cards = document.querySelectorAll('.event-card');
    const btn = document.getElementById('event-btn');

    // SETUP CHARS
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

    let activeTimers = [];
    const addTimer = (fn, delay) => {
        const id = setTimeout(fn, delay);
        activeTimers.push(id);
    };
    const killAllTimers = () => {
        activeTimers.forEach(id => clearTimeout(id));
        activeTimers = [];
    };

    if(window.ScrollManager) {
        ScrollManager.addSteps([{
            id: 'events-enter',
            
            onEnter: (direction) => {
                section.classList.add('is-active');
                killAllTimers();

                // 1. Cascade IN
                window.playCascade(title);

                // 2. Shrink Title (1s)
                addTimer(() => title.classList.add('state-shrunk'), 1000);

                // 3. Show Content (1.8s)
                addTimer(() => {
                    // Show Cards
                    cards.forEach((card, i) => {
                        addTimer(() => card.classList.add('is-visible'), i * 100);
                    });
                    
                    // Show Button (Explicitly)
                    if(btn) {
                        // Force a reflow just in case
                        void btn.offsetWidth; 
                        btn.classList.remove('not-active');
                    }
                }, 1800);

                return 3000; 
            },

            onExit: (direction) => {
                killAllTimers();

                // Reverse Stagger
                const total = cards.length;
                cards.forEach((card, i) => {
                    const delay = (total - 1 - i) * 100;
                    addTimer(() => card.classList.remove('is-visible'), delay);
                });
                
                // Hide Button
                if(btn) btn.classList.add('not-active');

                // Cascade OUT
                addTimer(() => window.reverseCascade(title), 600);

                // Reset Position
                addTimer(() => title.classList.remove('state-shrunk'), 1400);

                if(direction === 'up') {
                    setTimeout(() => section.classList.remove('is-active'), 1400);
                }

                return 1400; 
            }
        }]);
    }
}