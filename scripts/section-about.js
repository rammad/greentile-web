/* =========================================
   SECTION: ABOUT
   Handles: Image Setup, Parallax Calculations, Scroll Sequence
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
    if(!document.querySelector('.about')) return;

    setupAboutImages();
    initAboutScroll();
});

function setupAboutImages() {
    const images = document.querySelectorAll('.about-slide > .scatter-img');

    images.forEach(img => {
        // Create Wrappers: Anchor (Pos) -> Parallax (Scroll) -> Img (Mouse)
        const anchor = document.createElement('div');
        anchor.classList.add('scatter-anchor');
        
        const parallax = document.createElement('div');
        parallax.classList.add('scatter-parallax');

        // Move Pos Classes
        const classesToMove = [];
        img.classList.forEach(cls => { if (cls.startsWith('pos-')) classesToMove.push(cls); });
        classesToMove.forEach(cls => { anchor.classList.add(cls); img.classList.remove(cls); });

        // Randomize
        const jitterX = Math.floor(Math.random() * 100) - 50;
        const jitterY = Math.floor(Math.random() * 100) - 50;
        const scale = 0.7 + Math.random() * 0.6;

        anchor.style.marginLeft = `${jitterX}px`;
        anchor.style.marginTop = `${jitterY}px`;
        
        // --- FLY VECTORS (Restored Full Logic) ---
        let flyX = '0px', flyY = '0px';
        const distV = '25vh', distH = '15vw';  

        // 1. TOP LEFT
        if (anchor.classList.contains('pos-1')) {       
            flyX = `-${distH}`; flyY = `-${distV}`;
        } 
        // 2. TOP RIGHT
        else if (anchor.classList.contains('pos-2')) { 
            flyX = `${distH}`; flyY = `-${distV}`;
        } 
        // 3. BOTTOM LEFT
        else if (anchor.classList.contains('pos-3')) { 
            flyX = `-${distH}`; flyY = `${distV}`;
        } 
        // 4. BOTTOM RIGHT
        else if (anchor.classList.contains('pos-4')) { 
            flyX = `${distH}`; flyY = `${distV}`;
        } 
        // 5. TOP CENTER
        else if (anchor.classList.contains('pos-5')) { 
            flyX = '0px'; flyY = `-${distV}`;
        } 
        // 6. BOTTOM CENTER
        else if (anchor.classList.contains('pos-6')) { 
            flyX = '0px'; flyY = `${distV}`;
        } 
        // 7. LEFT CENTER
        else if (anchor.classList.contains('pos-7')) { 
            flyX = `-${distH}`; flyY = '0px';
        } 
        // 8. RIGHT CENTER
        else if (anchor.classList.contains('pos-8')) { 
            flyX = `${distH}`; flyY = '0px';
        }
        // FALLBACK (Down)
        else { 
            flyX = '0px'; flyY = `${distV}`; 
        } 

        anchor.style.setProperty('--fly-x', flyX);
        anchor.style.setProperty('--fly-y', flyY);

        // Init Vars
        parallax._targetY = 0;
        parallax._currentY = 0;
        parallax.style.setProperty('--scroll-y', '0px');
        
        img.style.setProperty('--base-scale', scale);
        img.style.setProperty('--avoid-x', '0px');
        img.style.setProperty('--avoid-y', '0px');

        img.parentNode.insertBefore(anchor, img);
        anchor.appendChild(parallax);
        parallax.appendChild(img);
    });
}

function initAboutScroll() {
    const slides = document.querySelectorAll('.about-slide');
    const ctaBtn = document.querySelector('.about-persistent-cta');
    const cachedParallaxWrappers = [
        document.querySelectorAll('#slide-1 .scatter-parallax'),
        document.querySelectorAll('#slide-2 .scatter-parallax'),
        document.querySelectorAll('#slide-3 .scatter-parallax')
    ];

    // Helper to update parallax targets
    const updateParallaxTargets = (slideIndex, progress, start, end) => {
        const wrappers = cachedParallaxWrappers[slideIndex];
        if(!wrappers) return;
        const localP = (progress - start) / (end - start);
        const moveY = 25 - (localP * 50); 
        wrappers.forEach(w => w._targetY = moveY);
    };

    new ScrollAnimator('.about', (data) => {
        const p = data.stickyProgress; 
        
        const setStage = (activeIndex) => {
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

            // CTA Button Logic
            if (ctaBtn) {
                (activeIndex >= 0 && activeIndex <= 2) 
                    ? ctaBtn.classList.remove('not-active') 
                    : ctaBtn.classList.add('not-active');
            }
        };

        // Timeline
        if (p < 0.10) {
             setStage(-1);
        } else if (p >= 0.10 && p < 0.35) {
            setStage(0); updateParallaxTargets(0, p, 0.05, 0.25);
        } else if (p >= 0.35 && p < 0.60) {
            setStage(1); updateParallaxTargets(1, p, 0.25, 0.50);
        } else if (p >= 0.60 && p < 0.8) {
            setStage(2); updateParallaxTargets(2, p, 0.50, 0.75);
        } else {
            setStage(4);
        }
    });
}