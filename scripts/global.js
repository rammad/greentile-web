/* =========================================
   GLOBAL UTILITIES (The Toolbelt)
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initCTA();
    
    // 1. Initialize Text Animations (Structure-Aware)
    // This is global because any section might use .animate-cascade
    initCascadeReveal();

    // 2. Trigger Nav Load
    setTimeout(() => {
        const nav = document.querySelector('nav');
        if(nav) nav.classList.add('nav-loaded');
    }, 100);
});

/* =========================================
   TOOLS (Available to all sections)
   ========================================= */

/**
 * TEXT REVEAL (Structure-Aware Splitter)
 */
function initCascadeReveal() {
    const targets = document.querySelectorAll('.animate-cascade');
    
    targets.forEach(el => {
        if(el.classList.contains('is-initialized')) return;

        const splitTextInNode = (node) => {
            const text = node.innerText;
            node.innerHTML = ''; 
            text.split('').forEach((char, i) => {
                const span = document.createElement('span');
                span.classList.add('char-reveal');
                if (char === ' ') span.innerHTML = '&nbsp;';
                else span.innerText = char;
                node.appendChild(span);
            });
        };

        if (el.children.length > 0) {
            Array.from(el.children).forEach(child => splitTextInNode(child));
        } else {
            splitTextInNode(el);
        }
        el.classList.add('is-initialized');
    });
}

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
 * MARQUEE MANAGER
 */
class MarqueeManager {
    constructor(selector, speed = 50, autoStagger = false) {
        this.selector = selector;
        this.speed = speed; 
        this.autoStagger = autoStagger;
        
        document.fonts.ready.then(() => {
            this.init();
        });
    }

    init() {
        const tracks = document.querySelectorAll(this.selector);
        
        tracks.forEach(track => {
            if(track.classList.contains('is-initialized')) return;

            let originalContent = Array.from(track.children);
            if (originalContent.length === 0) return;

            // Parity Check
            if (originalContent.length % 2 !== 0) {
                const fragment = document.createDocumentFragment();
                originalContent.forEach(child => fragment.appendChild(child.cloneNode(true)));
                track.appendChild(fragment);
                originalContent = Array.from(track.children);
            }

            // Auto-Stagger
            if (this.autoStagger) {
                originalContent.forEach((child, index) => {
                    if (index % 2 !== 0) child.classList.add('push-down');
                    else child.classList.remove('push-down');
                });
            }

            // Measure
            const measureDiv = document.createElement('div');
            const trackStyle = window.getComputedStyle(track);
            measureDiv.style.display = 'flex';
            measureDiv.style.width = 'max-content';
            measureDiv.style.visibility = 'hidden';
            measureDiv.style.position = 'absolute';
            measureDiv.style.gap = trackStyle.gap || trackStyle.columnGap;
            measureDiv.style.fontFamily = trackStyle.fontFamily;
            measureDiv.style.fontSize = trackStyle.fontSize;
            measureDiv.style.fontWeight = trackStyle.fontWeight;
            measureDiv.style.letterSpacing = trackStyle.letterSpacing;
            measureDiv.style.textTransform = trackStyle.textTransform;
            
            originalContent.forEach(child => measureDiv.appendChild(child.cloneNode(true)));
            document.body.appendChild(measureDiv);
            const singleSetWidth = measureDiv.getBoundingClientRect().width;
            const gap = parseFloat(trackStyle.gap || trackStyle.columnGap) || 0;
            document.body.removeChild(measureDiv);

            // Clone
            const screenWidth = window.innerWidth;
            const setsNeeded = Math.ceil(screenWidth / (singleSetWidth + gap)) + 1;

            track.innerHTML = '';
            const fragment = document.createDocumentFragment();
            for (let i = 0; i <= setsNeeded; i++) {
                originalContent.forEach(child => {
                    const clone = child.cloneNode(true);
                    fragment.appendChild(clone);
                });
            }
            track.appendChild(fragment);

            // Animate
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
 * NAVBAR LOGIC
 */
function initNavbar() {
    const nav = document.querySelector('.sticky-nav');
    if (!nav) return;
    const links = nav.querySelectorAll('a');
    let scrollTimer;

    links.forEach(link => {
        if (link.children.length === 0) link.innerText = link.innerText; 
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
 * CTA BUTTON LOGIC
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