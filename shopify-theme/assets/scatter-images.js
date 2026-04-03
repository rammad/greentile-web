/* scatter-images.js — positions images at fixed px offsets from a central gap.
   gap width is driven by --center-clearance.
   desktop: 4 cols, parallax / tablet+mobile: 2 cols, no parallax */

(function () {

    // column definitions per breakpoint
    // offset: px from gap edge, frameShiftPx: shift toward gap, stagger: vertical offset fraction

    function _scatterScale() {
        return (window.AppUtils && window.AppUtils.getLayoutScale) ? window.AppUtils.getLayoutScale() : 1;
    }

    function _scaledDesktopCols() {
        var s = _scatterScale();
        return [
            { id: 'fol', side: 'left',  offset: 300 * s, stagger:  0.08 },
            { id: 'fil', side: 'left',  offset: -70 * s,  stagger: -0.25, frameShiftPx: 60 * s, flushTop: true },
            { id: 'fir', side: 'right', offset: -70 * s,  stagger: -0.25, frameShiftPx: 60 * s },
            { id: 'for', side: 'right', offset: 300 * s, stagger:  0.08 }
        ];
    }

    var COLUMNS = {
        get desktop() { return _scaledDesktopCols(); },
        tablet: [
            { id: 'fl', side: 'left',  offset: 100, stagger: 0 },
            { id: 'fr', side: 'right', offset: 100, stagger: 0 }
        ],
        mobile: [
            { id: 'fl', side: 'left',  offset: 15, stagger: 0 },
            { id: 'fr', side: 'right', offset: 15, stagger: 0 }
        ]
    };

    var DEFAULTS = {
        mobileBreakpoint:       768,
        tabletBreakpoint:       1024,

        slideHeightVhDesktop:   1.25,
        slideHeightVhMobile:    1.1,

        desktopImageWidth:      180,
        tabletImageWidth:       200,
        mobileImageWidth:       125,

        verticalJitter:         0.30,
        compactVerticalJitter:  0,

        horizontalJitterPx:     40,
        alternateOffsetPx:      20,

        frontSpeedMin:          0.94,
        frontSpeedMax:          1.06,
        depthParallaxStrength:  0.50,

        maxImagesPerColCompact: 14,
        frameCount:             1,
        compactFrameCount:      0,

        edgePadding:            0,
        overhangTopVh:          0,
    };

    function mergeConfig(defaults, overrides) {
        var out = {};
        for (var k in defaults) {
            if (defaults.hasOwnProperty(k)) {
                out[k] = (overrides && overrides.hasOwnProperty(k))
                    ? overrides[k] : defaults[k];
            }
        }
        return out;
    }

    function randRange(min, max) {
        return min + Math.random() * (max - min);
    }

    // public api

    function init(section, viewport, numSlides, config) {
        var C      = mergeConfig(DEFAULTS, config);
        var track  = section.querySelector('.about-image-track');
        var sourceImages = track
            ? Array.from(track.querySelectorAll('.scatter-img'))
            : [];
        var allElements = [];
        var imgCache    = [];
        var state       = { trackHeight: 0, fullHeight: 0 };

        function getBreakpoint() {
            var w = window.innerWidth;
            if (w <= C.mobileBreakpoint)  return 'mobile';
            if (w <= C.tabletBreakpoint)  return 'tablet';
            return 'desktop';
        }

        var _s = _scatterScale();

        // layout

        function initLayout() {
            allElements = [];
            imgCache    = [];

            // Clean up any zone elements from a previous layout system
            if (track) {
                var oldZones = track.querySelectorAll('.image-zone, .image-zone-left, .image-zone-right, .image-zone-gap');
                oldZones.forEach(function (z) {
                    var imgs = z.querySelectorAll('.scatter-img');
                    imgs.forEach(function (img) { track.appendChild(img); });
                    z.remove();
                });
            }

            var bp       = getBreakpoint();
            var isMobile = bp === 'mobile';
            var compact  = bp !== 'desktop';
            var vpH      = window.innerHeight;
            var columns  = COLUMNS[bp];

            var slideVH           = isMobile ? C.slideHeightVhMobile : C.slideHeightVhDesktop;
            var totalSlideHeight  = numSlides * slideVH * vpH;
            var sectionPadding    = parseFloat(getComputedStyle(section).paddingTop) || 0;
            var overhangPx        = compact ? 0 : C.overhangTopVh * vpH;
            var fullSectionHeight = overhangPx + sectionPadding + totalSlideHeight;

            var imgW = isMobile ? C.mobileImageWidth
                     : bp === 'tablet' ? C.tabletImageWidth
                     : C.desktopImageWidth * _s;

            // distribute source images into columns (round-robin)

            var buckets = {};
            columns.forEach(function (c) { buckets[c.id] = []; });

            var maxPerCol = compact ? C.maxImagesPerColCompact : 999;

            sourceImages.forEach(function (img, i) {
                var col = columns[i % columns.length];
                if (buckets[col.id].length < maxPerCol) {
                    buckets[col.id].push(img);
                }
            });

            var usedIdx = {};
            columns.forEach(function (c) {
                buckets[c.id].forEach(function (img) {
                    usedIdx[sourceImages.indexOf(img)] = true;
                });
            });
            sourceImages.forEach(function (img, idx) {
                img.style.display = usedIdx[idx] ? '' : 'none';
            });

            // CSS variable reference for center-relative calc()
            var cv = 'var(--center-clearance, 40%)';

            // position each column's images

            function positionColumn(colDef, images) {
                var count = images.length;
                if (count === 0) return;

                var edgeTop    = fullSectionHeight * C.edgePadding;
                var usable     = fullSectionHeight * (1 - 2 * C.edgePadding);
                var spacing    = usable / Math.max(1, count);
                var staggerPx  = (colDef.stagger || 0) * spacing;
                var jitterVal  = compact ? C.compactVerticalJitter : C.verticalJitter;
                var jitterAmt  = spacing * jitterVal;
                var fShiftPx   = colDef.frameShiftPx || 0;
                var frameN     = fShiftPx ? (compact ? C.compactFrameCount : C.frameCount) : 0;
                var imgH       = imgW * (5 / 4);

                images.forEach(function (img, i) {
                    if (img.parentNode !== track) track.appendChild(img);

                    // vertical
                    var centerOffset = (colDef.flushTop && i === 0) ? 0 : 0.5;
                    var baseTop  = edgeTop + spacing * (i + centerOffset) + staggerPx;
                    var vJitter  = compact ? 0 : (Math.random() - 0.5) * 2 * jitterAmt;
                    var top      = Math.max(0, Math.min(fullSectionHeight - imgH, baseTop + vJitter));

                    // horizontal offset (fixed px from gap edge)
                    var hJitter;
                    if (compact) {
                        hJitter = ((i % 2 === 0) ? -1 : 1) * C.alternateOffsetPx;
                    } else {
                        hJitter = (Math.random() - 0.5) * 2 * C.horizontalJitterPx * _s;
                    }

                    var frameShift = (frameN > 0 && (i < frameN || i >= count - frameN))
                        ? fShiftPx : 0;

                    // positive = further from gap, negative = closer to gap
                    var totalOffset = colDef.offset + hJitter - frameShift;

                    // parallax speed
                    var speed = compact ? 1.0 : randRange(C.frontSpeedMin, C.frontSpeedMax);

                    // apply
                    img.style.position = 'absolute';
                    img.style.width    = imgW + 'px';
                    img.style.top      = top + 'px';
                    img.style.zIndex   = '10';
                    img.style.right    = '';

                    if (colDef.side === 'left') {
                        img.style.left = 'calc(50% - ' + cv + ' / 2 - ' + (totalOffset + imgW) + 'px)';
                    } else {
                        img.style.left = 'calc(50% + ' + cv + ' / 2 + ' + totalOffset + 'px)';
                    }

                    img.dataset.naturalTop  = String(top);
                    img.dataset.speedFactor = speed.toFixed(3);

                    allElements.push(img);
                    imgCache.push({
                        el:         img,
                        speed:      speed,
                        naturalTop: top,
                        height:     imgH
                    });
                });
            }

            columns.forEach(function (col) {
                positionColumn(col, buckets[col.id]);
            });

            state.trackHeight = totalSlideHeight;
            state.fullHeight  = fullSectionHeight;
            if (track) track.style.height = state.fullHeight + 'px';

            _allUnity = imgCache.length > 0 && imgCache.every(function (c) { return c.speed === 1; });
        }

        // parallax on scroll

        var _smoothFactor = 0;
        var _currentDepth = -1;
        var _targetDepth  = 0;
        var _smoothRaf    = 0;

        var _allUnity = false;

        function applyDepth(easedDepth) {
            if (_allUnity) return;
            var fH       = state.fullHeight;
            var strength = C.depthParallaxStrength;
            for (var i = 0, len = imgCache.length; i < len; i++) {
                var c         = imgCache[i];
                var parallaxY = easedDepth * (1 - c.speed) * strength;
                var minP      = -c.naturalTop;
                var maxP      = fH - c.naturalTop - c.height;
                var clamped   = parallaxY < minP ? minP : (parallaxY > maxP ? maxP : parallaxY);
                c.el.style.transform = 'translate3d(0,' + clamped.toFixed(2) + 'px,0)';
            }
        }

        function easeRaw(depth, vpH) {
            var easeStart = vpH * 0.9;
            var easeLen   = vpH * 0.2;
            if (depth <= easeStart) return depth;
            var u = Math.min(depth - easeStart, easeLen);
            return easeStart + u - (u * u) / (2 * easeLen);
        }

        function smoothTick() {
            _currentDepth += (_targetDepth - _currentDepth) * _smoothFactor;
            if (Math.abs(_targetDepth - _currentDepth) < 0.5) {
                _currentDepth = _targetDepth;
            }
            applyDepth(_currentDepth);
            if (_currentDepth !== _targetDepth) {
                _smoothRaf = requestAnimationFrame(smoothTick);
            } else {
                _smoothRaf = 0;
            }
        }

        function updateImageScales(preVpH, preSectionTop) {
            if (!viewport) return;
            var vpH        = preVpH || viewport.getBoundingClientRect().height;
            var sectionTop = preSectionTop !== undefined ? preSectionTop : section.getBoundingClientRect().top;
            var rawDepth   = Math.max(0, vpH - sectionTop);
            var easedDepth = easeRaw(rawDepth, vpH);

            if (_smoothFactor > 0) {
                _targetDepth = easedDepth;
                if (_currentDepth < 0) _currentDepth = easedDepth;
                if (!_smoothRaf) _smoothRaf = requestAnimationFrame(smoothTick);
            } else {
                applyDepth(easedDepth);
            }
        }

        function setSmooth(factor) {
            _smoothFactor = factor;
            if (factor <= 0 && _smoothRaf) {
                cancelAnimationFrame(_smoothRaf);
                _smoothRaf = 0;
            }
        }

        // expose

        var api = {
            state:             state,
            initLayout:        initLayout,
            updateImageScales: updateImageScales,
            setSmooth:         setSmooth
        };

        initLayout();
        if (track) track.classList.add('about-image-track-positioned');

        return api;
    }

    window.ScatterImages = { init: init };

})();
