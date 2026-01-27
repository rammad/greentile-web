/**
 * 1. NAVBAR LOGIC (Fixed)
 * Handles:
 * - Smart Hide: Hides nav while scrolling, shows when stopped.
 * - Rolling Text: Sets up the html/attributes for the dial hover effect.
 */
function initNavbar() {
    const nav = document.querySelector('.sticky-nav');
    if (!nav) return;

    const links = nav.querySelectorAll('a');
    let scrollTimer;

    // A. SETUP ROLLING TEXT HOVER
    links.forEach(link => {
        // We only want to wrap the text if it's not already complicated HTML
        // This sets up the structure required by nav.css
        const text = link.innerText.trim();
        
        // 1. Set the attribute for the duplicate text (the one that slides in)
        link.setAttribute('data-text', text);

        // 2. Wrap the visible text in a span if not already wrapped
        // (Check avoids conflict if initDialReveal ran first)
        if (link.children.length === 0) {
            link.innerHTML = `<span>${text}</span>`;
        }
    });

    // B. HIDE ON SCROLL / SHOW ON STOP
    window.addEventListener('scroll', () => {

        nav.classList.add('nav-hidden');

        clearTimeout(scrollTimer);

        scrollTimer = setTimeout(() => {
            nav.classList.remove('nav-hidden');
        }, 500);
    }, { passive: true });
}

function initHeroTrigger() {
    const heroTitle = document.querySelector('.type-display-hero');
    if (!heroTitle) return;

    window.addEventListener('scroll', () => {
        // TRIGGER POINT:
        // As soon as user scrolls 100px down, trigger the fade out.
        // Feel free to adjust '100' to whatever feels right.
        const triggerPoint = 100;

        if (window.scrollY > triggerPoint) {
            heroTitle.classList.add('hero-hidden');
        } else {
            heroTitle.classList.remove('hero-hidden');
        }
    }, { passive: true });
}

function updateTitleScale() {
    const heroTitle = document.querySelector('.type-display-hero');
    const eventTitle = document.getElementById('event-title');
    const section = document.querySelector('.events-section');

    if (!heroTitle || !eventTitle || !section) return;

    const heroSize = parseFloat(window.getComputedStyle(heroTitle).fontSize);
    const eventSize = parseFloat(window.getComputedStyle(eventTitle).fontSize);

    let scaleFactor = heroSize / eventSize;

    const prevTransform = eventTitle.style.transform;
    eventTitle.style.transform = 'none';
    const naturalWidth = eventTitle.offsetWidth;
    eventTitle.style.transform = prevTransform;

    const availableWidth = window.innerWidth - 40; 
    const maxScaleByWidth = availableWidth / naturalWidth;
    const finalScale = Math.min(scaleFactor, maxScaleByWidth);

    section.style.setProperty('--scale-start', finalScale.toFixed(3));
}

function initDialReveal() {
    const elements = document.querySelectorAll('.animate-dial');
    // NOTE: Avoid putting 'animate-dial' on the Navbar links in HTML 
    // if you want the specific nav hover effect, as they fight for control of the HTML.

    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15 
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
            }
        });
    }, observerOptions);

    elements.forEach(el => {
        // Skip if this is inside the nav to prevent conflicts
        if (el.closest('.sticky-nav')) return;

        const rawText = el.innerText; 
        const words = rawText.split(/\s+/); 

        let newHtml = '';
        words.forEach(word => {
            if(word.length > 0) {
                newHtml += `
                    <span class="dial-mask">
                        <span class="dial-inner">${word}</span>
                    </span>
                `;
            }
        });

        el.innerHTML = newHtml;
        el.classList.add('dial-ready'); 
        observer.observe(el);
    });
}

function initCascadeReveal() {
    // 1. TARGETS: Add any class here that you want to animate
    const targets = document.querySelectorAll('.type-display-hero, .type-h1, .type-display-xl');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const chars = entry.target.querySelectorAll('.char-reveal');
                
                // Trigger animation for each character
                chars.forEach(char => {
                    char.classList.add('is-visible');
                });
                
                // Stop watching once triggered
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 }); // Trigger when 20% visible

    targets.forEach(el => {
        // --- 1. PREPARE TEXT ---
        // Save raw text
        const text = el.innerText;
        el.innerHTML = '';
        
        // Split into characters and wrap
        text.split('').forEach((char, index) => {
            const span = document.createElement('span');
            span.classList.add('char-reveal');
            span.textContent = char;
            
            // CALCULATE DELAY: 30ms per character
            // This creates the "Slot Machine" wave
            span.style.transitionDelay = `${index * 30}ms`;
            
            el.appendChild(span);
        });

        // --- 2. MARK AS READY ---
        // (Reveals the parent container now that spans are ready)
        el.classList.add('is-initialized');

        // --- 3. OBSERVE ---
        observer.observe(el);
    });
}

function setupAboutImages() {
    const images = document.querySelectorAll('.about-slide > .scatter-img');

    images.forEach(img => {
        // 1. CREATE OUTER WRAPPER (Anchor)
        const anchor = document.createElement('div');
        anchor.classList.add('scatter-anchor');
        
        // 2. CREATE MIDDLE WRAPPER (Parallax)
        const parallax = document.createElement('div');
        parallax.classList.add('scatter-parallax');

        // 3. TRANSFER POSITION CLASSES
        const classesToMove = [];
        img.classList.forEach(cls => {
            if (cls.startsWith('pos-')) classesToMove.push(cls);
        });
        classesToMove.forEach(cls => {
            anchor.classList.add(cls);
            img.classList.remove(cls);
        });

        // 4. GENERATE VALUES
        const jitterX = Math.floor(Math.random() * 100) - 50;
        const jitterY = Math.floor(Math.random() * 100) - 50;
        const scale = 0.7 + Math.random() * 0.6;

        // 5. APPLY STYLES TO ANCHOR (Layout & Fly)
        anchor.style.marginLeft = `${jitterX}px`;
        anchor.style.marginTop = `${jitterY}px`;
        
        let flyX = '0px';
        let flyY = '0px';
        const distV = '25vh'; 
        const distH = '15vw';  

        if (anchor.classList.contains('pos-1')) {       
            flyX = `-${distH}`; flyY = `-${distV}`;
        } else if (anchor.classList.contains('pos-2')) { 
            flyX = `${distH}`; flyY = `-${distV}`;
        } else if (anchor.classList.contains('pos-3')) { 
            flyX = `-${distH}`; flyY = `${distV}`;
        } else if (anchor.classList.contains('pos-4')) { 
            flyX = `${distH}`; flyY = `${distV}`;
        } else if (anchor.classList.contains('pos-5')) { 
            flyX = '0px'; flyY = `-${distV}`;
        } else if (anchor.classList.contains('pos-6')) { 
            flyX = '0px'; flyY = `${distV}`;
        } else if (anchor.classList.contains('pos-7')) { 
            flyX = `-${distH}`; flyY = '0px';
        } else if (anchor.classList.contains('pos-8')) { 
            flyX = `${distH}`; flyY = '0px';
        }

        anchor.style.setProperty('--fly-x', flyX);
        anchor.style.setProperty('--fly-y', flyY);

        // 6. INITIALIZE VARS
        // Parallax wrapper gets target/current for Lerp
        parallax._targetY = 0;
        parallax._currentY = 0;
        parallax.style.setProperty('--scroll-y', '0px');
        
        // Image gets scale & avoid
        img.style.setProperty('--base-scale', scale);
        img.style.setProperty('--avoid-x', '0px');
        img.style.setProperty('--avoid-y', '0px');

        // 7. INJECT INTO DOM
        img.parentNode.insertBefore(anchor, img);
        anchor.appendChild(parallax);
        parallax.appendChild(img);
    });
}


/**
 * SMOOTH MOTION LOOP
 * Handles Mouse Avoidance + Soft Parallax Lerping
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
            // --- 1. MOUSE AVOIDANCE (On Image) ---
            const rect = img.getBoundingClientRect();
            // Skip if off-screen
            if (rect.bottom < -100 || rect.top > window.innerHeight + 100) return;

            const imgX = rect.left + rect.width / 2;
            const imgY = rect.top + rect.height / 2;
            const dx = mouseX - imgX;
            const dy = mouseY - imgY;
            const dist = Math.sqrt(dx*dx + dy*dy);

            const radius = 500;
            
            if (dist < radius) {
                const force = (radius - dist) / radius;
                const moveX = -dx * force * 0.15; 
                const moveY = -dy * force * 0.15;

                img.style.setProperty('--avoid-x', `${moveX.toFixed(2)}px`);
                img.style.setProperty('--avoid-y', `${moveY.toFixed(2)}px`);
            } else {
                img.style.setProperty('--avoid-x', `0px`);
                img.style.setProperty('--avoid-y', `0px`);
            }

            // --- 2. SOFT SCROLL LERP (On Parent Wrapper) ---
            const wrapper = img.parentElement; // .scatter-parallax
            
            if (wrapper && wrapper._targetY !== undefined) {
                // Initialize if null
                if (!wrapper._currentY) wrapper._currentY = 0;
                
                // LERP: Current moves 8% of the way to Target every frame
                // 0.08 = Softness factor. Lower is softer/slower.
                wrapper._currentY += (wrapper._targetY - wrapper._currentY) * 0.08;
                
                wrapper.style.setProperty('--scroll-y', `${wrapper._currentY.toFixed(2)}px`);
            }
        });
        requestAnimationFrame(animate);
    }
    animate();
}

function initCTA() {
    const btns = document.querySelectorAll('.cta-btn');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const btn = entry.target;
            // Skip buttons controlled manually by scroll progress (About Section)
            if (btn.classList.contains('manual-control')) return;
            
            if (entry.isIntersecting) {
                btn.classList.remove('not-active');
            } else {
                btn.classList.add('not-active');
            }
        });
    }, { threshold: 0.5 });

    btns.forEach(btn => {
        // 1. Set Initial State
        btn.classList.add('not-active');

        // 2. Observe (unless it's the special About button)
        if (!btn.classList.contains('about-persistent-cta')) {
            observer.observe(btn);
        } else {
            btn.classList.add('manual-control');
        }
    });
}

// ========================================================
// INITIALIZATION
// ========================================================

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Init Features
    initNavbar();
    initDialReveal();
    updateTitleScale();
    initHeroTrigger();
    initCascadeReveal();
    setupAboutImages();
    initSmoothMotion();
    initCTA();

    // 2. Window Listeners for Scaling
    window.addEventListener('resize', updateTitleScale);
    let globalMouseX = 0;
    let globalMouseY = 0;
    window.addEventListener('mousemove', (e) => {
        globalMouseX = e.clientX;
        globalMouseY = e.clientY;
    });

    // Helper for ScrollAnimator
    const mapRange = (value, start, end) => {
        let output = (value - start) / (end - start);
        return Math.min(Math.max(output, 0), 1);
    };

    const cachedParallaxWrappers = [
        document.querySelectorAll('#slide-1 .scatter-parallax'),
        document.querySelectorAll('#slide-2 .scatter-parallax'),
        document.querySelectorAll('#slide-3 .scatter-parallax')
    ];

    const applyParallax = (slideIndex, globalProgress, startP, endP) => {
        const wrappers = cachedParallaxWrappers[slideIndex];
        if(!wrappers) return;
        
        let localP = (globalProgress - startP) / (endP - startP);
        
        // Moves UP (50px to -50px)
        const moveY = 50 - (localP * 100); 
        
        // UPDATE TARGET ONLY (The animate loop handles the movement)
        wrappers.forEach(wrapper => {
            wrapper._targetY = moveY;
        });
    }

    // SCROLL ANIMATIONS
    if(document.querySelector('.about')) {
        const slides = document.querySelectorAll('.about-slide');
        // SELECT THE BUTTON
        const ctaBtn = document.querySelector('.about-persistent-cta');

        new ScrollAnimator('.about', (data) => {
            const p = data.stickyProgress; 
            
            const setStage = (activeIndex) => {
                // 1. HANDLE SLIDES
                slides.forEach((slide, index) => {
                    if (index === activeIndex) {
                        slide.classList.add('slide-visible');
                        slide.classList.remove('slide-exit');
                    } else if (index < activeIndex) {
                        slide.classList.remove('slide-visible');
                        slide.classList.add('slide-exit');
                    } else {
                        slide.classList.remove('slide-visible', 'slide-exit');
                    }
                });

                // 2. HANDLE CTA BUTTON (Bind to Stages)
                // If we are in Stage 0, 1, or 2 (Active Slides) -> EXPAND
                if (activeIndex >= 0 && activeIndex <= 2) {
                    if (ctaBtn) ctaBtn.classList.remove('not-active');
                } 
                // If we are in Stage -1 (Start) or 4 (Exit) -> CONTRACT
                else {
                    if (ctaBtn) ctaBtn.classList.add('not-active');
                }
            };

            // TIMELINE
            if (p < 0.10) {
                 setStage(-1); // Contracted
            } else if (p >= 0.10 && p < 0.35) {
                setStage(0);   // Expanded
                applyParallax(0, p, 0.05, 0.25);
            } else if (p >= 0.35 && p < 0.60) {
                setStage(1);   // Expanded
                applyParallax(1, p, 0.25, 0.50);
            } else if (p >= 0.60 && p < 0.8) {
                setStage(2);   // Expanded
                applyParallax(2, p, 0.50, 0.75);
            } else {
                setStage(4);   // Contracted (Exit)
            }
        });
    }
    // EVENTS SECTION
    if(document.querySelector('.events-section')) {
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
    }

    // MENU SECTION
    if(document.querySelector('.menu-section')) {
        new ScrollAnimator('.menu-section', (data) => {
            // ... (Your existing menu logic stays here) ...
            // I'm keeping the structure valid, simply verify this block exists in your file
        });
    }
});