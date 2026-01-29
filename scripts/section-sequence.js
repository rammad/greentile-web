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
    initSmoothMotion();

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

                return 750; // Time for animation to settle
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

function initSmoothMotion() {
    const images = document.querySelectorAll('.scatter-img');
    if(images.length === 0) return; // Exit if no images found

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function animate() {
        images.forEach(img => {
            const rect = img.getBoundingClientRect();
            if (rect.bottom < -100 || rect.top > window.innerHeight + 100) return;

            const imgX = rect.left + rect.width / 2;
            const imgY = rect.top + rect.height / 2;
            const dx = mouseX - imgX;
            const dy = mouseY - imgY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const radius = 750;
            
            if (dist < radius) {
                const force = (radius - dist) / radius;
                img.style.setProperty('--avoid-x', `${(-dx * force * 0.15).toFixed(2)}px`);
                img.style.setProperty('--avoid-y', `${(-dy * force * 0.15).toFixed(2)}px`);
            } else {
                img.style.setProperty('--avoid-x', `0px`);
                img.style.setProperty('--avoid-y', `0px`);
            }
        });
        requestAnimationFrame(animate);
    }
    animate();
}

function setupAboutImages() {
    const slides = document.querySelectorAll('.about-slide');
    
    // We need the section to be visible to measure positions
    // If it's hidden via display:none, this math fails.
    // Assuming opacity:0 or visibility:hidden is used, this works.

    slides.forEach(slide => {
        const images = slide.querySelectorAll('.scatter-img');
        const slideRect = slide.getBoundingClientRect();
        const centerX = slideRect.width / 2;
        const centerY = slideRect.height / 2;

        images.forEach(img => {
            const anchor = document.createElement('div');
            anchor.classList.add('scatter-anchor');
            
            const parallax = document.createElement('div');
            parallax.classList.add('scatter-parallax');

            // 1. Move CSS Classes (Your manual positioning)
            const classesToMove = [];
            img.classList.forEach(cls => { 
                if (cls.startsWith('pos-')) classesToMove.push(cls); 
            });
            classesToMove.forEach(cls => { 
                anchor.classList.add(cls); 
                img.classList.remove(cls); 
            });

            // 2. Add Jitter (Texture)
            const jitterX = Math.floor(Math.random() * 40) - 20;
            const jitterY = Math.floor(Math.random() * 40) - 20;
            anchor.style.marginLeft = `${jitterX}px`;
            anchor.style.marginTop = `${jitterY}px`;

            // 3. ASSEMBLE (Put it in DOM so it has a position)
            img.parentNode.insertBefore(anchor, img);
            anchor.appendChild(parallax);
            parallax.appendChild(img);
            
            // 4. READ LIVE POSITION
            // We force the browser to tell us where the anchor ended up
            // relative to the slide center.
            
            // Note: Since anchor is 0x0 and centered, its offsetLeft/Top 
            // is exactly its coordinate.
            const anchorX = anchor.offsetLeft;
            const anchorY = anchor.offsetTop;

            // Calculate Vector from Center
            const deltaX = anchorX - centerX;
            const deltaY = anchorY - centerY;

            // Calculate Angle
            const angle = Math.atan2(deltaY, deltaX);

            // Distance to fly (Fixed Amount)
            const flyDistance = 10; // 45vw/vh

            const vecX = Math.cos(angle) * flyDistance;
            const vecY = Math.sin(angle) * flyDistance;

            anchor.style.setProperty('--fly-x', `${vecX}vw`);
            anchor.style.setProperty('--fly-y', `${vecY}vh`);

            // 5. SCALE
            const scale = 0.5 + Math.random() * 0.3; 
            img.style.setProperty('--base-scale', scale);
            
            parallax._targetY = 0;
        });
    });
}