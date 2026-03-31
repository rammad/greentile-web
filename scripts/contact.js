/* contact panel — slide-in form + email dispatch */

const CONTACT_CONFIG = {
    recipientEmail: 'hello@greentilesocialclub.com',
    // Formspree: sign up at https://formspree.io, create a form, paste the ID below
    // e.g. 'xpzvQrLk' → endpoint becomes 'https://formspree.io/f/xpzvQrLk'
    formspreeId: '',
};

(function () {
    const panel = document.querySelector('.contact-panel');
    const backdrop = document.querySelector('.contact-backdrop');
    if (!panel || !backdrop) return;

    const form = panel.querySelector('#contact-form');
    const topicBtns = panel.querySelectorAll('.contact-topic-btn');
    const statusEl = panel.querySelector('.contact-status');
    let isOpen = false;
    let selectedTopic = 'general';
    let savedOverflow = '';

    function open() {
        if (isOpen) return;
        isOpen = true;
        savedOverflow = document.body.style.overflow;
        document.body.classList.add('contact-is-open');
        panel.classList.add('is-open');
        backdrop.classList.add('is-open');
        document.body.style.overflow = 'hidden';

        const hamburger = document.querySelector('.nav-hamburger');
        if (hamburger) {
            hamburger.classList.add('is-active');
            hamburger.setAttribute('aria-expanded', 'true');
        }
    }

    function close() {
        if (!isOpen) return;
        isOpen = false;
        document.body.classList.remove('contact-is-open');
        panel.classList.remove('is-open');
        backdrop.classList.remove('is-open');
        document.body.style.overflow = savedOverflow;

        const hamburger = document.querySelector('.nav-hamburger');
        const mobileMenu = document.querySelector('.mobile-menu');
        const menuStillOpen = mobileMenu && mobileMenu.classList.contains('is-open');
        if (hamburger && !menuStillOpen) {
            hamburger.classList.remove('is-active');
            hamburger.setAttribute('aria-expanded', 'false');
        }
    }

    backdrop.addEventListener('click', close);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen) close();
    });

    topicBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            topicBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedTopic = btn.dataset.topic;
        });
    });

    function showStatus(msg, type) {
        if (!statusEl) return;
        statusEl.textContent = msg;
        statusEl.className = 'contact-status type-subRegular1 ' + type + ' is-visible';
        if (type === 'success') {
            setTimeout(() => { statusEl.classList.remove('is-visible'); }, 4000);
        }
    }

    function clearStatus() {
        if (!statusEl) return;
        statusEl.className = 'contact-status type-subRegular1';
        statusEl.textContent = '';
    }

    function sendViaMailto(data) {
        const subject = encodeURIComponent(`[${data.topic}] Contact from ${data.name}`);
        const body = encodeURIComponent(
            `Name: ${data.name}\nEmail: ${data.email}\nTopic: ${data.topic}\n\n${data.message}`
        );
        window.location.href = `mailto:${CONTACT_CONFIG.recipientEmail}?subject=${subject}&body=${body}`;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearStatus();

        const fd = new FormData(form);
        const data = {
            name: fd.get('name')?.trim(),
            email: fd.get('email')?.trim(),
            message: fd.get('message')?.trim(),
            topic: selectedTopic,
        };

        if (!data.name || !data.email || !data.message) {
            showStatus('Please fill in all fields', 'error');
            return;
        }

        if (CONTACT_CONFIG.formspreeId) {
            const submitBtn = form.querySelector('.contact-submit');
            try {
                submitBtn.style.pointerEvents = 'none';
                submitBtn.style.opacity = '0.5';
                const res = await fetch(`https://formspree.io/f/${CONTACT_CONFIG.formspreeId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                    body: JSON.stringify(data),
                });
                if (!res.ok) throw new Error(res.status);
                showStatus('Message sent — we\'ll be in touch!', 'success');
                form.reset();
                topicBtns.forEach(b => b.classList.remove('active'));
                topicBtns[0].classList.add('active');
                selectedTopic = 'general';
            } catch (err) {
                showStatus('Something went wrong — please try again', 'error');
            } finally {
                submitBtn.style.pointerEvents = '';
                submitBtn.style.opacity = '';
            }
        } else {
            sendViaMailto(data);
        }
    });

    window.contactPanel = { open, close, isOpen: () => isOpen };

    function wireTriggers() {
        // desktop nav: "SAY HI" toggles the panel open/closed
        const navRight = document.querySelector('.nav-right a');
        if (navRight) {
            navRight.addEventListener('click', (e) => {
                e.preventDefault();
                if (isOpen) close();
                else open();
            });
        }

        // mobile hamburger: when contact panel is open, intercept click to close it
        // capture phase + stopImmediatePropagation prevents the mobile menu toggle from firing
        const hamburger = document.querySelector('.nav-hamburger');
        if (hamburger) {
            hamburger.addEventListener('click', (e) => {
                if (isOpen) {
                    e.stopImmediatePropagation();
                    close();
                    if (window.mobileMenu) window.mobileMenu.close();
                }
            }, true);
        }

        // mobile menu "Say Hi" link — opens contact on top, menu stays open
        document.querySelectorAll('.mobile-menu-link').forEach(link => {
            if (link.getAttribute('href') === '#') {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    open();
                });
            }
        });

        // footer "Contact Us" link
        document.querySelectorAll('.footer-links a').forEach(link => {
            const visible = link.querySelector('.ui-roll-visible');
            const text = visible ? visible.textContent.trim().toLowerCase() : '';
            if (text === 'contact us') {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    open();
                });
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', wireTriggers);
    } else {
        wireTriggers();
    }
})();
