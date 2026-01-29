/* =========================================
   STEP 2: ABOUT / MENU (Unified Logic)
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
    const aboutSection = document.querySelector('.about');
    if(!aboutSection) return;

    const slides = document.querySelectorAll('.about-slide');
    
    // NEW: Get the persistent menu items
    const menuItems = document.querySelectorAll('.menu-list-overlay .menu-item');

    // SETUP
    setupAboutImages(); 
    initSmoothMotion();

    // HELPER: Set Anchor States
    const setSlideState = (index, stateClass, snap = false) => {
        const s = slides[index];
        if(!s) return;
        
        const anchors = s.querySelectorAll('.scatter-anchor');
        anchors.forEach(anchor => {
            anchor.classList.remove('state-center', 'state-exploded', 'state-up', 'state-down');
            if (snap) {
                anchor.style.transition = 'none';
                anchor.classList.add(stateClass);
                void anchor.offsetWidth; 
                anchor.style.transition = '';
            } else {
                anchor.classList.add(stateClass);
            }
        });

        // Toggle Content Visibility
        if (stateClass === 'state-center') {
            s.classList.add('slide-visible');
        } else {
            s.classList.remove('slide-visible');
        }
    };

    // HELPER: Update Menu Highlight
    const updateMenuHighlight = (activeIndex) => {
        menuItems.forEach((item, i) => {
            if (i === activeIndex) item.classList.add('active');
            else item.classList.remove('active');
        });
    };

    // DEFINE STEPS
    // Map over slides (we expect 4 slides now)
    const aboutSteps = Array.from(slides).map((slide, index) => {
        
        // Find Local CTA
        const localCTA = slide.querySelector('.cta-btn');

        return {
            id: `about-${index}`,
            
            onEnter: (direction) => {
                aboutSection.classList.add('is-active');

                // 2. Activate Local CTA
                if(localCTA) setTimeout(() => localCTA.classList.remove('not-active'), 100);

                // 3. Physics Logic
                if (index === 0) { 
                    if (direction === 'down') {
                        // 1. SNAP MENU ITEMS HIDDEN (Preparation)
                        menuItems.forEach(item => {
                            item.style.transition = 'none';
                            item.style.opacity = '0';
                            item.style.filter = 'blur(10px)';
                            item.style.transform = 'translateY(20px)';
                        });

                        updateMenuHighlight(-1);

                        // Force Reflow
                        void aboutSection.offsetWidth;

                        // 2. CASCADE MENU IN (Animation)
                        menuItems.forEach((item, i) => {
                            // Define entrance physics (including color just in case)
                            item.style.transition = 'opacity 0.6s ease, filter 0.6s ease, transform 0.6s cubic-bezier(0.19, 1, 0.22, 1), color 1.0s ease';
                            
                            // Trigger the reveal
                            setTimeout(() => {
                                item.style.opacity = '1'; 
                                item.style.filter = 'blur(0px)';
                                item.style.transform = 'translateY(0)';
                            }, i * 150); 

                            // CLEANUP: Remove inline styles after animation ends.
                            // This ensures your CSS file takes back control for future color swaps.
                            setTimeout(() => {
                                item.style.transition = '';
                            }, (i * 150) + 700);
                        });

                        // 3. ANIMATE REST OF SLIDE (Delayed)
                        // Wait 600ms for menu to finish, then explode images in
                        setSlideState(0, 'state-exploded', true); 
                        setTimeout(() => {
                            setSlideState(0, 'state-center');
                        }, 1200);

                        setTimeout(() =>{
                            updateMenuHighlight(index);
                        }, 1200);

                    } else {
                        // Coming back UP from Slide 1 (No cascade needed)
                        requestAnimationFrame(() => setSlideState(0, 'state-center'));

                        setTimeout(() =>{
                            updateMenuHighlight(index);
                        }, 100);
                    }
                }
                else {
                    if (direction === 'down') setSlideState(index, 'state-down', true);
                    else setSlideState(index, 'state-up', true);
                    requestAnimationFrame(() => setSlideState(index, 'state-center'));

                    setTimeout(() =>{
                        updateMenuHighlight(index);
                    }, 100);
                }                

                return 750;
            },
            
            onExit: (direction) => {
                if(localCTA) localCTA.classList.add('not-active');

                if (direction === 'down') {
                    setSlideState(index, 'state-up');
                    
                    // IF LAST SLIDE
                    if (index === slides.length - 1) {
                        setSlideState(index, 'state-exploded');
                        setTimeout(() => aboutSection.classList.remove('is-active'), 800);
                    }
                } else {
                    setSlideState(index, 'state-down'); 
                    
                    // IF FIRST SLIDE
                    if (index === 0) {
                        setSlideState(0, 'state-exploded');
                        aboutSection.classList.remove('is-active');
                    }
                }

                return 800; 
            }
        };
    });

    if (window.ScrollManager) {
        ScrollManager.addSteps(aboutSteps);
    }
});

/* --- PHYSICS HELPERS (Unchanged) --- */
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

            const classesToMove = [];
            img.classList.forEach(cls => { 
                if (cls.startsWith('pos-')) classesToMove.push(cls); 
            });
            classesToMove.forEach(cls => { 
                anchor.classList.add(cls); 
                img.classList.remove(cls); 
            });

            const jitterX = Math.floor(Math.random() * 40) - 20;
            const jitterY = Math.floor(Math.random() * 40) - 20;
            anchor.style.marginLeft = `${jitterX}px`;
            anchor.style.marginTop = `${jitterY}px`;

            img.parentNode.insertBefore(anchor, img);
            anchor.appendChild(parallax);
            parallax.appendChild(img);
            
            const anchorX = anchor.offsetLeft;
            const anchorY = anchor.offsetTop;
            const deltaX = anchorX - centerX;
            const deltaY = anchorY - centerY;
            const angle = Math.atan2(deltaY, deltaX);
            const flyDistance = 10; 
            const vecX = Math.cos(angle) * flyDistance;
            const vecY = Math.sin(angle) * flyDistance;

            anchor.style.setProperty('--fly-x', `${vecX}vw`);
            anchor.style.setProperty('--fly-y', `${vecY}vh`);
            const scale = 0.5 + Math.random() * 0.3; 
            img.style.setProperty('--base-scale', scale);
            parallax._targetY = 0;
        });
    });
}