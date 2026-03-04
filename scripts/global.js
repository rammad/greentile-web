/* globals */

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// returns current season based on month: spring/summer/fall/winter
function getCurrentSeason() {
    const month = new Date().getMonth() + 1; // 1=jan … 12=dec
    if (month >= 3 && month <= 5)  return { name: 'spring', label: 'Spring' };
    if (month >= 6 && month <= 8)  return { name: 'summer', label: 'Summer' };
    if (month >= 9 && month <= 11) return { name: 'fall',   label: 'Fall'   };
    return { name: 'winter', label: 'Winter' };
}

// scales element font-size to fill container width — call after fonts load and text is set
function fitTextToWidth(element, options = {}) {
    if (!element) return;
    const { padding = 0 } = options;
    const container   = element.parentElement || document.body;
    const cs          = getComputedStyle(container);
    const containerPadding = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const targetWidth = container.clientWidth - containerPadding - padding * 2;
    if (targetWidth <= 0) return;

    // force max-content width so the element doesn't clamp its own scrollWidth
    const savedWhiteSpace = element.style.whiteSpace;
    const savedWidth      = element.style.width;
    element.style.whiteSpace = 'nowrap';
    element.style.width      = 'max-content';
    element.style.fontSize   = '100px';

    // getBoundingClientRect gives sub-pixel precision (scrollWidth rounds)
    const textWidth = element.getBoundingClientRect().width;
    if (textWidth === 0) {
        element.style.whiteSpace = savedWhiteSpace;
        element.style.width      = savedWidth;
        return;
    }

    element.style.fontSize   = `${(targetWidth / textWidth) * 100}px`;
    element.style.whiteSpace = savedWhiteSpace;
    element.style.width      = savedWidth;
}

// init fit-text on all .fit-text elements + resize listener
// elements with data-fit-managed get font-size only; their section script handles visibility
function initFitText() {
    const elements = document.querySelectorAll('.fit-text');
    if (!elements.length) return;

    document.fonts.ready.then(() => {
        elements.forEach(el => {
            fitTextToWidth(el);
            if (!el.dataset.fitManaged && !el.classList.contains('is-initialized')) {
                el.classList.add('is-initialized');
            }
        });
    });

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            elements.forEach(el => fitTextToWidth(el));
        }, 50);
    });
}

// tweak these to adjust feel of scroll-based interactions
const INTERACTION_LOCK_MS = 500;
const SEQUENTIAL_ELEMENT_STAGGER_MS = 200;
const SCROLL_SPEED = 40;
const SCROLL_WHEEL_THRESHOLD = 80;       // accumulated wheel delta before triggering section change
const SCROLL_EASE_FACTOR = 0.08;         // 0.05 = velvety, 0.15 = snappy
const SCROLL_SENSITIVITY = 0.002;        // 500px wheel ≈ 1 section at 0.002
const LENIS_LERP = 0.1;                 // smoothness: lower = silkier (Lenis default is 0.1)
const LENIS_DURATION = 1.0;             // scroll animation duration in seconds
const LENIS_WHEEL_MULTIPLIER = 1.0;     // wheel speed multiplier

const ENTER_THRESHOLD = 0.15; // how much of element must be visible to trigger entrance

function observeElementInOut(element, options = {}) {
    if (!element) return () => {};
    const {
        onEnter,
        enterThreshold = ENTER_THRESHOLD,
        repeat = false,
        root = document.getElementById('scroll-viewport') || null
    } = options;

    let didEnter = false;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                const visible = entry.isIntersecting && entry.intersectionRatio >= enterThreshold;
                if (visible && onEnter) {
                    if (!didEnter || repeat) {
                        didEnter = true;
                        onEnter(entry.target);
                    }
                } else if (!visible && repeat) {
                    didEnter = false;
                }
            });
        },
        { root, threshold: [0, enterThreshold], rootMargin: '0px' }
    );

    observer.observe(element);
    return () => observer.unobserve(element);
}

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

const transitionHeader = async (element, direction = 'enter') => {
    if (!element) return;

    const charDelay = 15;

    if (direction === 'enter') {
        element.classList.remove('header-hidden');
        const chars = element.querySelectorAll('.char-reveal');
        chars.forEach(c => { 
            c.style.transition = 'none'; 
            c.classList.remove('is-visible'); 
        });
        void element.offsetWidth; 
        chars.forEach((c, i) => { 
            c.style.transition = ''; 
            c.style.transitionDelay = `${i * charDelay}ms`; 
        });
        if (window.playCascade) {
            window.playCascade(element);
        }
    } else {
        await animate(element, 'header-hidden');
    }
};

const transitionCta = async (element, direction = 'enter') =>{
    if (!element) return;
    const text = element.querySelector('.ui-roll');

    if (direction === 'enter'){
        void element.offsetWidth
        await animate(element, 'is-visible')
        if (text) text.classList.add('is-visible')
    }
    else{
        element.classList.remove('is-visible');
        if(text) text.classList.remove('is-visible');
    }
}

window.AnimationUtils = {
    wait,
    waitForTransition,
    animate,
    transitionHeader,
    transitionCta,
    playCascade: (el, ov) => window.playCascade(el, ov),
    reverseCascade: (el, ov) => window.reverseCascade(el, ov),
    observeElementInOut,
    lockTime: INTERACTION_LOCK_MS,
    staggerTime: SEQUENTIAL_ELEMENT_STAGGER_MS,
    scrollSpeed: SCROLL_SPEED,
    scrollWheelThreshold: SCROLL_WHEEL_THRESHOLD,
    scrollEaseFactor: SCROLL_EASE_FACTOR,
    scrollSensitivity: SCROLL_SENSITIVITY,
    lenisLerp: LENIS_LERP,
    lenisDuration: LENIS_DURATION,
    lenisWheelMultiplier: LENIS_WHEEL_MULTIPLIER,
    enterThreshold: ENTER_THRESHOLD
};

window.AppUtils = {
    getCurrentSeason,
    fitTextToWidth,
};

// exposed so section scripts can re-run split after setting text
window.initCascadeReveal = initCascadeReveal;

document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    // initCTA(); /* section scripts handle ctas */
    initCascadeReveal();
    initFitText();
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
    links.forEach(link => { if (link.children.length === 0) link.innerText = link.innerText; });
}
