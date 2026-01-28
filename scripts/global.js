/* =========================================
   GLOBAL UTILITIES
   Nav, CTA, Mouse Tracking, Universal Animations
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initDialReveal();
    initCTA();
    initSmoothMotion(); // Global mouse tracking
    initCascadeReveal(); // Auto-init for static headers
});

/**
 * 1. NAVBAR LOGIC
 */
function initNavbar() {
    const nav = document.querySelector('.sticky-nav');
    if (!nav) return;

    const links = nav.querySelectorAll('a');
    let scrollTimer;

    links.forEach(link => {
        const text = link.innerText.trim();
        link.setAttribute('data-text', text);
        if (link.children.length === 0) {
            link.innerHTML = `<span>${text}</span>`;
        }
    });

    window.addEventListener('scroll', () => {
        nav.classList.add('nav-hidden');
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
            nav.classList.remove('nav-hidden');
        }, 500);
    }, { passive: true });
}

/**
 * 2. CTA BUTTON LOGIC
 */
function initCTA() {
    const btns = document.querySelectorAll('.cta-btn');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const btn = entry.target;
            if (btn.classList.contains('manual-control')) return;
            entry.isIntersecting ? btn.classList.remove('not-active') : btn.classList.add('not-active');
        });
    }, { threshold: 0.5 });

    btns.forEach(btn => {
        btn.classList.add('not-active');
        // if (!btn.classList.contains('about-persistent-cta')) {
        //     observer.observe(btn);
        // } else {
        //     btn.classList.add('manual-control');
        // }
    });
}

/**
 * 3. SMOOTH MOTION (Mouse Tracker)
 * Tracks mouse globally for any element that needs 'avoidance'
 */
function initSmoothMotion() {
    const images = document.querySelectorAll('.scatter-img');
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
            const radius = 500;
            
            if (dist < radius) {
                const force = (radius - dist) / radius;
                img.style.setProperty('--avoid-x', `${(-dx * force * 0.15).toFixed(2)}px`);
                img.style.setProperty('--avoid-y', `${(-dy * force * 0.15).toFixed(2)}px`);
            } else {
                img.style.setProperty('--avoid-x', `0px`);
                img.style.setProperty('--avoid-y', `0px`);
            }
            
            // Soft Scroll Lerp for Parallax Wrappers
            const wrapper = img.parentElement; 
            if (wrapper && wrapper._targetY !== undefined) {
                if (!wrapper._currentY) wrapper._currentY = 0;
                wrapper._currentY += (wrapper._targetY - wrapper._currentY) * 0.08;
                wrapper.style.setProperty('--scroll-y', `${wrapper._currentY.toFixed(2)}px`);
            }
        });
        requestAnimationFrame(animate);
    }
    animate();
}

/**
 * 4. CASCADE REVEAL (Slot Machine)
 * Can be Auto-Initialized OR Called Manually
 */
function initCascadeReveal() {
    // Auto-init for static titles
    const targets = document.querySelectorAll('.animate-cascade');
    
    // Helper: Build HTML
    const buildChars = (el) => {
        if(el.classList.contains('is-built')) return;
        const text = el.innerText;
        el.innerHTML = '';
        text.split('').forEach((char, index) => {
            const span = document.createElement('span');
            span.classList.add('char-reveal');
            span.textContent = char;
            span.style.transitionDelay = `${index * 30}ms`;
            el.appendChild(span);
        });
        el.classList.add('is-built');
    };

    // Observer for auto-triggering
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                playCascade(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });

    targets.forEach(el => {
        buildChars(el);
        observer.observe(el);
    });
}

// EXPORTED HELPER: Play Animation
window.playCascade = function(el) {
    if(!el) return;
    const chars = el.querySelectorAll('.char-reveal');
    chars.forEach(char => char.classList.add('is-visible'));
};

// EXPORTED HELPER: Reverse Animation (Exit)
window.reverseCascade = function(el) {
    if(!el) return;
    const chars = el.querySelectorAll('.char-reveal');
    chars.forEach(char => char.classList.remove('is-visible'));
};


/**
 * 5. DIAL REVEAL
 */
function initDialReveal() {
    const elements = document.querySelectorAll('.animate-dial');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('in-view');
        });
    }, { threshold: 0.15 });

    elements.forEach(el => {
        if (el.closest('.sticky-nav')) return;
        const rawText = el.innerText; 
        const words = rawText.split(/\s+/); 
        let newHtml = '';
        words.forEach(word => {
            if(word.length > 0) newHtml += `<span class="dial-mask"><span class="dial-inner">${word}</span></span> `;
        });
        el.innerHTML = newHtml;
        el.classList.add('dial-ready'); 
        observer.observe(el);
    });
}