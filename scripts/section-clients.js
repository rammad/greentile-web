/* clients section */
(() => {
    const { wait, staggerTime, observeElementInOut } = window.AnimationUtils || {};

    function showClients(section) {
        if (!section) return;
        section.classList.add('is-active');
        const subtitle = section.querySelector('.text-mask');
        const gallery = section.querySelector('.logo-track');
        if (subtitle) subtitle.classList.add('is-visible');
        if (gallery) gallery.classList.add('is-visible');
    }

    document.addEventListener('DOMContentLoaded', () => {
        const section = document.querySelector('.clients-section');
        if (!section) return;

        if (window.ScrollManager) {
            ScrollManager.addSteps([{
                id: 'clients',
                onEnter: async () => {
                    showClients(section);
                    await wait(staggerTime);
                },
                onExit: () => {}
            }]);
        } else {
            observeElementInOut(section, {
                onEnter: () => showClients(section)
            });
        }
    });
})();