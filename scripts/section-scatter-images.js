/* scatter image track — shared between about (index.html) and what-we-do (about-us.html)
 *
 * Usage: const scatter = window.ScatterImages.init(sectionEl, viewportEl);
 *   scatter.state.trackHeight  — current computed track height
 *   scatter.initLayout()       — re-run layout (call on resize)
 *   scatter.updateImageScales() — call every scroll frame
 */

window.ScatterImages = (function () {

    const MOBILE_BREAKPOINT      = 768;
    const STEP_Y_MOBILE          = 180;
    const STEP_Y_DESKTOP         = 180;
    const COL_LEFT_X_MIN         = -5;
    const COL_LEFT_X_MAX         = 12;
    const COL_RIGHT_X_MIN        = 75;
    const COL_RIGHT_X_MAX        = 95;
    const IMG_WIDTH_MOBILE_MIN   = 40;
    const IMG_WIDTH_MOBILE_MAX   = 55;
    const IMG_WIDTH_DESKTOP_MIN  = 7;
    const IMG_WIDTH_DESKTOP_MAX  = 15;
    const IMG_JITTER_RANGE       = 120;
    const IMG_Z_INDEX_MAX        = 20;
    const IMG_VARIATION_MIN_DIFF = 0.2;

    const IMG_SCALE_MIN = 1.0;
    const IMG_SCALE_MAX = 1.0;

    const IMG_DEPTH_PARALLAX_STRENGTH = 0.5;
    const IMG_SPEED_FACTOR_MIN        = 0.8;
    const IMG_SPEED_FACTOR_MAX        = 1.2;

    function getVariedRandom(min, max, previousValue = null, minDiff = IMG_VARIATION_MIN_DIFF) {
        if (previousValue === null) return Math.floor(Math.random() * (max - min + 1)) + min;
        const range       = max - min;
        const minDistance = range * minDiff;
        let attempts = 0, value;
        do {
            value = Math.floor(Math.random() * (max - min + 1)) + min;
            attempts++;
        } while (Math.abs(value - previousValue) < minDistance && attempts < 10);
        return value;
    }

    function init(section, viewport) {
        const track  = section.querySelector('.about-image-track');
        const images = track ? Array.from(track.querySelectorAll('.scatter-img')) : [];
        const state  = { trackHeight: 0 };

        function initLayout() {
            const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
            const stepY    = isMobile ? STEP_Y_MOBILE : STEP_Y_DESKTOP;
            let currentY   = 0;
            const prevLeft  = { x: null, w: null };
            const prevRight = { x: null, w: null };

            images.forEach((img, index) => {
                const isLeft = index % 2 === 0;
                const prev   = isLeft ? prevLeft : prevRight;

                const minX    = isLeft ? COL_LEFT_X_MIN  : COL_RIGHT_X_MIN;
                const maxX    = isLeft ? COL_LEFT_X_MAX  : COL_RIGHT_X_MAX;
                const randomX = getVariedRandom(minX, maxX, prev.x);

                const minW    = isMobile ? IMG_WIDTH_MOBILE_MIN  : IMG_WIDTH_DESKTOP_MIN;
                const maxW    = isMobile ? IMG_WIDTH_MOBILE_MAX  : IMG_WIDTH_DESKTOP_MAX;
                const randomW = getVariedRandom(minW, maxW, prev.w);

                const jitter     = Math.floor(Math.random() * IMG_JITTER_RANGE) - IMG_JITTER_RANGE / 2;
                const naturalTop = currentY + jitter;
                img.style.width  = `${randomW}vw`;
                img.style.left   = `${randomX}%`;
                img.style.top    = `${naturalTop}px`;
                img.dataset.naturalTop = String(naturalTop);

                const normalizedSize = (randomW - minW) / Math.max(1, maxW - minW);
                img.style.zIndex     = 1 + Math.round(normalizedSize * (IMG_Z_INDEX_MAX - 1));
                img.dataset.speedFactor = (
                    IMG_SPEED_FACTOR_MIN + normalizedSize * (IMG_SPEED_FACTOR_MAX - IMG_SPEED_FACTOR_MIN)
                ).toFixed(3);

                prev.x = randomX;
                prev.w = randomW;
                currentY += stepY;
            });

            state.trackHeight = currentY;
            if (track) track.style.height = `${state.trackHeight}px`;
        }

        function updateImageScales() {
            if (!viewport) return;
            const viewportRect    = viewport.getBoundingClientRect();
            const viewportCenterY = viewportRect.height / 2;
            const sectionTop      = section.getBoundingClientRect().top;
            const depthOffset     = Math.max(0, viewportRect.height - sectionTop);

            images.forEach((img) => {
                const imgRect    = img.getBoundingClientRect();
                const imgCenterY = imgRect.top + imgRect.height / 2 - viewportRect.top;
                const dist       = Math.abs(imgCenterY - viewportCenterY);
                const proximity  = 1 - Math.min(dist / (viewportRect.height / 2), 1);
                const scale      = IMG_SCALE_MIN + (IMG_SCALE_MAX - IMG_SCALE_MIN) * proximity;

                const speedFactor = parseFloat(img.dataset.speedFactor ?? '1');
                const parallaxY   = depthOffset * (1 - speedFactor) * IMG_DEPTH_PARALLAX_STRENGTH;

                const naturalTop  = parseFloat(img.dataset.naturalTop ?? '0');
                const imgH        = img.offsetHeight;
                const minParallax = -naturalTop;
                const maxParallax = state.trackHeight - naturalTop - imgH;
                const clampedY    = Math.max(minParallax, Math.min(maxParallax, parallaxY));

                img.style.transform = `translateY(${clampedY.toFixed(2)}px) scale(${scale})`;
            });
        }

        initLayout();
        if (track) track.classList.add('about-image-track-positioned');

        return { state, initLayout, updateImageScales };
    }

    return { init };

})();
