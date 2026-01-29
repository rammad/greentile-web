/* =========================================
   PAGE: ABOUT US (Scroll Director)
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. SETUP MENU LOGIC ---
    const menuSection = document.querySelector('.menu-section');
    const menuItems = document.querySelectorAll('.menu-item');
    const menuGroups = document.querySelectorAll('.menu-group');
    const ctaBlocks = document.querySelectorAll('.cta-block');
    
    // Helper to update the visual state of the Menu
    const updateMenuState = (index) => {
        // Text
        menuItems.forEach((item, i) => {
            if(i === index) item.classList.add('active');
            else item.classList.remove('active');
        });

        // CTAs
        ctaBlocks.forEach((block, i) => {
            if(i === index) block.classList.add('active');
            else block.classList.remove('active');
        });

        // Images (The heavy lifting)
        menuGroups.forEach((group, i) => {
            group.classList.remove('active', 'prev', 'next');
            if (i === index) {
                group.classList.add('active');
            } else if (i < index) {
                group.classList.add('prev');
            } else {
                group.classList.add('next');
            }
        });
    };

    // --- 2. DEFINE STEPS ---
    
    // Step 1: Mission
    const stepMission = {
        id: 'mission',
        onEnter: (dir) => {
            document.querySelector('.mission-section').classList.add('is-active');
            
            // Trigger Cascade
            const title = document.querySelector('.mission-section .animate-cascade');
            if(title) window.playCascade(title);
            
            return 1000;
        },
        onExit: (dir) => {
            document.querySelector('.mission-section').classList.remove('is-active');
            // Reset Text
            const title = document.querySelector('.mission-section .animate-cascade');
            if(title) window.reverseCascade(title);
            return 800;
        }
    };

    // Step 2, 3, 4, 5: The Menu (Broken into discrete scroll events)
    const createMenuStep = (index) => {
        return {
            id: `menu-${index}`,
            onEnter: (dir) => {
                // Ensure section is visible
                menuSection.classList.add('is-active');
                
                // Update internal UI
                updateMenuState(index);
                
                return 800; // Time between menu item switches
            },
            onExit: (dir) => {
                // Only hide the section if we are leaving the MENU entirely
                // (i.e., going to Team or back to Mission)
                const totalMenuSteps = 4;
                
                // If going DOWN from the last step, OR going UP from the first step
                if ((index === totalMenuSteps - 1 && dir === 'down') || (index === 0 && dir === 'up')) {
                    menuSection.classList.remove('is-active');
                }
                return 800;
            }
        };
    };

    // Step 6: Team (Reusing Events CSS structure)
    const stepTeam = {
        id: 'team',
        onEnter: (dir) => {
            document.querySelector('.events-section').classList.add('is-active');
            return 1000;
        },
        onExit: (dir) => {
            document.querySelector('.events-section').classList.remove('is-active');
            return 800;
        }
    };

    // Step 7: Socials
    const stepSocials = {
        id: 'socials',
        onEnter: (dir) => {
            document.querySelector('.socials-section').classList.add('is-active');
            const title = document.querySelector('.socials-section .type-h1');
            if(title) window.playCascade(title);
            return 1000;
        },
        onExit: (dir) => {
            document.querySelector('.socials-section').classList.remove('is-active');
            const title = document.querySelector('.socials-section .type-h1');
            if(title) window.reverseCascade(title);
            return 800;
        }
    };

    // Step 8: Clients
    const stepClients = {
        id: 'clients',
        onEnter: (dir) => {
            document.querySelector('.clients-section').classList.add('is-active');
            return 1000;
        },
        onExit: (dir) => {
            document.querySelector('.clients-section').classList.remove('is-active');
            return 800;
        }
    };

    // Step 9: Footer
    const stepFooter = {
        id: 'footer',
        onEnter: (dir) => {
            document.querySelector('.footer-section').classList.add('is-active');
            const title = document.querySelector('.footer-section .animate-cascade');
            // Hard reset logic
            if (title) {
                const chars = title.querySelectorAll('.char-reveal');
                chars.forEach(c => { c.style.transition = 'none'; c.classList.remove('is-visible'); });
                void title.offsetWidth;
                requestAnimationFrame(() => {
                    chars.forEach((c, i) => { c.style.transition = ''; c.style.transitionDelay = `${i * 30}ms`; });
                    window.playCascade(title);
                });
            }
            return 1000;
        },
        onExit: (dir) => {
            if (dir === 'up') {
                document.querySelector('.footer-section').classList.remove('is-active');
                const title = document.querySelector('.footer-section .animate-cascade');
                if(title) window.reverseCascade(title);
            }
            return 800;
        }
    };

    // --- 3. REGISTER ALL STEPS ---
    if (window.ScrollManager) {
        ScrollManager.addSteps([
            stepMission,
            createMenuStep(0),
            createMenuStep(1),
            createMenuStep(2),
            createMenuStep(3),
            stepTeam,
            stepSocials,
            stepClients,
            stepFooter
        ]);
    }

    // --- 4. INIT CLIENT MARQUEE ---
    // Since this page has a client list, we init it here
    if (typeof MarqueeManager !== 'undefined') {
        new MarqueeManager('.logo-track', 80, false); // No stagger needed for logos usually
    }
});