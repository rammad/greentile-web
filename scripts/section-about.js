/* =========================================
   SECTION: ABOUT (Persistent Menu Edition)
   ========================================= */

(() => { 
    const { wait, staggerTime } = window.AnimationUtils;

    document.addEventListener('DOMContentLoaded', () => {
        const aboutSection = document.querySelector('.about');
        if(!aboutSection) return;

        const slides = document.querySelectorAll('.about-slide');
        
        setupAboutImages(); 
        initSmoothMotion();

        /* --- HELPER 1: UPDATE GLOBAL MENU --- */
        const updateGlobalMenu = (activeIndex) => {
            const items = document.querySelectorAll('.about-menu-persistent .menu-item');
            if (items.length === 0) return; // Safety for Home Page

            items.forEach((item, index) => {
                // Use data-index if available, fallback to DOM index
                const itemIndex = parseInt(item.getAttribute('data-index') || index);
                if (itemIndex === activeIndex) item.classList.add('is-active');
                else item.classList.remove('is-active');
            });
        };

        const animateMenuIn = async (enable) => {
            const items = document.querySelectorAll('.about-menu-persistent .menu-item');
            if (items.length === 0) return;

            if(enable && items[0].classList.contains('is-visible')) return;
            else if (!enable && !items[0].classList.contains('is-visible')) return;

            for (let i = 0; i < items.length; i++) {
                if(enable) {
                    items[i].classList.add('is-visible');
                    await wait(staggerTime);
                }
                else {
                    items[i].classList.remove('is-visible');
                }
            }
        };

        /* --- HELPER 2: RESET OTHERS --- */
        const forceResetSlides = (activeIdx, ignoreIdx = -1) => {
            slides.forEach((s, i) => {
                if (i === activeIdx || i === ignoreIdx) return; 
                
                s.classList.remove('slide-visible');

                const localCTA = s.querySelector('.cta-btn');
                if (localCTA) {
                    localCTA.classList.remove('is-visible');
                    localCTA.style.transition = 'none';
                    void localCTA.offsetWidth;
                    localCTA.style.transition = '';
                }
                
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

        /* --- HELPER 3: MOVE IMAGES --- */
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

        /* --- STEPS REGISTRATION --- */
        const aboutSteps = Array.from(slides).map((slide, index) => {
            const localCTA = slide.querySelector('.cta-btn');
            const localBody = slide.querySelector('.type-body1, .type-body2');

            return {
                id: `about-${index}`,
                
                onEnter: async (direction) => {
                    updateGlobalMenu(-1);
                    aboutSection.classList.add('is-active');
                    slide.classList.add('slide-visible');

                    await animateMenuIn(true);

                    // 1. UPDATE MENU (Global)
                    updateGlobalMenu(index);

                    // 2. RESET OTHERS
                    let prevIndex = -1;
                    if (direction === 'down') prevIndex = index - 1;
                    else if (direction === 'up') prevIndex = index + 1;
                    forceResetSlides(index, prevIndex); 

                    // 3. SETUP START POSITIONS
                    if (index === 0) {
                        if (direction === 'down') moveSlideImages(0, 'state-exploded', true);
                        else moveSlideImages(0, 'state-up', true);
                    } else {
                        const startState = (direction === 'down') ? 'state-down' : 'state-up';
                        moveSlideImages(index, startState, true);
                    }

                    // 4. FADE IN TEXT
                    if(localBody) localBody.classList.add('is-visible');
                    
                    await wait(staggerTime);

                    // 5. ANIMATE IMAGES & CTA
                    moveSlideImages(index, 'state-center');
                    if (localCTA) localCTA.classList.add('is-visible');
                },
                
                onExit: async (direction) => {
                    // 1. HIDE CONTENT
                    if (localCTA) localCTA.classList.remove('is-visible');
                    if(localBody) localBody.classList.remove('is-visible');
                    slide.classList.remove('slide-visible');

                    // 2. CHECK EXIT SECTION
                    if ((index === 0 && direction === 'up') || 
                        (index === slides.length - 1 && direction === 'down')) {
                        aboutSection.classList.remove('is-active');
                        animateMenuIn(false);
                    }

                    // 3. ANIMATE OUT
                    let exitState = (direction === 'down') ? 'state-up' : 'state-down';
                    if ((index === 0 && direction === 'up') || 
                        (index === slides.length - 1 && direction === 'down')) {
                        exitState = 'state-exploded';
                    }

                    await wait(staggerTime); 
                    moveSlideImages(index, exitState);
                }
            };
        });

        if (window.ScrollManager) {
            ScrollManager.addSteps(aboutSteps);
        }
    });

    /* ... (KEEP PHYSICS FUNCTIONS EXACTLY AS THEY WERE) ... */
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
                const radius = 240;
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