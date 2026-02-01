/* =========================================
   STEP 2: ABOUT / MENU (Fixed Skipping & Popping)
   ========================================= */

(() => { 

    const { wait, waitForTransition } = window.AnimationUtils;

    document.addEventListener('DOMContentLoaded', () => {
        const aboutSection = document.querySelector('.about');
        if(!aboutSection) return;

        const slides = document.querySelectorAll('.about-slide');
        const menuItems = document.querySelectorAll('.menu-list-overlay .menu-item');
        
        let currentSlideIndex = -1;

        setupAboutImages(); 
        initSmoothMotion();


        /* --- HELPER: RESET OTHERS --- */
        const forceResetSlides = (activeIdx) => {
            slides.forEach((s, i) => {
                if (i === activeIdx) return; 

                const anchors = s.querySelectorAll('.scatter-anchor');
                s.classList.remove('slide-visible');
                
                anchors.forEach(anchor => {
                    anchor.style.transition = 'none';
                    anchor.classList.remove('state-center'); 
                    anchor.classList.add('state-up'); 
                });
                
                void s.offsetWidth; 
                anchors.forEach(anchor => anchor.style.transition = '');
            });
        };


        /* --- HELPER: TRANSITION SLIDE --- */
        const transitionSlide = (index, stateClass, snap = false) => {
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

            if (stateClass === 'state-center') s.classList.add('slide-visible');
            else s.classList.remove('slide-visible');
        };


        /* --- HELPER: ASYNC MENU REVEAL --- */
        const revealMenu = async () => {
            menuItems.forEach(item => {
                item.style.transition = 'none';
                item.style.opacity = '0';
                item.style.filter = 'blur(10px)';
                item.style.transform = 'translateY(20px)';
            });
            void aboutSection.offsetWidth;

            for (let i = 0; i < menuItems.length; i++) {
                if (currentSlideIndex !== 0) return; 

                const item = menuItems[i];
                item.style.transition = 'opacity 0.6s ease, filter 0.6s ease, transform 0.6s cubic-bezier(0.19, 1, 0.22, 1)';
                item.style.opacity = '1';
                item.style.filter = 'blur(0px)';
                item.style.transform = 'translateY(0)';
                
                await wait(100); 
            }

            await wait(600);
            if (currentSlideIndex === 0) {
                menuItems.forEach(item => item.style.transition = '');
            }
        };

        const updateMenuHighlight = (activeIndex) => {
            menuItems.forEach((item, i) => {
                if (i === activeIndex) item.classList.add('active');
                else item.classList.remove('active');
            });
        };


        /* --- STEP DEFINITIONS --- */
        const aboutSteps = Array.from(slides).map((slide, index) => {
            const localCTA = slide.querySelector('.cta-btn');

            return {
                id: `about-${index}`,
                
                // --- ENTER SCENE ---
                onEnter: async (direction) => {
                    aboutSection.classList.add('is-active');
                    currentSlideIndex = index; 

                    forceResetSlides(index); 

                    if(localCTA) setTimeout(() => localCTA.classList.remove('not-active'), 50);

                    // --- SLIDE 0 LOGIC ---
                    if (index === 0) {
                        if (direction === 'down') {
                            // ENTERING FROM TOP (Normal)
                            updateMenuHighlight(-1);
                            revealMenu(); 
                            
                            transitionSlide(0, 'state-exploded', true);
                            await wait(50); 
                            transitionSlide(0, 'state-center'); 

                        } else {
                            // ENTERING FROM BOTTOM (Backwards)
                            // FIX: Animate smoothly instead of popping
                            transitionSlide(0, 'state-up', true); // Snap to top
                            void slide.offsetWidth; 
                            transitionSlide(0, 'state-center'); // Animate down
                        }
                    } 
                    // --- OTHER SLIDES ---
                    else {
                        const startState = (direction === 'down') ? 'state-down' : 'state-up';
                        transitionSlide(index, startState, true); 
                        void slide.offsetWidth; 
                        transitionSlide(index, 'state-center'); 
                    }

                    updateMenuHighlight(index);
                    
                    // CRITICAL FIX: ENTER SAFETY LOCK
                    // We wait 400ms here. This keeps the scroll locked while the
                    // new slide is animating in. This prevents the "Skip" bug
                    // where fast scrolling jumps over a slide before it appears.
                    await wait(400);
                },
                
                // --- EXIT SCENE ---
                onExit: async (direction) => {
                    if(localCTA) localCTA.classList.add('not-active');

                    let exitState = (direction === 'down') ? 'state-up' : 'state-down';
                    
                    if ((index === 0 && direction === 'up') || 
                        (index === slides.length - 1 && direction === 'down')) {
                        exitState = 'state-exploded';
                    }

                    transitionSlide(index, exitState);

                    // EXIT SAFETY LOCK
                    // reduced to 300ms to feel responsive, since we added the 400ms lock on enter.
                    await wait(300); 

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

    /* --- PHYSICS FUNCTIONS --- */
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

})();