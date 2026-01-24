/**
 * 1. DYNAMIC TITLE SCALING (New Code)
 * Calculates exactly how much bigger the Hero text is compared to the Event text
 * and sets a CSS variable so the animation matches perfectly.
 */
function updateTitleScale() {
    const heroTitle = document.querySelector('.type-display-hero');
    const eventTitle = document.getElementById('event-title');
    const section = document.querySelector('.events-section');

    if (!heroTitle || !eventTitle || !section) return;

    // 1. Get Font Sizes
    const heroSize = parseFloat(window.getComputedStyle(heroTitle).fontSize);
    const eventSize = parseFloat(window.getComputedStyle(eventTitle).fontSize);

    // 2. Calculate Ratio
    let scaleFactor = heroSize / eventSize;

    // 3. Safety Check: Don't let it get wider than the screen
    // Temporarily reset transform to measure true natural width
    const prevTransform = eventTitle.style.transform;
    eventTitle.style.transform = 'none';
    const naturalWidth = eventTitle.offsetWidth;
    eventTitle.style.transform = prevTransform;

    const availableWidth = window.innerWidth - 40; // Screen width minus margins
    const maxScaleByWidth = availableWidth / naturalWidth;

    // Use the smaller of the two scales to stay safe
    const finalScale = Math.min(scaleFactor, maxScaleByWidth);

    // 4. Send to CSS
    section.style.setProperty('--scale-start', finalScale.toFixed(3));
}

/**
 * NAVBAR SCROLL LISTENER
 * Toggles the 'scrolled' class to create the pop-out pill effect.
 */
function updateNavStyle() {
    const nav = document.querySelector('.sticky-nav');
    if (!nav) return;

    if (window.scrollY > 50) {
        nav.classList.add('scrolled');
    } else {
        nav.classList.remove('scrolled');
    }
}

// Add to the existing window listeners at the top of the file
window.addEventListener('scroll', updateNavStyle);
// Run once on load in case we refresh halfway down the page
window.addEventListener('load', updateNavStyle);

// Run on load (images/fonts ready) and resize
window.addEventListener('load', updateTitleScale);
window.addEventListener('resize', updateTitleScale);

let globalMouseX = 0;
let globalMouseY = 0;

window.addEventListener('mousemove', (e) => {
    globalMouseX = e.clientX;
    globalMouseY = e.clientY;
});


// ========================================================
// 2. EXISTING SCROLL LOGIC
// ========================================================
document.addEventListener('DOMContentLoaded', () => {

    // Helper to map a 0-1 range to a specific timeline
    const mapRange = (value, start, end) => {
        let output = (value - start) / (end - start);
        return Math.min(Math.max(output, 0), 1);
    };

    // ... The rest of your existing code (About, Events, etc) ...
    // ... Keep everything below here exactly the same ...
    
    // 1. ABOUT SECTION
    new ScrollAnimator('.about', (data) => {
        const p = data.stickyProgress; 
        const textProg = mapRange(p, 0.0, 0.3);
        const imgProg = mapRange(p, 0.4, 1.0);
        data.target.style.setProperty('--text-progress', textProg.toFixed(3));
        data.target.style.setProperty('--img-progress', imgProg.toFixed(3));
    });

    // 2. EVENTS SECTION
    new ScrollAnimator('.events-section', (data) => {
        const p = data.stickyProgress;
        const titleProg = mapRange(p, 0.0, 0.3);
        const card1 = mapRange(p, 0.30, 0.50);
        const card2 = mapRange(p, 0.45, 0.65);
        const card3 = mapRange(p, 0.60, 0.80);

        data.target.style.setProperty('--title-progress', titleProg.toFixed(3));
        data.target.style.setProperty('--card1-progress', card1.toFixed(3));
        data.target.style.setProperty('--card2-progress', card2.toFixed(3));
        data.target.style.setProperty('--card3-progress', card3.toFixed(3));
    });

    // ========================================================
    // 3. MENU SECTION (Sequence + Parallax)
    // ========================================================
    new ScrollAnimator('.menu-section', (data) => {
        const p = data.stickyProgress;
        const section = data.target;
        
        const menuLabel = section.querySelector('.menu-label');
        const items = section.querySelectorAll('.menu-item');
        const groups = section.querySelectorAll('.menu-group');
        const ctas = section.querySelectorAll('.cta-block');

        // CONSTANTS
        const WATERFALL_END = 0.25;  // Text finishes entering
        const SELECTION_START = 0.35; // Selection begins
        const INACTIVE_OPACITY = 0.3; // Dimmed text opacity

        // ------------------------------------
        // PHASE A: TEXT WATERFALL ENTRANCE
        // ------------------------------------
        
        // 1. Label Entrance
        const labelP = mapRange(p, 0.0, 0.1);
        if (p < WATERFALL_END) {
            // Grow down from 1.15 to 1.0, Blur out
            const scale = 1.15 - (0.15 * labelP);
            const blur = 10 - (10 * labelP);
            menuLabel.style.transform = `scale(${scale})`;
            menuLabel.style.filter = `blur(${blur}px)`;
            menuLabel.style.opacity = labelP;
        } else {
            menuLabel.style.transform = 'scale(1)';
            menuLabel.style.filter = 'blur(0px)';
            menuLabel.style.opacity = 1;
        }

        // 2. Items Entrance
        items.forEach((item, i) => {
            const start = 0.05 + (i * 0.05);
            const end = start + 0.1;
            const itemP = mapRange(p, start, end);
            
            if (p < WATERFALL_END) {
                const scale = 1.15 - (0.15 * itemP);
                const blur = 10 - (10 * itemP);
                item.style.transform = `scale(${scale})`;
                item.style.filter = `blur(${blur}px)`;
                item.style.opacity = itemP;
            } else {
                item.style.transform = 'scale(1)';
                // If not active later, dim it
                if (!item.classList.contains('active')) {
                    item.style.opacity = INACTIVE_OPACITY;
                    item.style.filter = 'blur(0px)';
                }
            }
        });

        // ------------------------------------
        // PHASE B: SELECTION & PHYSICS
        // ------------------------------------
        
        let activeIndex = -1;
        let localProgress = 0; // 0-1 progress WITHIN the current item's time

        if (p >= SELECTION_START) {
            const totalItems = items.length;
            // Map the remaining scroll space (0.35 -> 1.0) to the items
            const availableProgress = (p - SELECTION_START) / (1 - SELECTION_START);
            const rawIndex = availableProgress * totalItems;
            
            activeIndex = Math.floor(rawIndex);
            activeIndex = Math.min(activeIndex, totalItems - 1);
            
            localProgress = rawIndex - activeIndex;
            if (activeIndex === totalItems - 1) localProgress = Math.min(1, localProgress);
        }

        // 1. UPDATE CLASSES (Active / Prev)
        items.forEach((item, i) => {
            if (i === activeIndex) {
                item.classList.add('active');
                item.style.opacity = 1;
            } else {
                item.classList.remove('active');
                if (p >= WATERFALL_END) item.style.opacity = INACTIVE_OPACITY;
            }
        });

        ctas.forEach((cta, i) => {
            if (i === activeIndex) cta.classList.add('active');
            else cta.classList.remove('active');
        });

        groups.forEach((group, i) => {
            group.classList.remove('active', 'prev');
            
            if (i === activeIndex) {
                // ACTIVE: Visible & Moving
                group.classList.add('active');
                
                // --- PHYSICS CALCULATION ---
                // Drift up based on scroll progress (-30px)
                const scrollDrift = 15 + (localProgress * -30);
                const radius = 500; 
                const strength = 30;

                group.querySelectorAll('.menu-photo').forEach(photo => {
                    // Physics Math
                    const rect = photo.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    const dx = globalMouseX - centerX; 
                    const dy = globalMouseY - centerY;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    
                    let mx = 0; 
                    let my = 0;
                    
                    // Mouse Repulsion
                    if (dist < radius) {
                        const force = (radius - dist) / radius;
                        mx = -(dx / dist) * force * strength;
                        my = -(dy / dist) * force * strength;
                    }

                    photo.style.setProperty('--drift', `${scrollDrift}px`);
                    photo.style.setProperty('--mx', `${mx}px`);
                    photo.style.setProperty('--my', `${my}px`);
                });

            } else if (i < activeIndex) {
                // PREV: It has been scrolled past (Exit Top)
                group.classList.add('prev');
                
            } else {
                // NEXT: It is waiting below (Start Bottom)
                group.classList.add('next');
                
                // Reset physics vars so it doesn't jump when it enters
                group.querySelectorAll('.menu-photo').forEach(p => {
                     p.style.removeProperty('--mx'); 
                     p.style.removeProperty('--my');
                     p.style.removeProperty('--drift');
                });
            }
        });
    });

});