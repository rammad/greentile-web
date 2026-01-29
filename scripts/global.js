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
    // Socials: Images -> Pass 'true' for auto-stagger
    new MarqueeManager('.socials-track', 60, true); 

    // Footer: Text -> Pass 'false' (no stagger)
    new MarqueeManager('.marquee-content', 100, false); 

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
                if (char === ' ') {
                    span.innerHTML = '&nbsp;';
                } else {
                    span.innerText = char;
                }
                node.appendChild(span);
            });
        };

        if (el.children.length > 0) {
            Array.from(el.children).forEach(child => {
                splitTextInNode(child);
            });
        } else {
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
 * 3. MARQUEE MANAGER (Seamless Loop + Auto-Stagger + Font Safety)
 */
class MarqueeManager {
    constructor(selector, speed = 50, autoStagger = false) {
        this.selector = selector;
        this.speed = speed; 
        this.autoStagger = autoStagger;
        
        // FIX: Wait for fonts to load before measuring text width
        document.fonts.ready.then(() => {
            this.init();
        });
    }

    init() {
        const tracks = document.querySelectorAll(this.selector);
        
        tracks.forEach(track => {
            // Prevent double-init if fonts load twice
            if(track.classList.contains('is-initialized')) return;

            let originalContent = Array.from(track.children);
            if (originalContent.length === 0) return;

            // A. PARITY CHECK (Even number of items)
            if (originalContent.length % 2 !== 0) {
                const fragment = document.createDocumentFragment();
                originalContent.forEach(child => fragment.appendChild(child.cloneNode(true)));
                track.appendChild(fragment);
                originalContent = Array.from(track.children);
            }

            // B. AUTO-STAGGER (Push-down pattern)
            if (this.autoStagger) {
                originalContent.forEach((child, index) => {
                    if (index % 2 !== 0) {
                        child.classList.add('push-down');
                    } else {
                        child.classList.remove('push-down');
                    }
                });
            }

            // C. MEASURE ONE FULL SET (High Precision)
            const measureDiv = document.createElement('div');
            const trackStyle = window.getComputedStyle(track);
            
            // Layout Safety: Ensure it measures as one long line
            measureDiv.style.display = 'flex';
            measureDiv.style.width = 'max-content';
            measureDiv.style.visibility = 'hidden';
            measureDiv.style.position = 'absolute';
            
            // Style Mirroring: Copy gap and font settings to ensure accuracy
            measureDiv.style.gap = trackStyle.gap || trackStyle.columnGap;
            measureDiv.style.fontFamily = trackStyle.fontFamily;
            measureDiv.style.fontSize = trackStyle.fontSize;
            measureDiv.style.fontWeight = trackStyle.fontWeight;
            measureDiv.style.letterSpacing = trackStyle.letterSpacing;
            measureDiv.style.textTransform = trackStyle.textTransform;
            
            originalContent.forEach(child => measureDiv.appendChild(child.cloneNode(true)));
            document.body.appendChild(measureDiv);
            
            // Precision Measurement
            const singleSetWidth = measureDiv.getBoundingClientRect().width;
            
            // Parse Gap safely
            const gap = parseFloat(trackStyle.gap || trackStyle.columnGap) || 0;
            
            document.body.removeChild(measureDiv);

            // D. CALCULATE CLONES NEEDED
            const screenWidth = window.innerWidth;
            const setsNeeded = Math.ceil(screenWidth / (singleSetWidth + gap)) + 1;

            // E. FILL TRACK
            track.innerHTML = '';
            const fragment = document.createDocumentFragment();
            
            for (let i = 0; i <= setsNeeded; i++) {
                originalContent.forEach(child => {
                    const clone = child.cloneNode(true);
                    fragment.appendChild(clone);
                });
            }
            track.appendChild(fragment);

            // F. ANIMATE
            const moveDistance = singleSetWidth + gap;
            
            track.style.setProperty('--marquee-end', `-${moveDistance}px`);
            
            const duration = moveDistance / this.speed; 
            track.style.setProperty('--marquee-duration', `${duration}s`);
            
            track.classList.add('has-seamless-animation');
            track.classList.add('is-initialized');
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
            link.innerText = link.innerText; 
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