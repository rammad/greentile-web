/* =========================================
   STEP 2: ABOUT (Restored Functionality)
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
    // 1. SELECTORS
    const aboutSection = document.querySelector('.about');
    if(!aboutSection) return;

    const slides = document.querySelectorAll('.about-slide');
    const cta = document.querySelector('.about-persistent-cta');

    // 2. SETUP (Run once)
    setupAboutImages(); 

    // 3. HELPERS
    const showSlide = (index) => {
        slides.forEach((s, i) => {
            if (i === index) {
                s.classList.add('slide-visible');
                s.classList.remove('slide-exit');
            } else {
                s.classList.remove('slide-visible');
                s.classList.add('slide-exit'); 
            }
        });
    };

    const setExplosionState = (shouldExplode) => {
        const anchors = document.querySelectorAll('.scatter-anchor');
        anchors.forEach(anchor => {
            if (shouldExplode) {
                anchor.classList.add('is-exploded');
            } else {
                anchor.classList.remove('is-exploded');
            }
        });
    };

    // 4. DEFINE SCROLL STEPS
    const aboutSteps = [0, 1, 2].map(index => {
        return {
            id: `about-${index}`,
            
            onEnter: (direction) => {
                aboutSection.classList.add('is-active');
                if(cta) cta.classList.remove('not-active');
                
                showSlide(index);

                // Slide 0 = Imploded (Center), Slide 1+ = Exploded (Out)
                if (index === 0) {
                    setExplosionState(false); 
                } else {
                    setExplosionState(true);
                }

                return 1000; 
            },
            
            onExit: (direction) => {
                const isLeavingTop = (index === 0 && direction === 'up');
                const isLeavingBottom = (index === 2 && direction === 'down');

                if (isLeavingTop || isLeavingBottom) {
                    if(cta) cta.classList.add('not-active');
                    
                    if (isLeavingBottom) {
                        setTimeout(() => aboutSection.classList.remove('is-active'), 600);
                    } else {
                        aboutSection.classList.remove('is-active');
                    }
                }
                return 600; 
            }
        };
    });

    // 5. REGISTER
    if (window.ScrollManager) {
        ScrollManager.addSteps(aboutSteps);
    } else {
        console.error("ScrollManager not found.");
    }
});

/* =========================================
   IMAGE SETUP UTILITY (Original Logic)
   ========================================= */
function setupAboutImages() {
    const images = document.querySelectorAll('.about-slide > .scatter-img');

    images.forEach(img => {
        // 1. Create Wrappers
        const anchor = document.createElement('div');
        anchor.classList.add('scatter-anchor');
        
        const parallax = document.createElement('div');
        parallax.classList.add('scatter-parallax');

        // 2. Transfer Classes (The original way)
        // We move pos-X from img to anchor so CSS handles position
        const classesToMove = [];
        img.classList.forEach(cls => { 
            if (cls.startsWith('pos-')) classesToMove.push(cls); 
        });
        classesToMove.forEach(cls => { 
            anchor.classList.add(cls); 
            img.classList.remove(cls); 
        });

        // 3. Randomize Jitter (Texture only, not positioning)
        const jitterX = Math.floor(Math.random() * 40) - 20;
        const jitterY = Math.floor(Math.random() * 40) - 20;

        anchor.style.marginLeft = `${jitterX}px`;
        anchor.style.marginTop = `${jitterY}px`;
        
        // 4. CALCULATE FLY VECTORS (For Explosion)
        let flyX = '0px', flyY = '0px';
        const distV = '30vh'; 
        const distH = '20vw';  

        // Determine direction based on class
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

        // 5. SCALE
        const scale = 0.4 + Math.random() * 0.4; // 0.4 to 0.8 size
        img.style.setProperty('--base-scale', scale);
        
        // 6. ASSEMBLE
        img.parentNode.insertBefore(anchor, img);
        anchor.appendChild(parallax);
        parallax.appendChild(img);
        
        parallax._targetY = 0;
    });
}