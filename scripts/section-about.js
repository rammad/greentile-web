(() => {
    const { wait, transitionCta, staggerTime, lockTime } = window.AnimationUtils;

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.getElementById('about');
        if (!section) return;

        const track = section.querySelector('.about-image-track');
        const images = Array.from(track.querySelectorAll('.scatter-img'));
        const textBlocks = document.querySelectorAll('.about-text-block');

        let currentGroup = null;

        const initLayout = () => {
            const isMobile = window.innerWidth < 768;
            
            // CONFIG
            const startY = isMobile ? 0 : 0; 
            const stepY = isMobile ? 140 : 160; 
            let currentY = startY;

            images.forEach((img, index) => {
                const isLeft = index % 2 === 0;

                // Position Calculation
                const minX = isLeft ? -5 : 75;
                const maxX = isLeft ? 15 : 95;
                const randomX = Math.floor(Math.random() * (maxX - minX + 1)) + minX;
                
                const minW = isMobile ? 40 : 12;
                const maxW = isMobile ? 55 : 20;
                const randomW = Math.floor(Math.random() * (maxW - minW + 1)) + minW;
                
                const jitter = Math.floor(Math.random() * 120) - 60; 
                const finalY = currentY + jitter;

                // Apply Layout Styles
                img.style.width = `${randomW}vw`;
                img.style.left = `${randomX}%`;
                img.style.top = `${finalY}px`;
                img.style.zIndex = Math.floor(Math.random() * 20);

                // ANIMATION SETUP: Slide in from closest side
                // We set a CSS variable that CSS will use for the 'enter' state
                // If isLeft, start at -50vw. If Right, start at 50vw.
                const startX = isLeft ? '-20vw' : '20vw';
                img.style.setProperty('--slide-start', startX);

                // Increment
                currentY += stepY;
            });

            track.style.height = `${currentY}px`;
        };

        // --- TEXT ACTIVATION (Fixed CTA Animation) ---
        const activateText = (index) => {
            // 1. THE FIX: If this group is already active, do nothing.
            if (currentGroup === index) return;

            // 2. Deactivate the OLD group (only if there was one)
            if (currentGroup !== null) {
                const oldTarget = document.getElementById(`text-${currentGroup}`);
                if (oldTarget) {
                    oldTarget.style.pointerEvents = 'none';
                    
                    Array.from(oldTarget.children).forEach(child => {
                        // Handle CTA exit
                        if (child.classList.contains('cta-btn')) {
                            transitionCta(child, 'exit');
                        } else {
                            // Handle Text exit
                            child.classList.remove('is-visible');
                        }
                    });
                }
            }

            // 3. Update the Tracker
            currentGroup = index;

            // 4. Activate the NEW group
            const newTarget = document.getElementById(`text-${index}`);
            if (newTarget) {
                newTarget.style.pointerEvents = 'auto';
                
                const children = Array.from(newTarget.children);
                children.forEach((child, i) => {
                    setTimeout(() => {
                        // Handle CTA enter
                        if (child.classList.contains('cta-btn')) {
                            if(window.AnimationUtils && window.AnimationUtils.transitionCta) {
                                window.AnimationUtils.transitionCta(child, 'enter');
                            } else {
                                child.classList.add('is-visible');
                            }
                        } else {
                            // Handle Text enter
                            child.classList.add('is-visible');
                        }
                    }, i * 100); // 100ms stagger
                });
            }
        };

        // --- 2. SCROLL SPY (Text Switcher) ---
        const initScrollSpy = () => {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && section.classList.contains('is-active')) {
                        const img = entry.target;
                        
                        // Reveal Image
                        img.classList.add('is-visible');
                        img.style.transform = img.style.transform.replace('scale(0.9)', 'scale(1)');

                        // Switch Text
                        const groupIndex = img.dataset.group;
                        if (groupIndex !== undefined) {
                            activateText(groupIndex);
                        }
                    }
                });
            }, {
                root: section, // Watch scroll inside this section
                threshold: 0.15, // Trigger when 15% visible
                rootMargin: "0px 0px -20% 0px" // Look ahead slightly
            });

            images.forEach(img => observer.observe(img));
        };

        // --- 3. RUN ---
        initLayout();
        initScrollSpy();
        
        // Safety: Ensure first text is visible on load
        activateText(0); 

        // Resize Listener
        let timer;
        window.addEventListener('resize', () => {
            clearTimeout(timer);
            timer = setTimeout(initLayout, 200);
        });
        
        // --- 4. SCROLL MANAGER ---
        if (window.ScrollManager) {
            ScrollManager.addSteps([{
                id: 'about',
                onEnter: async () => {
                    section.classList.add('is-active');

                    await wait(staggerTime);

                    for( i = 0; i < images.length; i++){
                        images[i].classList.add('is-visible');

                        if (i < (images.length / textBlocks.length)) await wait(50);
                    }
                },
                onExit: () => {
                    section.classList.remove('is-active');
                    for( i = 0; i < images.length; i++){
                        images[i].classList.remove('is-visible');
                    }
                }
            }]);
        }
    });
})();