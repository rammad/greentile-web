/* scatter-images.js — shared image scatter layout + depth parallax
   ─────────────────────────────────────────────────────────────────
   Used by section-what-we-do.js, section-about-alt.js, and any
   future section that needs the scattered-photo-wall treatment.
   
   Usage:
     var scatter = ScatterImages.init(sectionEl, viewportEl, numSlides, {
         colLeftXMax:  22,          // override any default
         colRightXMin: 62,
         slideHeightVhDesktop: 1.4
     });
     scatter.initLayout();          // call again on resize
     scatter.updateImageScales();   // call on every scroll frame          */

(function () {

    var DEFAULTS = {
        mobileBreakpoint:       768,
        stepYMobile:            150,
        stepYDesktop:           130,
        colLeftXMin:            -5,
        colLeftXMax:            12,
        colRightXMin:           75,
        colRightXMax:           95,
        imgWidthMobileMin:      40,
        imgWidthMobileMax:      55,
        imgWidthDesktopMin:     7,
        imgWidthDesktopMax:     15,
        jitterRange:            80,
        zIndexMax:              20,
        variationMinDiff:       0.2,
        scaleMin:               1.0,
        scaleMax:               1.0,
        depthParallaxStrength:  0.28,
        speedFactorMin:         0.90,
        speedFactorMax:         1.10,
        overlapMinGap:          -250,
        parallaxSafetyDepth:    0.35,
        slideHeightVhDesktop:   0.75,
        slideHeightVhMobile:    0.90
    };

    function merge(defaults, overrides) {
        var out = {};
        for (var k in defaults) {
            if (defaults.hasOwnProperty(k)) {
                out[k] = (overrides && overrides.hasOwnProperty(k)) ? overrides[k] : defaults[k];
            }
        }
        return out;
    }

    function getVariedRandom(min, max, prev, minDiff) {
        if (prev === null || prev === undefined)
            return Math.floor(Math.random() * (max - min + 1)) + min;
        var range   = max - min;
        var minDist = range * minDiff;
        var attempts = 0, value;
        do {
            value = Math.floor(Math.random() * (max - min + 1)) + min;
            attempts++;
        } while (Math.abs(value - prev) < minDist && attempts < 10);
        return value;
    }

    // ── public API ─────────────────────────────────────────────────────────

    function init(section, viewport, numSlides, config) {
        var C      = merge(DEFAULTS, config);
        var track  = section.querySelector('.about-image-track');
        var images = track ? Array.from(track.querySelectorAll('.scatter-img')) : [];
        var state  = { trackHeight: 0, fullHeight: 0 };

        function initLayout() {
            var isMobile = window.innerWidth < C.mobileBreakpoint;
            var stepY    = isMobile ? C.stepYMobile : C.stepYDesktop;
            var vpW      = window.innerWidth;
            var vpH      = window.innerHeight;
            var minW     = isMobile ? C.imgWidthMobileMin : C.imgWidthDesktopMin;
            var maxW     = isMobile ? C.imgWidthMobileMax : C.imgWidthDesktopMax;

            var slideVH            = isMobile ? C.slideHeightVhMobile : C.slideHeightVhDesktop;
            var totalSlideHeight   = numSlides * slideVH * vpH;
            var sectionPadding     = parseFloat(getComputedStyle(section).paddingTop) || 0;
            var fullSectionHeight  = sectionPadding + totalSlideHeight;

            var currentY  = 0;
            var prevLeft  = { x: null, w: null };
            var prevRight = { x: null, w: null };

            // first pass — assign initial positions
            var imageData = [];
            images.forEach(function (img, index) {
                var isLeft = index % 2 === 0;
                var prev   = isLeft ? prevLeft : prevRight;

                var minX    = isLeft ? C.colLeftXMin  : C.colRightXMin;
                var maxX    = isLeft ? C.colLeftXMax  : C.colRightXMax;
                var randomX = getVariedRandom(minX, maxX, prev.x, C.variationMinDiff);
                var randomW = getVariedRandom(minW, maxW, prev.w, C.variationMinDiff);

                var jitter     = Math.floor(Math.random() * C.jitterRange) - C.jitterRange / 2;
                var naturalTop = currentY + jitter;

                var normalizedSize = (randomW - minW) / Math.max(1, maxW - minW);
                var speedFactor    = parseFloat((
                    C.speedFactorMin + normalizedSize * (C.speedFactorMax - C.speedFactorMin)
                ).toFixed(3));

                imageData.push({
                    img: img, naturalTop: naturalTop, widthVw: randomW,
                    x: randomX, normalizedSize: normalizedSize, speedFactor: speedFactor
                });
                prev.x = randomX;
                prev.w = randomW;
                currentY += stepY;
            });

            // second pass — resolve same-column overlaps
            var speedRange     = C.speedFactorMax - C.speedFactorMin;
            var parallaxBuffer = vpH * C.parallaxSafetyDepth * speedRange * C.depthParallaxStrength;

            for (var i = 2; i < imageData.length; i++) {
                var prevD = imageData[i - 2];
                var curr  = imageData[i];
                var prevWidthPx  = (prevD.widthVw / 100) * vpW;
                var prevHeightPx = prevWidthPx * (5 / 4);
                var minRequiredTop = prevD.naturalTop + prevHeightPx + parallaxBuffer + C.overlapMinGap;
                if (curr.naturalTop < minRequiredTop) {
                    var delta = minRequiredTop - curr.naturalTop;
                    for (var j = i; j < imageData.length; j += 2) {
                        imageData[j].naturalTop += delta;
                    }
                }
            }

            // third pass — normalize positions to fill section height
            var rawMinTop = Infinity, rawMaxBottom = -Infinity, bottomImgH = 0;
            imageData.forEach(function (d) {
                var h = (d.widthVw / 100) * vpW * (5 / 4);
                if (d.naturalTop < rawMinTop) rawMinTop = d.naturalTop;
                if (d.naturalTop + h > rawMaxBottom) { rawMaxBottom = d.naturalTop + h; bottomImgH = h; }
            });
            var srcRange = (rawMaxBottom - bottomImgH) - rawMinTop;
            var dstRange = fullSectionHeight - bottomImgH;
            if (srcRange > 0 && dstRange > 0) {
                imageData.forEach(function (d) {
                    d.naturalTop = ((d.naturalTop - rawMinTop) / srcRange) * dstRange;
                });
            }

            // apply final positions
            imageData.forEach(function (d) {
                d.img.style.width         = d.widthVw + 'vw';
                d.img.style.left          = d.x + '%';
                d.img.style.top           = d.naturalTop + 'px';
                d.img.dataset.naturalTop  = String(d.naturalTop);
                d.img.style.zIndex        = 1 + Math.round(d.normalizedSize * (C.zIndexMax - 1));
                d.img.dataset.speedFactor = String(d.speedFactor);
            });

            state.trackHeight = totalSlideHeight;
            state.fullHeight  = fullSectionHeight;
            if (track) track.style.height = state.fullHeight + 'px';
        }

        function updateImageScales() {
            if (!viewport) return;
            var viewportRect    = viewport.getBoundingClientRect();
            var viewportCenterY = viewportRect.height / 2;
            var sectionTop      = section.getBoundingClientRect().top;
            var depthOffset     = Math.max(0, viewportRect.height - sectionTop);

            images.forEach(function (img) {
                var imgRect    = img.getBoundingClientRect();
                var imgCenterY = imgRect.top + imgRect.height / 2 - viewportRect.top;
                var dist       = Math.abs(imgCenterY - viewportCenterY);
                var proximity  = 1 - Math.min(dist / (viewportRect.height / 2), 1);
                var scale      = C.scaleMin + (C.scaleMax - C.scaleMin) * proximity;

                var speedFactor = parseFloat(img.dataset.speedFactor || '1');
                var parallaxY   = depthOffset * (1 - speedFactor) * C.depthParallaxStrength;

                var naturalTop  = parseFloat(img.dataset.naturalTop || '0');
                var imgH        = img.offsetHeight;
                var minParallax = -naturalTop;
                var maxParallax = state.fullHeight - naturalTop - imgH;
                var clampedY    = Math.max(minParallax, Math.min(maxParallax, parallaxY));

                img.style.transform = 'translateY(' + clampedY.toFixed(2) + 'px) scale(' + scale + ')';
            });
        }

        initLayout();
        if (track) track.classList.add('about-image-track-positioned');

        return { state: state, initLayout: initLayout, updateImageScales: updateImageScales };
    }

    window.ScatterImages = { init: init };

})();
