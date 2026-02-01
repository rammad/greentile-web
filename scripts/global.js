/* =========================================
   GLOBAL UTILITIES (The Toolbelt)
   ========================================= */

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/* --- CONFIGURATION --- */
// CHANGE THIS NUMBER to speed up or slow down the whole site's interaction feel.
const INTERACTION_LOCK_MS = 500; 

const waitForTransition = (element, overlap = 0) => {
    return new Promise(resolve => {
        if (!element) { resolve(); return; }
        const style = getComputedStyle(element);
        const duration = style.transitionDuration;
        const delay = style.transitionDelay;
        const toMs = (str) => {
            if (!str) return 0;
            return parseFloat(str) * (str.indexOf('ms') > -1 ? 1 : 1000);
        };
        const totalTime = toMs(duration) + toMs(delay);
        let waitTime = Math.max(0, totalTime - overlap);

        if (!totalTime || totalTime === 0) resolve();
        else setTimeout(resolve, waitTime + (overlap > 0 ? 0 : 10));
    });
};

const animate = async (element, className = 'is-visible', overlap = 0) => {
    if (!element) return;
    element.classList.add(className);
    await waitForTransition(element, overlap);
};

// EXPORT
window.AnimationUtils = { 
    wait, 
    waitForTransition, 
    animate,
    lockTime: INTERACTION_LOCK_MS // <--- EXPOSED HERE
};

/* ... (Keep initCascadeReveal, playCascade, reverseCascade, Marquee, Navbar, CTA as they were) ... */
document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initCTA();
    initCascadeReveal();
    setTimeout(() => {
        const nav = document.querySelector('nav');
        if(nav) nav.classList.add('nav-loaded');
    }, 100);
});

function initCascadeReveal() {
    const targets = document.querySelectorAll('.animate-cascade');
    targets.forEach(el => {
        if(el.classList.contains('is-initialized')) return;
        const splitTextInNode = (node) => {
            const text = node.innerText;
            node.innerHTML = ''; 
            const words = text.split(' ');
            words.forEach((wordText, wordIndex) => {
                const wordSpan = document.createElement('span');
                wordSpan.classList.add('word-wrapper');
                wordText.split('').forEach(char => {
                    const charSpan = document.createElement('span');
                    charSpan.classList.add('char-reveal');
                    charSpan.innerText = char;
                    wordSpan.appendChild(charSpan);
                });
                node.appendChild(wordSpan);
                if (wordIndex < words.length - 1) {
                    node.appendChild(document.createTextNode(' '));
                }
            });
        };
        if (el.children.length > 0) Array.from(el.children).forEach(child => splitTextInNode(child));
        else splitTextInNode(el);
        el.classList.add('is-initialized');
    });
}

window.playCascade = (element, overlap = 0) => {
    return new Promise(resolve => {
        if (!element) { resolve(); return; }
        const chars = element.querySelectorAll('.char-reveal');
        if (chars.length === 0) { resolve(); return; }
        const staggerTime = 30; 
        chars.forEach((char, index) => {
            char.style.transitionDelay = `${index * staggerTime}ms`;
            char.classList.add('is-visible');
        });
        const lastChar = chars[chars.length - 1];
        waitForTransition(lastChar, overlap).then(resolve);
    });
};

window.reverseCascade = (element, overlap = 0) => {
    return new Promise(resolve => {
        if (!element) { resolve(); return; }
        const chars = element.querySelectorAll('.char-reveal');
        if (chars.length === 0) { resolve(); return; }
        const total = chars.length;
        const staggerTime = 20; 
        chars.forEach((char, index) => {
            const delay = (total - index) * staggerTime; 
            char.style.transitionDelay = `${delay}ms`;
            char.classList.remove('is-visible');
        });
        const firstChar = chars[0];
        waitForTransition(firstChar, overlap).then(resolve);
    });
};

class MarqueeManager {
    constructor(selector, speed = 50, autoStagger = false) {
        this.selector = selector;
        this.speed = speed; 
        this.autoStagger = autoStagger;
        document.fonts.ready.then(() => { this.init(); });
    }
    init() {
        const tracks = document.querySelectorAll(this.selector);
        tracks.forEach(track => {
            if(track.classList.contains('is-initialized')) return;
            let originalContent = Array.from(track.children);
            if (originalContent.length === 0) return;
            if (originalContent.length % 2 !== 0) {
                const fragment = document.createDocumentFragment();
                originalContent.forEach(child => fragment.appendChild(child.cloneNode(true)));
                track.appendChild(fragment);
                originalContent = Array.from(track.children);
            }
            if (this.autoStagger) {
                originalContent.forEach((child, index) => {
                    if (index % 2 !== 0) child.classList.add('push-down');
                    else child.classList.remove('push-down');
                });
            }
            const measureDiv = document.createElement('div');
            const trackStyle = window.getComputedStyle(track);
            measureDiv.style.cssText = `display: flex; width: max-content; visibility: hidden; position: absolute; gap: ${trackStyle.gap || trackStyle.columnGap}; fontFamily: ${trackStyle.fontFamily}; fontSize: ${trackStyle.fontSize}; fontWeight: ${trackStyle.fontWeight}; letterSpacing: ${trackStyle.letterSpacing}; textTransform: ${trackStyle.textTransform};`;
            originalContent.forEach(child => measureDiv.appendChild(child.cloneNode(true)));
            document.body.appendChild(measureDiv);
            const singleSetWidth = measureDiv.getBoundingClientRect().width;
            const gap = parseFloat(trackStyle.gap || trackStyle.columnGap) || 0;
            document.body.removeChild(measureDiv);
            const screenWidth = window.innerWidth;
            const setsNeeded = Math.ceil(screenWidth / (singleSetWidth + gap)) + 1;
            track.innerHTML = '';
            const fragment = document.createDocumentFragment();
            for (let i = 0; i <= setsNeeded; i++) {
                originalContent.forEach(child => fragment.appendChild(child.cloneNode(true)));
            }
            track.appendChild(fragment);
            const moveDistance = singleSetWidth + gap;
            track.style.setProperty('--marquee-end', `-${moveDistance}px`);
            const duration = moveDistance / this.speed; 
            track.style.setProperty('--marquee-duration', `${duration}s`);
            track.classList.add('has-seamless-animation');
            track.classList.add('is-initialized');
        });
    }
}

function initNavbar() {
    const nav = document.querySelector('.sticky-nav');
    if (!nav) return;
    const links = nav.querySelectorAll('a');
    let scrollTimer;
    links.forEach(link => { if (link.children.length === 0) link.innerText = link.innerText; });
    window.addEventListener('scroll', () => {
        nav.classList.add('nav-hidden');
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => { nav.classList.remove('nav-hidden'); }, 500);
    }, { passive: true });
}

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
        if (!btn.classList.contains('about-persistent-cta')) { observer.observe(btn); }
    });
}