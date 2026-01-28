/* =========================================
   GLOBAL UTILITIES
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initCTA();
    initSmoothMotion();
    
    // 1. Initialize Text Animations (Structure-Aware)
    initCascadeReveal();
    
    // 2. Initialize Marquees
    // Socials: Images (Needs manual .push-down class in HTML for stagger)
    new MarqueeManager('.socials-track', 60); 

    // Footer: Text
    new MarqueeManager('.marquee-content', 100); 

    // 3. Trigger Nav Load
    setTimeout(() => {
        const nav = document.querySelector('nav');
        if(nav) nav.classList.add('nav-loaded');
    }, 100);
});

/**
 * 1. TEXT REVEAL (Structure-Aware Splitter)
 * Preserves <span> wrappers for mobile layout while splitting chars
 */
function initCascadeReveal() {
    const targets = document.querySelectorAll('.animate-cascade');
    
    targets.forEach(el => {
        if(el.classList.contains('is-initialized')) return;

        // Helper: Splits text inside a specific node
        const splitTextInNode = (node) => {
            const text = node.innerText;
            node.innerHTML = ''; // Clear ONLY this node
            
            text.split('').forEach((char, i) => {
                const span = document.createElement('span');
                span.classList.add('char-reveal');
                // Preserve spaces to prevent word collapse
                if (char === ' ') {
                    span.innerHTML = '&nbsp;';
                } else {
                    span.innerText = char;
                }
                node.appendChild(span);
            });
        };

        // CHECK STRUCTURE: Does it have direct children (like Hero/Footer spans)?
        if (el.children.length > 0) {
            // YES: Keep the wrappers, split inside them
            Array.from(el.children).forEach(child => {
                splitTextInNode(child);
            });
        } else {
            // NO: Just text, split the parent
            splitTextInNode(el);
        }
        
        el.classList.add('is-initialized');
    });
}

/**
 * 2. ANIMATION HELPERS (Window Scope)
 */
window.playCascade = (element) => {
    if (!element) return;
    const chars = element.querySelectorAll('.char-reveal');
    chars.forEach((char, index) => {
        char.style.transitionDelay = `${index * 30}ms`;
        char.classList.add('is-visible');
    });
};

window.reverseCascade = (element) => {
    if (!element) return;
    const chars = element.querySelectorAll('.char-reveal');
    const total = chars.length;
    chars.forEach((char, index) => {
        const delay = (total - index) * 20; 
        char.style.transitionDelay = `${delay}ms`;
        char.classList.remove('is-visible');
    });
};

/**
 * 3. MARQUEE MANAGER (Seamless Loop + Odd Count Fix)
 */
class MarqueeManager {
    constructor(selector, speed = 50) {
        this.tracks = document.querySelectorAll(selector);
        this.speed = speed; 
        this.init();
    }

    init() {
        this.tracks.forEach(track => {
            let originalContent = Array.from(track.children);
            if (originalContent.length === 0) return;

            // A. PARITY CHECK (Fixes the "Seam" issue for staggered layouts)
            // If we have an odd number of items, duplicate the set once to make it even.
            if (originalContent.length % 2 !== 0) {
                const fragment = document.createDocumentFragment();
                originalContent.forEach(child => fragment.appendChild(child.cloneNode(true)));
                track.appendChild(fragment);
                originalContent = Array.from(track.children); // Update reference
            }

            // B. MEASURE ONE FULL SET (Width of content + gaps)
            // We clone it temporarily to measure the true rendered width
            const measureDiv = document.createElement('div');
            measureDiv.style.display = 'flex';
            measureDiv.style.gap = getComputedStyle(track).gap;
            measureDiv.style.visibility = 'hidden';
            measureDiv.style.position = 'absolute';
            measureDiv.style.whiteSpace = 'nowrap'; // Ensure it doesn't wrap
            
            originalContent.forEach(child => measureDiv.appendChild(child.cloneNode(true)));
            document.body.appendChild(measureDiv);
            
            const singleSetWidth = measureDiv.offsetWidth;
            const gap = parseFloat(getComputedStyle(track).gap) || 0;
            document.body.removeChild(measureDiv);

            // C. CALCULATE CLONES NEEDED
            // We need enough width to cover the screen PLUS one full buffer set
            const screenWidth = window.innerWidth;
            const setsNeeded = Math.ceil(screenWidth / (singleSetWidth + gap)) + 1;

            // D. FILL TRACK
            track.innerHTML = '';
            const fragment = document.createDocumentFragment();
            
            // Add (Original + Clones)
            for (let i = 0; i <= setsNeeded; i++) {
                originalContent.forEach(child => {
                    const clone = child.cloneNode(true);
                    fragment.appendChild(clone);
                });
            }
            track.appendChild(fragment);

            // E. ANIMATE
            // We animate exactly the width of the SINGLE SET (plus one gap)
            // When it finishes, it snaps back to 0, where an identical copy sits.
            const moveDistance = singleSetWidth + gap;
            
            track.style.setProperty('--marquee-end', `-${moveDistance}px`);
            
            const duration = moveDistance / this.speed; 
            track.style.setProperty('--marquee-duration', `${duration}s`);
            
            track.classList.add('has-seamless-animation');
        });
    }
}

/**
 * 4. NAVBAR LOGIC
 */
function initNavbar() {
    const nav = document.querySelector('.sticky-nav');
    if (!nav) return;
    const links = nav.querySelectorAll('a');
    let scrollTimer;

    links.forEach(link => {
        if (link.children.length === 0) {
            link.innerText = link.innerText; // Simple fallback
        }
    });

    window.addEventListener('scroll', () => {
        nav.classList.add('nav-hidden');
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
            nav.classList.remove('nav-hidden');
        }, 500);
    }, { passive: true });
}

/**
 * 5. CTA BUTTON LOGIC
 */
function initCTA() {
    const btns = document.querySelectorAll('.cta-btn');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const btn = entry.target;
            if (btn.classList.contains('manual-control')) return;
            entry.isIntersecting ? btn.classList.remove('not-active') : btn.classList.add('not-active');
        });
    }, { threshold: 0.5 });

    btns.forEach(btn => {
        btn.classList.add('not-active');
        if (!btn.classList.contains('about-persistent-cta')) {
            observer.observe(btn);
        }
    });
}

/**
 * 6. SMOOTH MOTION (Mouse Tracker)
 */
function initSmoothMotion() {
    const images = document.querySelectorAll('.scatter-img');
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function animate() {
        images.forEach(img => {
            const rect = img.getBoundingClientRect();
            if (rect.bottom < -100 || rect.top > window.innerHeight + 100) return;

            const imgX = rect.left + rect.width / 2;
            const imgY = rect.top + rect.height / 2;
            const dx = mouseX - imgX;
            const dy = mouseY - imgY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const radius = 750;
            
            if (dist < radius) {
                const force = (radius - dist) / radius;
                img.style.setProperty('--avoid-x', `${(-dx * force * 0.15).toFixed(2)}px`);
                img.style.setProperty('--avoid-y', `${(-dy * force * 0.15).toFixed(2)}px`);
            } else {
                img.style.setProperty('--avoid-x', `0px`);
                img.style.setProperty('--avoid-y', `0px`);
            }
        });
        requestAnimationFrame(animate);
    }
    animate();
}