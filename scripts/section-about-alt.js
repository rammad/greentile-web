/* about-alt section — scatter images + Doppler-scrolling body blocks
   ───────────────────────────────────────────────────────────────────
   Same image scatter behaviour as "What We Do" (via shared
   scatter-images.js) but with tighter horizontal bounds so photos
   can drift closer to center.  The persistent menu is replaced by
   body blocks that physically scroll through the viewport with a
   Doppler-style ease: fast at the edges, slow through the center.  */

(function () {

    // ── scatter overrides for this section ─────────────────────────────────
    // Text is narrower than what-we-do so images can come closer to center.

    var SCATTER_CONFIG = {
        colLeftXMax:          20,
        colRightXMin:         64,
        slideHeightVhDesktop: 0.9,
        slideHeightVhMobile:  1.1
    };

    // ── Doppler-scroll tuning ──────────────────────────────────────────────
    // DOPPLER_EXPONENT  — power curve.  Higher = stronger center dwell.
    // TRAVEL_VH         — max Y displacement from center (× vpH).
    // RANGE_FACTOR      — fraction of slideHeight used to normalize progress.
    //                     Larger = slower entrance/exit for same scroll distance.

    var DOPPLER_EXPONENT    = 1.5;
    var TRAVEL_VH           = 0.35;
    var RANGE_FACTOR        = 0.6;
    var OPACITY_DWELL_START = 0.30;
    var OPACITY_DWELL_END   = 1.00;
    var BLUR_MAX_PX         = 10;
    var BLUR_START           = 0.50;
    var BLUR_END             = 1.20;
    var READABLE_THRESHOLD  = 0.40;

    var MOBILE_BREAKPOINT   = 768;

    // ── helpers ────────────────────────────────────────────────────────────

    function smoothstep(x, edge0, edge1) {
        var t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
        return t * t * (3 - 2 * t);
    }

    function dopplerRemap(t, exponent) {
        var sign = t >= 0 ? 1 : -1;
        return sign * Math.pow(Math.abs(t), exponent);
    }

    // ── section bootstrap ──────────────────────────────────────────────────

    document.addEventListener('DOMContentLoaded', function () {
        var section = document.querySelector('.about-alt');
        if (!section) return;

        var viewport           = document.getElementById('scroll-viewport') || null;
        var textBlockContainer = section.querySelector('.about-alt-text-blocks');
        var textBlocks         = textBlockContainer
            ? Array.from(textBlockContainer.querySelectorAll('.about-alt-block'))
            : [];
        var numSlides = textBlocks.length || 1;

        var scatter = window.ScatterImages.init(section, viewport, numSlides, SCATTER_CONFIG);
        var _cachedSlides = null;

        // ── build: fixed body container + scroll-track slides ──────────────

        var bodyEl    = null;
        var bodyShown = false;

        var blockStates = textBlocks.map(function () {
            return { wasReadable: false };
        });

        function buildLayout() {
            if (textBlocks.length === 0 || scatter.state.trackHeight <= 0) return;

            bodyEl = document.createElement('div');
            bodyEl.className = 'about-alt-body';
            bodyEl.style.visibility = 'hidden';
            textBlocks.forEach(function (block) { bodyEl.appendChild(block); });

            var scrollViewport = document.getElementById('scroll-viewport');
            (scrollViewport || document.body).appendChild(bodyEl);

            textBlockContainer.remove();

            var slideHeight = scatter.state.trackHeight / numSlides;
            var slidesWrap  = document.createElement('div');
            slidesWrap.className = 'about-alt-slides';
            textBlocks.forEach(function () {
                var slide = document.createElement('div');
                slide.className = 'about-alt-slide';
                slide.style.height = slideHeight + 'px';
                slidesWrap.appendChild(slide);
            });
            section.appendChild(slidesWrap);
        }

        buildLayout();

        var vpH = window.innerHeight;
        var _initMobile = window.innerWidth < MOBILE_BREAKPOINT;
        textBlocks.forEach(function (block) {
            block.style.opacity   = '0';
            if (!_initMobile) block.style.filter = 'blur(' + BLUR_MAX_PX + 'px)';
            block.style.transform = 'translate3d(0,' + (vpH * TRAVEL_VH) + 'px,0)';
        });

        // ── Doppler scroll ─────────────────────────────────────────────────

        function updateDopplerScroll() {
            if (!bodyEl) return;

            var vpRect = viewport
                ? viewport.getBoundingClientRect()
                : { top: 0, height: window.innerHeight };
            var secRect  = section.getBoundingClientRect();
            var vpH      = vpRect.height;
            var vpCenter = vpH / 2;

            var inView = secRect.top < vpH && secRect.bottom > 0;
            if (inView && !bodyShown) {
                bodyEl.style.visibility = 'visible';
                bodyShown = true;
            } else if (!inView && bodyShown) {
                bodyEl.style.visibility = 'hidden';
                bodyShown = false;
            }
            if (!inView) return;

            var isMobile    = window.innerWidth < MOBILE_BREAKPOINT;
            var slideVH     = isMobile
                ? SCATTER_CONFIG.slideHeightVhMobile
                : SCATTER_CONFIG.slideHeightVhDesktop;
            var slideHeight = slideVH * vpH;
            var range       = slideHeight * RANGE_FACTOR;
            var travelPx    = vpH * TRAVEL_VH;

            if (!_cachedSlides) _cachedSlides = section.querySelectorAll('.about-alt-slide');
            var _isMobileFrame = window.innerWidth < MOBILE_BREAKPOINT;

            textBlocks.forEach(function (block, i) {
                var slide = _cachedSlides[i];
                if (!slide) return;

                var slideRect   = slide.getBoundingClientRect();
                var slideCenter = slideRect.top + slideRect.height / 2;

                var t = (vpCenter - slideCenter) / range;

                var remapped = dopplerRemap(t, DOPPLER_EXPONENT);
                var yPx      = -remapped * travelPx;

                var absT    = Math.abs(t);
                var opacity = 1 - smoothstep(absT, OPACITY_DWELL_START, OPACITY_DWELL_END);

                block.style.transform = 'translate3d(0,' + yPx.toFixed(1) + 'px,0)';
                block.style.opacity   = opacity.toFixed(3);
                if (!_isMobileFrame) {
                    var blur = BLUR_MAX_PX * smoothstep(absT, BLUR_START, BLUR_END);
                    block.style.filter = blur > 0.1 ? 'blur(' + blur.toFixed(1) + 'px)' : 'none';
                }

                var readable = absT < READABLE_THRESHOLD;
                block.classList.toggle('is-readable', readable);

                var bs = blockStates[i];
                if (readable && !bs.wasReadable) {
                    block.querySelectorAll('.cta-btn').forEach(function (cta) {
                        if (cta._altRollTimer) clearTimeout(cta._altRollTimer);
                        cta.classList.add('is-visible');
                        cta._altRollTimer = setTimeout(function () {
                            cta.querySelectorAll('.ui-roll').forEach(function (r) {
                                r.classList.add('is-visible');
                            });
                        }, 400);
                    });
                    bs.wasReadable = true;
                } else if (!readable && bs.wasReadable) {
                    block.querySelectorAll('.cta-btn').forEach(function (cta) {
                        if (cta._altRollTimer) clearTimeout(cta._altRollTimer);
                        cta.querySelectorAll('.ui-roll').forEach(function (r) {
                            r.classList.remove('is-visible');
                        });
                        cta.classList.remove('is-visible');
                    });
                    bs.wasReadable = false;
                }
            });
        }

        // ── kick off ───────────────────────────────────────────────────────

        scatter.updateImageScales();
        updateDopplerScroll();

        window.addEventListener('lenis-scroll', function () {
            scatter.updateImageScales();
            updateDopplerScroll();
        });

        // ── resize ─────────────────────────────────────────────────────────

        var resizeTimer;
        var lastResizeWidth = window.innerWidth;
        window.addEventListener('resize', function () {
            if (window.innerWidth === lastResizeWidth) return;
            lastResizeWidth = window.innerWidth;
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
                scatter.initLayout();
                _cachedSlides = null;
                var slidesAfterResize = section.querySelectorAll('.about-alt-slide');
                if (slidesAfterResize.length > 0) {
                    var h = scatter.state.trackHeight / slidesAfterResize.length;
                    slidesAfterResize.forEach(function (s) { s.style.height = h + 'px'; });
                }
            }, 200);
        });
    });
})();
