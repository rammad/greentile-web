/* =========================================
   STEP 2: ABOUT (Fixing the Exit Pop)
   ========================================= */

(() => { 
    const { wait, waitForTransition, lockTime } = window.AnimationUtils;

    document.addEventListener('DOMContentLoaded', () => {
        const aboutSection = document.querySelector('.about');
        if(!aboutSection) return;

        const slides = document.querySelectorAll('.about-slide');
        
        let currentSlideIndex = -1;

        setupAboutImages(); 
        initSmoothMotion();

        /* --- HELPER 1: JUST THE TEXT --- */
        const toggleSlideText = (index, isVisible) => {
            const s = slides[index];
            if (!s) return;
            if (isVisible) s.classList.add('slide-visible');
            else s.classList.remove('slide-visible');
        };

        /* --- HELPER 2: JUST THE IMAGES --- */
        const moveSlideImages = (index, stateClass, snap = false) => {
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
        };

        /* --- HELPER 3: RESET OTHERS (Updated) --- */
        // Now accepts 'ignoreIndex' to prevent killing the exiting slide's animation
        const forceResetSlides = (activeIdx, ignoreIdx = -1) => {
            slides.forEach((s, i) => {
                // Skip the active slide AND the one currently animating out
                if (i === activeIdx || i === ignoreIdx) return; 
                
                // 1. Hide Text
                s.classList.remove('slide-visible');

                // 2. Hide Nested CTA
                const localCTA = s.querySelector('.cta-btn');
                if (localCTA) {
                    localCTA.classList.remove('is-visible');
                    localCTA.style.transition = 'none';
                    void localCTA.offsetWidth;
                    localCTA.style.transition = '';
                }
                
                // 3. Reset Images (Snap Up)
                const anchors = s.querySelectorAll('.scatter-anchor');
                anchors.forEach(anchor => {
                    anchor.style.transition = 'none';
                    anchor.classList.remove('state-center'); 
                    anchor.classList.add('state-up'); 
                });
                void s.offsetWidth; 
                anchors.forEach(anchor => anchor.style.transition = '');
            });
        };

        /* --- STEPS --- */
        const aboutSteps = Array.from(slides).map((slide, index) => {
            const localCTA = slide.querySelector('.cta-btn');

            return {
                id: `about-${index}`,
                
                onEnter: async (direction) => {
                    aboutSection.classList.add('is-active');
                    currentSlideIndex = index; 
                    
                    // CALCULATE PREVIOUS SLIDE (To protect it from reset)
                    let prevIndex = -1;
                    if (direction === 'down') prevIndex = index - 1;
                    else if (direction === 'up') prevIndex = index + 1;

                    // Reset everything EXCEPT the one we just left
                    forceResetSlides(index, prevIndex); 

                    // 1. SETUP START POSITIONS (Hidden)
                    if (index === 0) {
                        if (direction === 'down') {
                            moveSlideImages(0, 'state-exploded', true);
                        } else {
                            moveSlideImages(0, 'state-up', true);
                        }
                    } else {
                        const startState = (direction === 'down') ? 'state-down' : 'state-up';
                        moveSlideImages(index, startState, true);
                    }

                    // 2. TEXT FADE IN
                    toggleSlideText(index, true);

                    // 3. STAGGER
                    await wait(300);

                    // 4. IMAGES FLY IN
                    moveSlideImages(index, 'state-center');

                    // 5. CTA FADE IN
                    if (localCTA) {
                        localCTA.classList.add('is-visible');
                    }

                    //await wait(lockTime);
                },
                
                onExit: async (direction) => {
                    // 1. HIDE CTA & TEXT
                    if (localCTA) localCTA.classList.remove('is-visible');
                    toggleSlideText(index, false);

                    // 2. CALCULATE EXIT
                    let exitState = (direction === 'down') ? 'state-up' : 'state-down';
                    if ((index === 0 && direction === 'up') || 
                        (index === slides.length - 1 && direction === 'down')) {
                        exitState = 'state-exploded';
                    }

                    await wait(300); 

                    // 3. MOVE IMAGES OUT (This will now play fully!)
                    moveSlideImages(index, exitState);
                    
                    //await wait(lockTime);

                    if (exitState === 'state-exploded') {
                        aboutSection.classList.remove('is-active');
                    }
                }
            };
        });

        if (window.ScrollManager) {
            ScrollManager.addSteps(aboutSteps);
        }
    });

    /* ... (Physics Functions Unchanged) ... */
    function initSmoothMotion() {
        const images = document.querySelectorAll('.scatter-img');
        if(images.length === 0) return; 
        let mouseX = window.innerWidth / 2;
        let mouseY = window.innerHeight / 2;
        window.addEventListener('mousemove', (e) => { mouseX = e.clientX; mouseY = e.clientY; });
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
                img.classList.forEach(cls => { if (cls.startsWith('pos-')) classesToMove.push(cls); });
                classesToMove.forEach(cls => { anchor.classList.add(cls); img.classList.remove(cls); });
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
                const flyDistance = 5; 
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
})();