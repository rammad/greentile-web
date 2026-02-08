/* scroll manager */

window.ScrollManager = {
    currentStep: 0,
    isLocked: false, 
    steps: [],      
    nestedObserver: null,
    nestedEls: [],

    init() {
        console.log("ScrollManager: Starting Hybrid System...");

        window.addEventListener('wheel', this.handleInput.bind(this), { passive: false });
        let touchStartY = 0;
        window.addEventListener('touchstart', e => touchStartY = e.touches[0].clientY, { passive: false });
        window.addEventListener('touchend', e => {
            const delta = touchStartY - e.changedTouches[0].clientY;
            if (Math.abs(delta) > 30) this.handleTouch(delta);
        }, { passive: false });

        setTimeout(() => {
            if(this.steps.length > 0) {
                this.steps[0].onEnter('down');
            } else {
                document.body.style.overflow = "auto"; 
            }
        }, 100);
    },

    addSteps(newSteps) {
        newSteps.forEach(step => {
            const el = document.getElementById(step.id);
            if (!el) {
                console.warn(`ScrollManager: Element with id '${step.id}' not found.`);
                return;
            }

            const wrapper = el.parentElement ? el.parentElement.closest('.natural-scroll-section') : null;

            if (wrapper) {
                console.log(`ScrollManager: Registered nested section '${step.id}'`);
                el.classList.add('relative-mode');
                el._scrollLogic = {
                    onEnter: step.onEnter,
                    onExit: step.onExit,
                    isActive: false
                };
                this.nestedEls.push(el);

                if(!this.nestedObserver) this.initNestedObserver();
                this.nestedObserver.observe(el);

            } else {
                console.log(`ScrollManager: Registered main step '${step.id}'`);
                this.steps.push(step);
            }
        });

        this.steps.sort((a, b) => {
            const elA = document.getElementById(a.id);
            const elB = document.getElementById(b.id);
            if(!elA || !elB) return 0;
            return (elA.compareDocumentPosition(elB) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1;
        });
    },

    initNestedObserver() {
        const options = { threshold: 0.75 };
        
        this.nestedObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const el = entry.target;
                if (!el._scrollLogic) return;

                const wrapper = el.closest('.natural-scroll-section');
                if (wrapper && !wrapper.classList.contains('is-active')) return;

                if (entry.isIntersecting && !el._scrollLogic.isActive) {
                    el._scrollLogic.isActive = true;
                    el._scrollLogic.onEnter('down'); 
                } 
                // else if (!entry.isIntersecting && el._scrollLogic.isActive) {
                //     el._scrollLogic.isActive = false;
                //     el._scrollLogic.onExit('up');
                // }
            });
        }, options);
    },

    handleInput(e) {
        if (this.isLocked) {
            e.preventDefault();
            return;
        }

        const delta = e.deltaY;
        const target = e.target;
        const scrollContainer = target.closest('.scrollable-content');
        const isActiveContainer = scrollContainer && scrollContainer.classList.contains('is-active');

        if (isActiveContainer) {
            const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
            const isAtTop = scrollTop <= 0;
            const isAtBottom = Math.ceil(scrollTop + clientHeight) >= scrollHeight;
            if (delta > 0 && !isAtBottom) return; 
            if (delta < 0 && !isAtTop) return; 
        }

        e.preventDefault();
        if (delta > 5) this.trigger(1);
        else if (delta < -5) this.trigger(-1);
    },

    handleTouch(delta) {
        if (this.isLocked) return;
        this.trigger(delta > 0 ? 1 : -1);
    },

    async trigger(direction) {
        const nextIndex = this.currentStep + direction;
        if (nextIndex < 0 || nextIndex >= this.steps.length) return;

        this.isLocked = true;
        const currentScene = this.steps[this.currentStep];
        const nextScene = this.steps[nextIndex];
        const dirStr = direction > 0 ? 'down' : 'up';

        await currentScene.onExit(dirStr);

        const currentEl = document.getElementById(currentScene.id);
        if (currentEl && currentEl.classList.contains('natural-scroll-section')) {
            this.nestedEls.forEach(nested => {
                if (nested.closest('.natural-scroll-section') === currentEl) {
                    if (nested._scrollLogic && nested._scrollLogic.isActive) {
                        nested._scrollLogic.onExit(dirStr);
                        nested._scrollLogic.isActive = false; 
                    }
                }
            });
        }

        document.querySelectorAll('section').forEach(s => s.classList.remove('is-active'));
        await nextScene.onEnter(dirStr);

        const activeEl = document.getElementById(nextScene.id);
        if (activeEl) {
            this.nestedEls.forEach(el => {
                if (el.closest('.natural-scroll-section') === activeEl) {
                    this.nestedObserver.unobserve(el);
                    this.nestedObserver.observe(el);
                }
            });
        }

        this.currentStep = nextIndex;
        this.isLocked = false;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.ScrollManager.init();
});