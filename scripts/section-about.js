/* =========================================
   STEP 2: ABOUT (Scroll Flow Animations)
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
    // 1. SELECTORS
    const aboutSection = document.querySelector('.about');
    if(!aboutSection) return;

    const slides = document.querySelectorAll('.about-slide');
    const cta = document.querySelector('.about-persistent-cta');

    // 2. SETUP (Run once)
    setupAboutImages(); 

    // 3. HELPER: Set State on Anchors in a specific slide
    const setSlideState = (index, stateClass, snap = false) => {
        const s = slides[index];
        if(!s) return;
        
        const anchors = s.querySelectorAll('.scatter-anchor');
        
        anchors.forEach(anchor => {
            // Remove all motion classes
            anchor.classList.remove('state-center', 'state-exploded', 'state-up', 'state-down');
            
            // If Snap is true, we kill transition, apply class, flush, then restore
            if (snap) {
                anchor.style.transition = 'none';
                anchor.classList.add(stateClass);
                void anchor.offsetWidth; // Flush
                anchor.style.transition = '';
            } else {
                anchor.classList.add(stateClass);
            }
        });

        // Toggle Text Visibility
        if (stateClass === 'state-center') {
            s.classList.add('slide-visible');
        } else {
            s.classList.remove('slide-visible');
        }
    };

    // 4. DEFINE SCROLL STEPS
    const aboutSteps = [0, 1, 2].map(index => {
        return {
            id: `about-${index}`,
            
            onEnter: (direction) => {
                aboutSection.classList.add('is-active');
                if(cta) cta.classList.remove('not-active');

                // --- LOGIC PER SLIDE ---
                
                if (index === 0) { 
                    // SLIDE 1: Implode from Sides
                    // If coming from top (load), snap to exploded first
                    if (direction === 'down') setSlideState(0, 'state-exploded', true); 
                    
                    // Animate to Center
                    requestAnimationFrame(() => setSlideState(0, 'state-center'));
                } 
                
                else if (index === 1) {
                    // SLIDE 2: Scroll from Bottom
                    if (direction === 'down') {
                        // Entering from top: Snap to bottom, then move center
                        setSlideState(1, 'state-down', true);
                    } else {
                        // Entering from bottom (backwards): Snap to top, move center
                        setSlideState(1, 'state-up', true);
                    }
                    requestAnimationFrame(() => setSlideState(1, 'state-center'));
                } 
                
                else if (index === 2) {
                    // SLIDE 3: Scroll from Bottom
                    if (direction === 'down') setSlideState(2, 'state-down', true);
                    requestAnimationFrame(() => setSlideState(2, 'state-center'));
                }

                return 1200; // Time for animation to settle
            },
            
            onExit: (direction) => {
                // --- EXIT LOGIC ---
                
                if (index === 0) {
                    if (direction === 'down') setSlideState(0, 'state-up'); // Exit Up
                    else setSlideState(0, 'state-exploded'); // Reverse (Explode)
                }
                
                else if (index === 1) {
                    if (direction === 'down') setSlideState(1, 'state-up'); // Exit Up
                    else setSlideState(1, 'state-down'); // Reverse (Down)
                }
                
                else if (index === 2) {
                    if (direction === 'down') {
                        // LAST SLIDE EXIT -> EXPLODE
                        setSlideState(2, 'state-exploded');
                        
                        // Hide Section after animation
                        if(cta) cta.classList.add('not-active');
                        setTimeout(() => aboutSection.classList.remove('is-active'), 800);
                    } else {
                        setSlideState(2, 'state-down'); // Reverse
                    }
                }
                
                // Special case: Leaving Top of Slide 0
                if (index === 0 && direction === 'up') {
                    if(cta) cta.classList.add('not-active');
                    aboutSection.classList.remove('is-active');
                }

                return 800; 
            }
        };
    });

    if (window.ScrollManager) {
        ScrollManager.addSteps(aboutSteps);
    } else {
        console.error("ScrollManager not found.");
    }
});

/* =========================================
   IMAGE SETUP UTILITY (Unchanged)
   ========================================= */
function setupAboutImages() {
    const images = document.querySelectorAll('.about-slide > .scatter-img');

    images.forEach(img => {
        const anchor = document.createElement('div');
        anchor.classList.add('scatter-anchor');
        
        const parallax = document.createElement('div');
        parallax.classList.add('scatter-parallax');

        // Transfer Classes
        const classesToMove = [];
        img.classList.forEach(cls => { 
            if (cls.startsWith('pos-')) classesToMove.push(cls); 
        });
        classesToMove.forEach(cls => { 
            anchor.classList.add(cls); 
            img.classList.remove(cls); 
        });

        // Jitter
        const jitterX = Math.floor(Math.random() * 40) - 20;
        const jitterY = Math.floor(Math.random() * 80) - 40;
        anchor.style.marginLeft = `${jitterX}px`;
        anchor.style.marginTop = `${jitterY}px`;
        
        // Vectors
        let flyX = '0px', flyY = '0px';
        const distV = '30vh'; 
        const distH = '20vw';  

        if (anchor.classList.contains('pos-1')) { flyX = `-${distH}`; flyY = `-${distV}`; } 
        else if (anchor.classList.contains('pos-2')) { flyX = `${distH}`; flyY = `-${distV}`; } 
        else if (anchor.classList.contains('pos-3')) { flyX = `-${distH}`; flyY = `${distV}`; } 
        else if (anchor.classList.contains('pos-4')) { flyX = `${distH}`; flyY = `${distV}`; } 
        else if (anchor.classList.contains('pos-5')) { flyX = '0px'; flyY = `-${distV}`; } 
        else if (anchor.classList.contains('pos-6')) { flyX = '0px'; flyY = `${distV}`; } 
        else if (anchor.classList.contains('pos-7')) { flyX = `-${distH}`; flyY = '0px'; } 
        else if (anchor.classList.contains('pos-8')) { flyX = `${distH}`; flyY = '0px'; }
        
        anchor.style.setProperty('--fly-x', flyX);
        anchor.style.setProperty('--fly-y', flyY);

        const scale = 0.4 + Math.random() * 0.4; 
        img.style.setProperty('--base-scale', scale);
        
        img.parentNode.insertBefore(anchor, img);
        anchor.appendChild(parallax);
        parallax.appendChild(img);
        
        parallax._targetY = 0;
    });
}