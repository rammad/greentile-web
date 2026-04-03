/* contact panel — Shopify theme adapted
   Reads config from DOM data attributes set by Liquid.
   Supports per-topic email routing and extra conditional fields. */

(function () {
    const panel = document.querySelector('.contact-panel');
    const backdrop = document.querySelector('.contact-backdrop');
    if (!panel || !backdrop) return;

    const CONFIG = {
        recipientEmail: panel.dataset.defaultEmail || (window.THEME_SETTINGS && window.THEME_SETTINGS.contactEmail) || 'hello@greentilesocialclub.com',
        successMsg: panel.dataset.successMsg || "Message sent — we'll be in touch!",
        errorMsg: panel.dataset.errorMsg || 'Something went wrong — please try again',
    };

    const form = panel.querySelector('#contact-form');
    const topicBtns = panel.querySelectorAll('.contact-topic-btn');
    const messageEl = panel.querySelector('textarea[name="message"]');
    const defaultPlaceholder = messageEl ? messageEl.getAttribute('placeholder') : '';
    const statusEl = panel.querySelector('.contact-status');
    const infoFields = panel.querySelectorAll('.contact-info-field');
    const extraFields = panel.querySelectorAll('.contact-extra-field');
    let isOpen = false;
    let selectedTopic = '';
    let selectedEmail = CONFIG.recipientEmail;

    // set initial topic from active button
    const defaultBtn = panel.querySelector('.contact-topic-btn.active');
    if (defaultBtn) {
        selectedTopic = defaultBtn.dataset.topic || '';
        if (defaultBtn.dataset.email) selectedEmail = defaultBtn.dataset.email;
        updateMessagePlaceholder(defaultBtn);
    }

    function selectTopic(value) {
        if (!value) return;
        const btn = panel.querySelector(`.contact-topic-btn[data-topic="${CSS.escape(value)}"]`);
        if (!btn) return;
        topicBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedTopic = btn.dataset.topic;
        selectedEmail = btn.dataset.email || CONFIG.recipientEmail;
        updateMessagePlaceholder(btn);
        updateExtraFields();
    }

    function updateMessagePlaceholder(btn) {
        if (!messageEl) return;
        messageEl.setAttribute('placeholder', btn?.dataset.placeholder || defaultPlaceholder);
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

    function open(topic) {
        if (topic) selectTopic(topic);
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
            updateMessagePlaceholder(btn);
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
        const senderName = data.name || 'Unknown';
        const subject = encodeURIComponent(`[${data.topic}] Contact from ${senderName}`);
        const bodyParts = [`Topic: ${data.topic}`];

        infoFields.forEach(field => {
            if (field.value) {
                const label = field.getAttribute('placeholder') || field.getAttribute('name') || 'Field';
                bodyParts.push(`${label}: ${field.value}`);
            }
        });

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
        const data = { topic: selectedTopic };

        infoFields.forEach(field => {
            if (field.name) data[field.name] = field.value?.trim() || '';
        });

        data.message = fd.get('message')?.trim();

        extraFields.forEach(field => {
            if (field.style.display === 'none') return;
            const input = field.querySelector('input, textarea, select');
            if (input && input.name) {
                data[input.name] = input.value?.trim() || '';
            }
        });

        const missing = Array.from(infoFields)
            .filter(f => f.required && !f.value?.trim())
            .length > 0;
        if (missing || !data.message) {
            showStatus('Please fill in all required fields', 'error');
            return;
        }

        if (data.email) data._replyto = data.email;
        data._subject = `[${data.topic}] Contact from ${data.name || 'Unknown'}`;
        if (selectedEmail !== CONFIG.recipientEmail) {
            data._cc = selectedEmail;
        }

        /* ── Form submission integration ──
           Plug in your preferred form backend here (e.g. Formspree, Basin,
           Shopify form action, etc.). Until then, falls back to mailto. */

        sendViaMailto(data);
    });

    window.contactPanel = { open, close, isOpen: () => isOpen, selectTopic };

    function wireTriggers() {
        document.querySelectorAll('[data-contact-trigger]').forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                const topic = trigger.dataset.contactTopic;
                if (isOpen && !topic) close();
                else open(topic);
            });
        });

        // any <a href="#contact"> or <a href="#contact:topicValue"> anywhere on the page
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href^="#contact"]');
            if (!link || link.hasAttribute('data-contact-trigger')) return;
            const href = link.getAttribute('href');
            const match = href.match(/^#contact(?::(.+))?$/);
            if (!match) return;
            e.preventDefault();
            open(match[1] || null);
        });

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
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', wireTriggers);
    } else {
        wireTriggers();
    }
})();
