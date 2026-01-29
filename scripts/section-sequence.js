/* =========================================
   SECTION: SEQUENCE (Unified Logic)
   Uses Original Physics (Distance: 10, Time: 1.5s)
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
    initSmoothMotion();

    const sequences = document.querySelectorAll('.sequence-section');
    if (sequences.length === 0) return;

    sequences.forEach(section => {
        // Run Logic immediately to register Steps
        initSequenceSection(section);
    });
});

function initSequenceSection(section) {
    const sectionId = section.id || 'seq-' + Math.random().toString(36).substr(2, 5);

    // 1. SETUP IMAGES 
    const images = Array.from(section.querySelectorAll('.scatter-img'));
    
    // Delay geometry calculation to ensure CSS positions (negatives) are painted
    setTimeout(() => {
        setupOriginalScatterImages(section, images);
    }, 100);

    // 2. IDENTIFY STEPS
    const contentBlocks = section.querySelectorAll('.sequence-content [data-step]');
    let maxStep = 0;
    const allStepped = section.querySelectorAll('[data-step]');
    allStepped.forEach(el => {
        const s = parseInt(el.getAttribute('data-step'));
        if (s > maxStep) maxStep = s;
    });
    const totalSteps = maxStep + 1;

    // 3. DEFINE SCROLL STEPS
    const steps = [];

    for (let i = 0; i < totalSteps; i++) {
        steps.push({
            id: `${sectionId}-${i}`,
            
            onEnter: (direction) => {
                section.classList.add('is-active');

                // A. UPDATE IMAGES
                images.forEach(img => {
                    const imgStep = parseInt(img.getAttribute('data-step'));
                    const anchor = img.parentElement; 
                    if (!anchor || !anchor.classList.contains('scatter-anchor')) return;

                    // Reset states
                    anchor.classList.remove('state-center', 'state-exploded', 'state-up', 'state-down');

                    // Force Reflow
                    void anchor.offsetWidth; 

                    if (imgStep === i) {
                        // Current: Center
                        anchor.classList.add('state-center');
                    } 
                    else if (imgStep < i) {
                        // Previous: Explode (if going up) or Up (if going down)
                        if (direction === 'down') anchor.classList.add('state-up');
                        else anchor.classList.add('state-exploded');
                    } 
                    else if (imgStep > i) {
                        // Next: Down
                        anchor.classList.add('state-down'); 
                    }
                });

                // B. UPDATE TEXT
                contentBlocks.forEach(block => {
                    const blockStep = parseInt(block.getAttribute('data-step'));
                    if (blockStep === i) block.classList.add('is-active');
                    else block.classList.remove('is-active');
                });

                return 1000;
            },

            onExit: (direction) => {
                if ((i === 0 && direction === 'up') || (i === totalSteps - 1 && direction === 'down')) {
                    section.classList.remove('is-active');
                }
                
                // Exit States
                images.forEach(img => {
                     const imgStep = parseInt(img.getAttribute('data-step'));
                     const anchor = img.parentElement;
                     if (!anchor) return;

                     if (imgStep === i) {
                         anchor.classList.remove('state-center');
                         if (direction === 'down') anchor.classList.add('state-up');
                         else anchor.classList.add('state-down');
                         
                         // Special Exit: Explode on boundaries
                         if ((i === 0 && direction === 'up') || (i === totalSteps - 1 && direction === 'down')) {
                             anchor.classList.remove('state-up', 'state-down');
                             anchor.classList.add('state-exploded');
                         }
                     }
                });

                return 800;
            }
        });
    }

    if (window.ScrollManager) {
        ScrollManager.addSteps(steps);
    }
}


/* --- THE ORIGINAL MATH --- */
function setupOriginalScatterImages(section, images) {
    // Center point of the container
    // We use innerWidth/Height because the section is 100vh/100vw absolute
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    images.forEach(img => {
        if(img.parentElement.classList.contains('scatter-anchor')) return;

        const anchor = document.createElement('div');
        anchor.classList.add('scatter-anchor');
        
        // 1. Move CSS Classes
        const classesToMove = [];
        img.classList.forEach(cls => { 
            if (cls.startsWith('pos-')) classesToMove.push(cls); 
        });
        classesToMove.forEach(cls => { 
            anchor.classList.add(cls); 
            img.classList.remove(cls); 
        });

        // 2. Add Jitter
        const jitterX = Math.floor(Math.random() * 40) - 20;
        const jitterY = Math.floor(Math.random() * 40) - 20;
        anchor.style.marginLeft = `${jitterX}px`;
        anchor.style.marginTop = `${jitterY}px`;

        // 3. Assemble
        img.parentNode.insertBefore(anchor, img);
        anchor.appendChild(img);

        // 4. Calculate Explosion Vector
        // This measures the 'pos-X' class location relative to window
        const anchorX = anchor.offsetLeft;
        const anchorY = anchor.offsetTop;

        const deltaX = anchorX - centerX;
        const deltaY = anchorY - centerY;
        const angle = Math.atan2(deltaY, deltaX);
        
        // RESTORED DISTANCE: 10 (vw/vh) based on your uploaded file
        const flyDistance = 10; 

        const vecX = Math.cos(angle) * flyDistance;
        const vecY = Math.sin(angle) * flyDistance;

        anchor.style.setProperty('--fly-x', `${vecX}vw`);
        anchor.style.setProperty('--fly-y', `${vecY}vh`);

        // 5. Scale
        const scale = 0.5 + Math.random() * 0.3; 
        img.style.setProperty('--base-scale', scale);
        
        // Initial State: Exploded
        anchor.classList.add('state-exploded');
    });
}

function initSmoothMotion() {
    const images = document.querySelectorAll('.scatter-img');
    if(images.length === 0) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function animate() {
        const activeSection = document.querySelector('.sequence-section.is-active');
        if(!activeSection) {
            requestAnimationFrame(animate);
            return;
        }

        const activeImages = activeSection.querySelectorAll('.scatter-img');

        activeImages.forEach(img => {
            const rect = img.getBoundingClientRect();
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