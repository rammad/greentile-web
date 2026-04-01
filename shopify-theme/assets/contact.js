/* contact panel — Shopify theme adapted
   Reads config from DOM data attributes set by Liquid.
   Supports per-topic email routing and extra conditional fields. */

(function () {
    const panel = document.querySelector('.contact-panel');
    const backdrop = document.querySelector('.contact-backdrop');
    if (!panel || !backdrop) return;

    const CONFIG = {
        recipientEmail: panel.dataset.defaultEmail || (window.THEME_SETTINGS && window.THEME_SETTINGS.contactEmail) || 'hello@greentilesocialclub.com',
        formspreeId: panel.dataset.formspreeId || (window.THEME_SETTINGS && window.THEME_SETTINGS.formspreeId) || '',
        successMsg: panel.dataset.successMsg || "Message sent — we'll be in touch!",
        errorMsg: panel.dataset.errorMsg || 'Something went wrong — please try again',
    };

    const form = panel.querySelector('#contact-form');
    const topicBtns = panel.querySelectorAll('.contact-topic-btn');
    const statusEl = panel.querySelector('.contact-status');
    const extraFields = panel.querySelectorAll('.contact-extra-field');
    let isOpen = false;
    let selectedTopic = '';
    let selectedEmail = CONFIG.recipientEmail;

    // set initial topic from active button
    const defaultBtn = panel.querySelector('.contact-topic-btn.active');
    if (defaultBtn) {
        selectedTopic = defaultBtn.dataset.topic || '';
        if (defaultBtn.dataset.email) selectedEmail = defaultBtn.dataset.email;
    }

    function updateExtraFields() {
        extraFields.forEach(field => {
            const showFor = field.dataset.showForTopics;
            if (!showFor) {
                field.style.display = '';
                return;
            }
            const topics = showFor.split(',').map(t => t.trim());
            field.style.display = topics.includes(selectedTopic) ? '' : 'none';
            if (field.style.display === 'none') {
                const input = field.querySelector('input, textarea, select');
                if (input) input.removeAttribute('required');
            }
        });
    }

    updateExtraFields();

    function open() {
        if (isOpen) return;
        isOpen = true;
        document.body.classList.add('contact-is-open');
        panel.classList.add('is-open');
        backdrop.classList.add('is-open');
        if (window.lenis && window.lenis.stop) window.lenis.stop();

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
        if (window.lenis && window.lenis.start) window.lenis.start();

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
            selectedEmail = btn.dataset.email || CONFIG.recipientEmail;
            updateExtraFields();
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
        const bodyParts = [`Name: ${data.name}`, `Email: ${data.email}`, `Topic: ${data.topic}`];

        // include extra field values
        extraFields.forEach(field => {
            if (field.style.display === 'none') return;
            const input = field.querySelector('input, textarea, select');
            if (input && input.value) {
                const label = input.getAttribute('placeholder') || input.getAttribute('name') || 'Field';
                bodyParts.push(`${label}: ${input.value}`);
            }
        });

        bodyParts.push('', data.message);
        const body = encodeURIComponent(bodyParts.join('\n'));
        window.location.href = `mailto:${selectedEmail}?subject=${subject}&body=${body}`;
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

        // gather extra fields
        extraFields.forEach(field => {
            if (field.style.display === 'none') return;
            const input = field.querySelector('input, textarea, select');
            if (input && input.name) {
                data[input.name] = input.value?.trim() || '';
            }
        });

        if (!data.name || !data.email || !data.message) {
            showStatus('Please fill in all fields', 'error');
            return;
        }

        // include target email for Formspree routing
        data._replyto = data.email;
        data._subject = `[${data.topic}] Contact from ${data.name}`;
        if (selectedEmail !== CONFIG.recipientEmail) {
            data._cc = selectedEmail;
        }

        if (CONFIG.formspreeId) {
            const submitBtn = form.querySelector('.contact-submit');
            try {
                submitBtn.style.pointerEvents = 'none';
                submitBtn.style.opacity = '0.5';
                const res = await fetch(`https://formspree.io/f/${CONFIG.formspreeId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                    body: JSON.stringify(data),
                });
                if (!res.ok) throw new Error(res.status);
                showStatus(CONFIG.successMsg, 'success');
                form.reset();
                topicBtns.forEach(b => b.classList.remove('active'));
                if (topicBtns[0]) {
                    topicBtns[0].classList.add('active');
                    selectedTopic = topicBtns[0].dataset.topic || '';
                    selectedEmail = topicBtns[0].dataset.email || CONFIG.recipientEmail;
                }
                updateExtraFields();
            } catch (err) {
                showStatus(CONFIG.errorMsg, 'error');
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
        // all elements with data-contact-trigger open the panel
        document.querySelectorAll('[data-contact-trigger]').forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                if (isOpen) close();
                else open();
            });
        });

        // hamburger: when contact panel is open, intercept click to close it
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

        // mobile menu "Say Hi" link (has data-contact-trigger, handled above)

        // footer links with data-contact-trigger (handled above)
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', wireTriggers);
    } else {
        wireTriggers();
    }
})();
