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

});