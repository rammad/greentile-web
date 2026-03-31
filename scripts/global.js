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

// sizes a group of sibling .fit-text elements to match the longest line
function fitTextGroupToWidth(elements, options = {}) {
    if (!elements.length) return;
    const { padding = 0 } = options;
    const container = elements[0].parentElement || document.body;
    const cs = getComputedStyle(container);
    const containerPadding = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const targetWidth = container.clientWidth - containerPadding - padding * 2;
    if (targetWidth <= 0) return;

    const saved = elements.map(el => {
        const s = { ws: el.style.whiteSpace, w: el.style.width };
        el.style.whiteSpace = 'nowrap';
        el.style.width      = 'max-content';
        el.style.fontSize   = '100px';
        return s;
    });

    let maxWidth = 0;
    elements.forEach(el => {
        maxWidth = Math.max(maxWidth, el.getBoundingClientRect().width);
    });

    if (maxWidth === 0) {
        elements.forEach((el, i) => {
            el.style.whiteSpace = saved[i].ws;
            el.style.width      = saved[i].w;
        });
        return;
    }

    const fontSize = `${(targetWidth / maxWidth) * 100}px`;
    elements.forEach((el, i) => {
        el.style.fontSize   = fontSize;
        el.style.whiteSpace = saved[i].ws;
        el.style.width      = saved[i].w;
    });
}

// init fit-text on all .fit-text elements + resize listener
// sibling .fit-text elements share the font-size of the longest line
// elements with data-fit-managed get font-size only; their section script handles visibility
function initFitText() {
    const elements = document.querySelectorAll('.fit-text');
    if (!elements.length) return;

    // group siblings that share a parent
    function buildGroups() {
        const groups = new Map();
        elements.forEach(el => {
            const parent = el.parentElement;
            if (!groups.has(parent)) groups.set(parent, []);
            groups.get(parent).push(el);
        });
        return groups;
    }

    function runFit() {
        buildGroups().forEach(siblings => {
            if (siblings.length > 1) fitTextGroupToWidth(siblings);
            else fitTextToWidth(siblings[0]);
        });
    }

    document.fonts.ready.then(() => {
        runFit();
        elements.forEach(el => {
            if (!el.dataset.fitManaged && !el.classList.contains('is-initialized')) {
                el.classList.add('is-initialized');
            }
        });
    });

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(runFit, 50);
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

// resolved immediately unless initPageTransition replaces it with a deferred promise
window.pageReady = Promise.resolve();

function observeElementInOut(element, options = {}) {
    if (!element) return () => {};
    const {
        onEnter,
        onExit,
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
                        // gate first-entry animations behind the curtain lifting
                        window.pageReady.then(() => onEnter(entry.target));
                    }
                } else if (!visible && didEnter) {
                    if (onExit) onExit(entry.target);
                    if (repeat) didEnter = false;
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
    initPageTransition();
    setTimeout(() => {
        const nav = document.querySelector('nav');
        if(nav) nav.classList.add('nav-loaded');
    }, 100);
});

function initCascadeReveal() {
    const targets = document.querySelectorAll('.animate-cascade');
    targets.forEach(el => {
        if (el.classList.contains('is-initialized')) return;

        const splitTextInNode = (node) => {
            const text = node.innerText.trim();
            node.innerHTML = '';
            const words = text.split(' ');

            words.forEach((wordText, wordIndex) => {
                const chars = [...wordText]; // unicode-safe split

                const wordSpan = document.createElement('span');
                wordSpan.classList.add('word-wrapper');

                // invisible spacer that holds the word's natural width/height
                const ghost = document.createElement('span');
                ghost.classList.add('word-ghost');
                ghost.setAttribute('aria-hidden', 'true');
                ghost.textContent = wordText;
                wordSpan.appendChild(ghost);

                // one absolutely-positioned layer per character
                chars.forEach((_, charIndex) => {
                    const layer = document.createElement('span');
                    layer.classList.add('char-reveal');
                    layer.setAttribute('aria-hidden', 'true');

                    chars.forEach((char, j) => {
                        const charSpan = document.createElement('span');
                        charSpan.classList.add('ghost-char');
                        charSpan.textContent = char;
                        // only the "owned" character is visible in this layer
                        if (j !== charIndex) charSpan.style.opacity = '0';
                        layer.appendChild(charSpan);
                    });

                    wordSpan.appendChild(layer);
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
        waitForTransition(lastChar, overlap).then(() => {
            chars.forEach(c => { c.style.willChange = 'auto'; });
            resolve();
        });
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
            measureDiv.style.cssText = `display:flex;width:max-content;visibility:hidden;position:absolute;gap:${trackStyle.gap || trackStyle.columnGap};font-family:${trackStyle.fontFamily};font-size:${trackStyle.fontSize};font-weight:${trackStyle.fontWeight};letter-spacing:${trackStyle.letterSpacing};text-transform:${trackStyle.textTransform};`;
            originalContent.forEach(child => measureDiv.appendChild(child.cloneNode(true)));
            document.body.appendChild(measureDiv);
            const patternWidth = measureDiv.getBoundingClientRect().width;
            document.body.removeChild(measureDiv);
            const screenWidth = window.innerWidth;
            const patternsPerHalf = Math.ceil(screenWidth / patternWidth) + 1;
            track.innerHTML = '';
            const fragment = document.createDocumentFragment();
            for (let i = 0; i < patternsPerHalf * 2; i++) {
                originalContent.forEach(child => fragment.appendChild(child.cloneNode(true)));
            }
            track.appendChild(fragment);
            const halfWidth = patternsPerHalf * patternWidth;
            const duration = halfWidth / this.speed;
            track.style.setProperty('--marquee-duration', `${duration}s`);
            track.classList.add('has-seamless-animation');
            track.classList.add('is-initialized');
        });
    }
}

const T = (name) => `images/graphics/tiles/two-tone/${name}.png`;
const CURTAIN_COMBOS = [
    // pongs
    { type: 'pong', tiles: [T('East'),        T('East'),        T('East')]        },
    { type: 'pong', tiles: [T('West'),        T('West'),        T('West')]        },
    { type: 'pong', tiles: [T('Fortune'),     T('Fortune'),     T('Fortune')]     },
    { type: 'pong', tiles: [T('White Board'), T('White Board'), T('White Board')] },
    { type: 'pong', tiles: [T('7 Circles'),   T('7 Circles'),   T('7 Circles')]   },
    { type: 'pong', tiles: [T('5 Sticks'),    T('5 Sticks'),    T('5 Sticks')]    },
    // chows
    { type: 'chow', tiles: [T('1 Circle'),    T('2 Circles'),   T('3 Circles')]   },
    { type: 'chow', tiles: [T('7 Circles'),   T('8 Circles'),   T('9 Circles')]   },
    { type: 'chow', tiles: [T('4 Sticks'),    T('5 Sticks'),    T('6 Sticks')]    },
    { type: 'chow', tiles: [T('1 Stick'),     T('2 Sticks'),    T('3 Sticks')]    },
    { type: 'chow', tiles: [T('10 Thousand'), T('20 Thousand'), T('30 Thousand')] },
    { type: 'chow', tiles: [T('40 Thousand'), T('50 Thousand'), T('60 Thousand')] },
    // gongs
    { type: 'gong', tiles: [T('Center'),   T('Center'),   T('Center'),   T('Center')]   },
    { type: 'gong', tiles: [T('Fortune'),  T('Fortune'),  T('Fortune'),  T('Fortune')]  },
    { type: 'gong', tiles: [T('1 Circle'), T('1 Circle'), T('1 Circle'), T('1 Circle')] },
    { type: 'gong', tiles: [T('9 Sticks'), T('9 Sticks'), T('9 Sticks'), T('9 Sticks')] },
];

// scattered landing positions per hand size (x, y, rotation) relative to tile center
const CURTAIN_TILE_SCATTER_DESKTOP = {
    3: [
        { x: -108, y: 22,  r: -20 },
        { x:    8, y: 32,  r:  12 },
        { x:  102, y:  9,  r:  -8 },
    ],
    4: [
        { x: -148, y: 18,  r: -22 },
        { x:  -32, y: 38,  r:  16 },
        { x:   56, y: 12,  r:  -8 },
        { x:  148, y: 28,  r:  18 },
    ],
};
const CURTAIN_TILE_SCATTER_MOBILE = {
    3: [
        { x: -93, y: 19,  r: -20 },
        { x:   7, y: 28,  r:  12 },
        { x:  88, y:  8,  r:  -8 },
    ],
    4: [
        { x: -128, y: 16,  r: -22 },
        { x:  -28, y: 33,  r:  16 },
        { x:   48, y: 10,  r:  -8 },
        { x:  128, y: 24,  r:  18 },
    ],
};
const CURTAIN_TILE_SCATTER = window.innerWidth < 768 ? CURTAIN_TILE_SCATTER_MOBILE : CURTAIN_TILE_SCATTER_DESKTOP;

// returns a fixed pixel value (breakpoint system replaced continuous vw scaling)
function vwPx(px) { return px; }

// tile width + gap 4px = stride; compute a centered row for any count
function getTileSnapX(count) {
    const tileW  = window.innerWidth < 768 ? 76 : 88;
    const stride = vwPx(tileW + 4);
    const start  = -((count - 1) / 2) * stride;
    return Array.from({ length: count }, (_, i) => Math.round(start + i * stride));
}

function preloadComboImages(combo) {
    return Promise.all(combo.tiles.map(src => new Promise(resolve => {
        const img = new Image();
        img.onload = img.onerror = resolve;
        img.src = src;
    })));
}

function createCurtainTiles(curtain, combo) {
    const wrap = document.createElement('div');
    wrap.className = 'curtain-tiles';
    combo.tiles.forEach(src => {
        const tile = document.createElement('div');
        tile.className = 'curtain-tile';
        tile.style.opacity = '0';
        if (src) tile.style.backgroundImage = `url('${src}')`;
        wrap.appendChild(tile);
    });
    curtain.appendChild(wrap);
    return wrap;
}

async function playTileAnimation(wrap) {
    const tiles    = wrap.querySelectorAll('.curtain-tile');

    const stagger  = 65;
    const fadeMs   = 340;
    const snapMs   = 320;
    const labelMs  = 260;
    const holdMs   = 240;

    const fadeEase = 'cubic-bezier(0, 0, 0.05, 1)';      // strong ease-out fade
    const snapEase = 'cubic-bezier(0.99, 0, 0.15, 1.6)'; // pinned still, explosive snap, hard overshoot

    const count   = tiles.length;
    const scatter = CURTAIN_TILE_SCATTER[count] ?? CURTAIN_TILE_SCATTER[3];
    const snapX   = getTileSnapX(count);

    // phase 1: pre-position at scatter coords, then fade in staggered
    tiles.forEach((tile, i) => {
        const { x, y, r } = scatter[i];
        tile.style.transform = `translate(${vwPx(x)}px, ${vwPx(y)}px) rotate(${r}deg)`;
    });
    tiles[0].getBoundingClientRect(); // force layout before animating
    tiles.forEach((tile, i) => {
        setTimeout(() => {
            tile.style.transition = `opacity ${fadeMs}ms ${fadeEase}`;
            tile.style.opacity = '1';
        }, i * stagger);
    });

    await wait(stagger * (tiles.length - 1) + fadeMs + 20);

    // phase 2: snap into a neat row simultaneously
    tiles.forEach((tile, i) => {
        tile.style.transition = `transform ${snapMs}ms ${snapEase}`;
        tile.style.transform  = `translate(${snapX[i]}px, 0px) rotate(0deg)`;
    });

    // phase 3: action lines above tiles
    setTimeout(() => {
        const linesWrap = document.createElement('div');
        linesWrap.className = 'curtain-label-wrap';
        const offsetPx = Math.round(vwPx(100));
        linesWrap.style.cssText = `transform: translate(-50%, -${offsetPx}px) scale(0.82); opacity: 0; transition: none;`;

        const lines = document.createElement('div');
        lines.className = 'curtain-action-lines';
        for (let i = 0; i < 3; i++) {
            const line = document.createElement('div');
            line.className = 'curtain-action-line';
            lines.appendChild(line);
        }
        linesWrap.appendChild(lines);
        wrap.appendChild(linesWrap);

        linesWrap.getBoundingClientRect();
        linesWrap.style.transition = `transform ${labelMs}ms cubic-bezier(0, 0, 0.2, 1), opacity ${labelMs}ms cubic-bezier(0, 0, 0.2, 1)`;
        linesWrap.style.transform  = `translate(-50%, -${offsetPx}px) scale(1)`;
        linesWrap.style.opacity    = '1';

        setTimeout(() => linesWrap.classList.add('lines-active'), 25);
    }, Math.round(snapMs * 0.5));

    // curtain rises right at the end of the click — no long hold
    await wait(snapMs + holdMs);
}

function initPageTransition() {
    const curtain = document.getElementById('page-curtain');
    if (!curtain) return;

    let navigating = false;

    // hold page animations until curtain lifts
    let resolvePageReady;
    window.pageReady = new Promise(resolve => { resolvePageReady = resolve; });

    // lock scroll while curtain covers the page
    document.body.style.overflow = 'hidden';

    // entry: tile animation plays while curtain covers, then curtain lifts
    const entryCombo = CURTAIN_COMBOS[Math.floor(Math.random() * CURTAIN_COMBOS.length)];
    const entryWrap  = createCurtainTiles(curtain, entryCombo);
    requestAnimationFrame(() => {
        requestAnimationFrame(async () => {
            await preloadComboImages(entryCombo);
            await playTileAnimation(entryWrap);
            resolvePageReady();
            document.body.style.overflow = '';
            curtain.style.transition = 'transform 0.85s cubic-bezier(0.16, 1, 0.3, 1)';
            curtain.classList.add('is-open');
            setTimeout(() => entryWrap.remove(), 900);
        });
    });

    // exit: curtain drops, tile animation plays, then navigate
    document.addEventListener('click', (e) => {
        if (navigating) return;
        const link = e.target.closest('a[href]');
        if (!link) return;

        const href = link.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('mailto') || href.startsWith('tel')) return;
        if (/^https?:\/\//i.test(href)) return;

        e.preventDefault();
        navigating = true;
        document.body.style.overflow = 'hidden';

        curtain.style.transition = 'transform 0.6s cubic-bezier(0.76, 0, 0.24, 1)';
        curtain.classList.remove('is-open');

        setTimeout(() => { window.location.href = href; }, 640);
    });
}

function initNavbar() {
    const nav = document.querySelector('.sticky-nav');
    if (!nav) return;
    const links = nav.querySelectorAll('a');
    links.forEach(link => { if (link.children.length === 0) link.innerText = link.innerText; });

    const page = window.location.pathname.split('/').pop() || 'index.html';
    const eventsPages = ['events.html', 'product.html', 'archives.html'];

    nav.querySelectorAll('.nav-center a, .nav-right a').forEach(link => {
        const href = link.getAttribute('href');
        if (!href || href === '#') return;
        const isActive = page === href || (href === 'events.html' && eventsPages.includes(page));
        if (isActive) {
            const wrap = document.createElement('span');
            wrap.className = 'nav-active-wrap';
            link.parentNode.insertBefore(wrap, link);
            wrap.appendChild(link);
        }
    });

    initMobileMenu(nav);
}

function initMobileMenu(nav) {
    const hamburger = nav.querySelector('.nav-hamburger');
    const menu = document.querySelector('.mobile-menu');
    if (!hamburger || !menu) return;

    let isOpen = false;
    const links = menu.querySelectorAll('.mobile-menu-link');

    const page = window.location.pathname.split('/').pop() || 'index.html';
    const eventsPages = ['events.html', 'product.html', 'archives.html'];
    links.forEach(link => {
        const href = link.getAttribute('href');
        if (!href || href === '#') return;
        const isCurrent = page === href || (href === 'events.html' && eventsPages.includes(page));
        if (isCurrent) link.classList.add('is-current');
    });

    function resetCascades() {
        links.forEach(link => {
            link.querySelectorAll('.char-reveal').forEach(c => {
                c.style.transition = 'none';
                c.classList.remove('is-visible');
            });
        });
    }

    function toggle() {
        isOpen = !isOpen;
        hamburger.classList.toggle('is-active', isOpen);
        hamburger.setAttribute('aria-expanded', String(isOpen));
        menu.classList.toggle('is-open', isOpen);

        if (isOpen) {
            resetCascades();
            void menu.offsetWidth;
            links.forEach((link, i) => {
                setTimeout(() => {
                    link.querySelectorAll('.char-reveal').forEach(c => {
                        c.style.transition = '';
                    });
                    if (window.playCascade) window.playCascade(link);
                }, i * 120);
            });
        } else {
            resetCascades();
        }
    }

    function closeMenu() {
        if (!isOpen) return;
        isOpen = false;
        hamburger.classList.remove('is-active');
        hamburger.setAttribute('aria-expanded', 'false');
        menu.classList.remove('is-open');
        resetCascades();
    }

    hamburger.addEventListener('click', toggle);
    window.mobileMenu = { close: closeMenu, isOpen: () => isOpen };

    links.forEach(link => {
        link.addEventListener('click', () => {});
    });
}
