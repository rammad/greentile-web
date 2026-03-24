/* globals — shopify theme build */

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function getCurrentSeason() {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5)  return { name: 'spring', label: 'Spring' };
    if (month >= 6 && month <= 8)  return { name: 'summer', label: 'Summer' };
    if (month >= 9 && month <= 11) return { name: 'fall',   label: 'Fall'   };
    return { name: 'winter', label: 'Winter' };
}

function fitTextToWidth(element, options = {}) {
    if (!element) return;
    const { padding = 0 } = options;
    const container   = element.parentElement || document.body;
    const cs          = getComputedStyle(container);
    const containerPadding = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const targetWidth = container.clientWidth - containerPadding - padding * 2;
    if (targetWidth <= 0) return;

    const savedWhiteSpace = element.style.whiteSpace;
    const savedWidth      = element.style.width;
    element.style.whiteSpace = 'nowrap';
    element.style.width      = 'max-content';
    element.style.fontSize   = '100px';

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

const INTERACTION_LOCK_MS = 500;
const SEQUENTIAL_ELEMENT_STAGGER_MS = 200;
const SCROLL_SPEED = 40;
const SCROLL_WHEEL_THRESHOLD = 80;
const SCROLL_EASE_FACTOR = 0.08;
const SCROLL_SENSITIVITY = 0.002;
const LENIS_LERP = 0.1;
const LENIS_DURATION = 1.0;
const LENIS_WHEEL_MULTIPLIER = 1.0;

const ENTER_THRESHOLD = 0.15;

window.pageReady = Promise.resolve();

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
                        window.pageReady.then(() => onEnter(entry.target));
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

window.initCascadeReveal = initCascadeReveal;

document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
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
                const chars = [...wordText];

                const wordSpan = document.createElement('span');
                wordSpan.classList.add('word-wrapper');

                const ghost = document.createElement('span');
                ghost.classList.add('word-ghost');
                ghost.setAttribute('aria-hidden', 'true');
                ghost.textContent = wordText;
                wordSpan.appendChild(ghost);

                chars.forEach((_, charIndex) => {
                    const layer = document.createElement('span');
                    layer.classList.add('char-reveal');
                    layer.setAttribute('aria-hidden', 'true');

                    chars.forEach((char, j) => {
                        const charSpan = document.createElement('span');
                        charSpan.classList.add('ghost-char');
                        charSpan.textContent = char;
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

/* tile image lookup — reads from Liquid-injected GTSC_TILES map, falls back to relative path */
const T = (name) => (window.GTSC_TILES && window.GTSC_TILES[name]) || `images/graphics/tiles/two-tone/${name}.png`;

const CURTAIN_COMBOS = [
    { type: 'pong', tiles: [T('East'),        T('East'),        T('East')]        },
    { type: 'pong', tiles: [T('West'),        T('West'),        T('West')]        },
    { type: 'pong', tiles: [T('Fortune'),     T('Fortune'),     T('Fortune')]     },
    { type: 'pong', tiles: [T('White Board'), T('White Board'), T('White Board')] },
    { type: 'pong', tiles: [T('7 Circles'),   T('7 Circles'),   T('7 Circles')]   },
    { type: 'pong', tiles: [T('5 Sticks'),    T('5 Sticks'),    T('5 Sticks')]    },
    { type: 'chow', tiles: [T('1 Circle'),    T('2 Circles'),   T('3 Circles')]   },
    { type: 'chow', tiles: [T('7 Circles'),   T('8 Circles'),   T('9 Circles')]   },
    { type: 'chow', tiles: [T('4 Sticks'),    T('5 Sticks'),    T('6 Sticks')]    },
    { type: 'chow', tiles: [T('1 Stick'),     T('2 Sticks'),    T('3 Sticks')]    },
    { type: 'chow', tiles: [T('10 Thousand'), T('20 Thousand'), T('30 Thousand')] },
    { type: 'chow', tiles: [T('40 Thousand'), T('50 Thousand'), T('60 Thousand')] },
    { type: 'gong', tiles: [T('Center'),   T('Center'),   T('Center'),   T('Center')]   },
    { type: 'gong', tiles: [T('Fortune'),  T('Fortune'),  T('Fortune'),  T('Fortune')]  },
    { type: 'gong', tiles: [T('1 Circle'), T('1 Circle'), T('1 Circle'), T('1 Circle')] },
    { type: 'gong', tiles: [T('9 Sticks'), T('9 Sticks'), T('9 Sticks'), T('9 Sticks')] },
];

const CURTAIN_TILE_SCATTER = {
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

function vwPx(px) { return px * (window.innerWidth / 1920); }

function getTileSnapX(count) {
    const stride = vwPx(92);
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

async function playTileAnimation(wrap, combo) {
    const tiles    = wrap.querySelectorAll('.curtain-tile');

    const stagger  = 65;
    const fadeMs   = 340;
    const snapMs   = 320;
    const labelMs  = 260;
    const holdMs   = 240;

    const fadeEase = 'cubic-bezier(0, 0, 0.05, 1)';
    const snapEase = 'cubic-bezier(0.99, 0, 0.15, 1.6)';

    const count   = tiles.length;
    const scatter = CURTAIN_TILE_SCATTER[count] ?? CURTAIN_TILE_SCATTER[3];
    const snapX   = getTileSnapX(count);

    tiles.forEach((tile, i) => {
        const { x, y, r } = scatter[i];
        tile.style.transform = `translate(${vwPx(x)}px, ${vwPx(y)}px) rotate(${r}deg)`;
    });
    tiles[0].getBoundingClientRect();
    tiles.forEach((tile, i) => {
        setTimeout(() => {
            tile.style.transition = `opacity ${fadeMs}ms ${fadeEase}`;
            tile.style.opacity = '1';
        }, i * stagger);
    });

    await wait(stagger * (tiles.length - 1) + fadeMs + 20);

    tiles.forEach((tile, i) => {
        tile.style.transition = `transform ${snapMs}ms ${snapEase}`;
        tile.style.transform  = `translate(${snapX[i]}px, 0px) rotate(0deg)`;
    });

    setTimeout(() => {
        const labelWrap = document.createElement('div');
        labelWrap.className = 'curtain-label-wrap type-subBold1';
        const labelOffsetPx = Math.round(vwPx(110));
        labelWrap.style.cssText = `transform: translate(-50%, -${labelOffsetPx}px) scale(0.82); opacity: 0; transition: none;`;

        const makeLines = (side) => {
            const div = document.createElement('div');
            div.className = `curtain-action-lines curtain-action-lines--${side}`;
            for (let i = 0; i < 3; i++) {
                const line = document.createElement('div');
                line.className = 'curtain-action-line';
                div.appendChild(line);
            }
            return div;
        };

        const text = document.createElement('span');
        text.textContent = combo.type;

        labelWrap.appendChild(makeLines('left'));
        labelWrap.appendChild(text);
        labelWrap.appendChild(makeLines('right'));
        wrap.appendChild(labelWrap);

        labelWrap.getBoundingClientRect();
        labelWrap.style.transition = `transform ${labelMs}ms cubic-bezier(0, 0, 0.2, 1), opacity ${labelMs}ms cubic-bezier(0, 0, 0.2, 1)`;
        labelWrap.style.transform  = `translate(-50%, -${labelOffsetPx}px) scale(1)`;
        labelWrap.style.opacity    = '1';

        setTimeout(() => labelWrap.classList.add('lines-active'), 25);
    }, Math.round(snapMs * 0.70));

    await wait(snapMs + holdMs);
}

function initPageTransition() {
    const curtain = document.getElementById('page-curtain');
    if (!curtain) return;

    let navigating = false;

    let resolvePageReady;
    window.pageReady = new Promise(resolve => { resolvePageReady = resolve; });

    const entryCombo = CURTAIN_COMBOS[Math.floor(Math.random() * CURTAIN_COMBOS.length)];
    const entryWrap  = createCurtainTiles(curtain, entryCombo);
    requestAnimationFrame(() => {
        requestAnimationFrame(async () => {
            await preloadComboImages(entryCombo);
            await playTileAnimation(entryWrap, entryCombo);
            resolvePageReady();
            curtain.style.transition = 'transform 0.85s cubic-bezier(0.16, 1, 0.3, 1)';
            curtain.classList.add('is-open');
            setTimeout(() => entryWrap.remove(), 900);
        });
    });

    document.addEventListener('click', (e) => {
        if (navigating) return;
        const link = e.target.closest('a[href]');
        if (!link) return;

        const href = link.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('mailto') || href.startsWith('tel')) return;
        if (/^https?:\/\//i.test(href) && !href.includes(window.location.hostname)) return;

        e.preventDefault();
        navigating = true;

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

    const path = window.location.pathname;

    nav.querySelectorAll('.nav-center a, .nav-right a').forEach(link => {
        const href = link.getAttribute('href');
        if (!href || href === '#') return;
        const isActive = path === href ||
            path.endsWith(href) ||
            (href.includes('events') && (path.includes('events') || path.includes('product') || path.includes('archives'))) ||
            (href.includes('about') && path.includes('about'));
        if (isActive) {
            const wrap = document.createElement('span');
            wrap.className = 'nav-active-wrap';
            link.parentNode.insertBefore(wrap, link);
            wrap.appendChild(link);
        }
    });
}
