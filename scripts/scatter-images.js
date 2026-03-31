/* scatter-images.js — column-based image layout with depth layers
   ─────────────────────────────────────────────────────────────────
   Images are placed into fixed vertical columns rather than being
   randomly scattered.  Front columns sit on the left/right edges
   with full opacity; back columns sit closer to center with blur
   and reduced opacity for atmospheric depth.

   Back-layer images are cloned from the front-layer source images
   automatically — no extra assets needed.

   Responsive tiers:
     desktop  (≥1200):   4 front + 4 back  = 8 columns
     tablet   (1024–1199): 2 front + 2 back = 4 columns
     mobile   (<1024):   2 front + 2 back  = 4 columns

   Usage (same API as the previous scatter module):
     var scatter = ScatterImages.init(sectionEl, viewportEl, numSlides, {});
     scatter.initLayout();          // call again on resize
     scatter.updateImageScales();   // call on every scroll frame          */

(function () {

    // ── column definitions per breakpoint ─────────────────────────────────

    var COLUMNS = {
        desktop: [
            //        x       layer    stagger (centered around 0)
            // Left side — back-outer nestles between the two front columns
            { id: 'fol', x: -2,  layer: 'front', stagger:  0.08 },
            { id: 'bol', x: 6,   layer: 'back',  stagger: -0.10 },
            { id: 'fil', x: 14,  layer: 'front', stagger: -0.25, frameInset: 8, flushTop: true },
            { id: 'bil', x: 26,  layer: 'back',  stagger: -0.20, frameInset: 8  },
            // Right side — mirror
            { id: 'bir', x: 66,  layer: 'back',  stagger: -0.20, frameInset: -8 },
            { id: 'fir', x: 76,  layer: 'front', stagger: -0.25, frameInset: -8 },
            { id: 'bor', x: 84,  layer: 'back',  stagger: -0.10 },
            { id: 'for', x: 91,  layer: 'front', stagger:  0.08 }
        ],
        tablet: [
            { id: 'fl',  x: 0,   layer: 'front', stagger: -0.20 },
            { id: 'bl',  x: 12,  layer: 'back',  stagger:  0.20 },
            { id: 'br',  x: 76,  layer: 'back',  stagger:  0.20 },
            { id: 'fr',  x: 86,  layer: 'front', stagger: -0.20 }
        ],
        mobile: [
            { id: 'fl',  x: -10, layer: 'front', stagger: -0.20, flushTop: true },
            { id: 'bl',  x: 13,   layer: 'back',  stagger: -0.15, frameInset: 5 },
            { id: 'br',  x: 71,  layer: 'back',  stagger: -0.15, frameInset: -5 },
            { id: 'fr',  x: 86,  layer: 'front', stagger: 0.08 }
        ]
    };

    var DEFAULTS = {
        // ── breakpoints ────────────────────────────────────────────────────
        mobileBreakpoint:       1024,  // px — below this = mobile layout
        tabletBreakpoint:       1200,  // px — below this = tablet, above = desktop

        // ── section height ─────────────────────────────────────────────────
        slideHeightVhDesktop:   0.85,  // vh per slide — controls total section height (desktop)
        slideHeightVhMobile:    0.85,  // vh per slide — same for mobile

        // ── image sizing — vw-based with px clamp ────────────────────────
        //   width = clamp(min, vw × viewport-width, max)
        desktopImages: { frontVw: 0.10, frontMin: 120, frontMax: 200, backVw: 0.07, backMin: 80,  backMax: 140 },
        tabletImages:  { frontVw: 0.10, frontMin: 90,  frontMax: 160, backVw: 0.07, backMin: 60,  backMax: 100 },
        mobileImages:  { frontVw: 0.25, frontMin: 80,  frontMax: 140, backVw: 0.16, backMin: 50,  backMax: 90  },

        // ── vertical & horizontal scatter ──────────────────────────────────
        verticalJitter:         0.12,  // 0–1 — random vertical offset for front images (fraction of spacing)
        backVerticalJitter:     0.30,  // 0–1 — random vertical offset for back images (fraction of spacing)
        mobileVerticalJitter:   0.25,  // 0–1 — front vertical jitter on mobile
        mobileBackVerticalJitter: 0.40, // 0–1 — back vertical jitter on mobile
        horizontalJitterPct:    1.5,   // % — random horizontal offset per image within its column

        // ── parallax ───────────────────────────────────────────────────────
        frontSpeedMin:          0.94,  // parallax speed range for front images (1.0 = natural scroll)
        frontSpeedMax:          1.06,
        backSpeedMin:           0.55,  // parallax speed range for back images (lower = more parallax)
        backSpeedMax:           0.70,
        depthParallaxStrength:  0.50,  // multiplier — overall parallax intensity

        // ── image counts & layout ──────────────────────────────────────────
        backImagesPerCol:       5,     // cloned back images per back column
        mobileBackImagesPerCol: 8,     // cloned back images per back column on mobile
        maxImagesPerColMobile:  10,    // max front images per column on mobile
        frameCount:             1,     // images at top and bottom of each inner column to inset toward center (desktop)
        mobileFrameCount:       1,     // same but for mobile (more images per column so needs more)

        // ── spacing ────────────────────────────────────────────────────────
        edgePadding:            0,     // 0–1 — fraction of section height reserved at top and bottom edges

        overhangTopVh:          0      // vh — extra height above the section (desktop only)
    };

    // ── utilities ─────────────────────────────────────────────────────────

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

    function shuffle(arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    }

    function randRange(min, max) {
        return min + Math.random() * (max - min);
    }

    // ── public API ────────────────────────────────────────────────────────

    function init(section, viewport, numSlides, config) {
        var C      = mergeConfig(DEFAULTS, config);
        var track  = section.querySelector('.about-image-track');
        var sourceImages = track
            ? Array.from(track.querySelectorAll('.scatter-img:not(.back-layer)'))
            : [];
        var allElements = [];
        var imgCache    = [];
        var backClones  = [];
        var state       = { trackHeight: 0, fullHeight: 0 };

        function getBreakpoint() {
            var w = window.innerWidth;
            if (w < C.mobileBreakpoint)  return 'mobile';
            if (w < C.tabletBreakpoint)  return 'tablet';
            return 'desktop';
        }

        // ── layout ────────────────────────────────────────────────────────

        function initLayout() {
            backClones.forEach(function (el) { el.remove(); });
            backClones  = [];
            allElements = [];
            imgCache    = [];

            var bp       = getBreakpoint();
            var isMobile = bp === 'mobile';
            var vpW      = window.innerWidth;
            var vpH      = window.innerHeight;
            var columns  = COLUMNS[bp];

            var slideVH          = isMobile ? C.slideHeightVhMobile : C.slideHeightVhDesktop;
            var totalSlideHeight = numSlides * slideVH * vpH;
            var sectionPadding   = parseFloat(getComputedStyle(section).paddingTop) || 0;
            var overhangPx       = isMobile ? 0 : C.overhangTopVh * vpH;
            var fullSectionHeight = overhangPx + sectionPadding + totalSlideHeight;

            var frontCols = columns.filter(function (c) { return c.layer === 'front'; });
            var backCols  = columns.filter(function (c) { return c.layer === 'back';  });

            // ── distribute source images into front columns (round-robin) ──

            var frontBuckets = {};
            frontCols.forEach(function (c) { frontBuckets[c.id] = []; });

            var maxPerCol = isMobile ? C.maxImagesPerColMobile : 999;

            sourceImages.forEach(function (img, i) {
                var col = frontCols[i % frontCols.length];
                if (frontBuckets[col.id].length < maxPerCol) {
                    frontBuckets[col.id].push(img);
                }
            });

            // track which source images are placed so we can hide the rest
            var usedIdx = {};
            frontCols.forEach(function (c) {
                frontBuckets[c.id].forEach(function (img) {
                    usedIdx[sourceImages.indexOf(img)] = true;
                });
            });
            sourceImages.forEach(function (img, idx) {
                img.style.display = usedIdx[idx] ? '' : 'none';
            });

            // ── create back-layer clones ───────────────────────────────────

            var backBuckets = {};
            backCols.forEach(function (c) { backBuckets[c.id] = []; });

            if (backCols.length > 0 && sourceImages.length > 0) {
                var srcPool = shuffle(sourceImages.map(function (img) { return img.src; }));
                var poolIdx = 0;
                var backPerCol = isMobile ? C.mobileBackImagesPerCol : C.backImagesPerCol;
                backCols.forEach(function (col) {
                    for (var i = 0; i < backPerCol; i++) {
                        var clone;
                        if (isMobile) {
                            clone = document.createElement('div');
                            clone.className = 'scatter-img back-layer back-card';
                        } else {
                            clone = document.createElement('img');
                            clone.src = srcPool[poolIdx % srcPool.length];
                            clone.className = 'scatter-img back-layer';
                        }
                        clone.setAttribute('aria-hidden', 'true');
                        track.appendChild(clone);
                        backClones.push(clone);
                        backBuckets[col.id].push(clone);
                        poolIdx++;
                    }
                });
            }

            // ── size ranges ────────────────────────────────────────────────

            var imgCfg   = isMobile ? C.mobileImages
                         : bp === 'tablet' ? C.tabletImages
                         : C.desktopImages;
            var frontVw   = imgCfg.frontVw,  frontMinW = imgCfg.frontMin, frontMaxW = imgCfg.frontMax;
            var backVw    = imgCfg.backVw,   backMinW  = imgCfg.backMin,  backMaxW  = imgCfg.backMax;

            // ── position each column's images ──────────────────────────────

            function positionColumn(colDef, images, minW, maxW, vwScale, isBack) {
                var count = images.length;
                if (count === 0) return;

                var edgeTop    = fullSectionHeight * C.edgePadding;
                var usable     = fullSectionHeight * (1 - 2 * C.edgePadding);
                var spacing    = usable / Math.max(1, count);
                var staggerPx  = (colDef.stagger || 0) * spacing;
                var jitterVal  = isMobile
                    ? (isBack ? C.mobileBackVerticalJitter : C.mobileVerticalJitter)
                    : (isBack ? C.backVerticalJitter : C.verticalJitter);
                var jitterAmt  = spacing * jitterVal;
                var frameInset = colDef.frameInset || 0;
                var frameN     = frameInset ? (isMobile ? C.mobileFrameCount : C.frameCount) : 0;
                var imgW       = Math.round(Math.max(minW, Math.min(maxW, vpW * vwScale)));
                var imgH       = imgW * (5 / 4);

                images.forEach(function (img, i) {
                    var centerOffset = (colDef.flushTop && i === 0) ? 0 : 0.5;
                    var baseTop = edgeTop + spacing * (i + centerOffset) + staggerPx;
                    var jitter  = (Math.random() - 0.5) * 2 * jitterAmt;
                    var rawTop  = baseTop + jitter;

                    var top = Math.max(0, Math.min(fullSectionHeight - imgH, rawTop));

                    var speed = isBack
                        ? randRange(C.backSpeedMin, C.backSpeedMax)
                        : randRange(C.frontSpeedMin, C.frontSpeedMax);

                    var xJitter = (Math.random() - 0.5) * 2 * C.horizontalJitterPct;
                    var insetX  = (frameN > 0 && (i < frameN || i >= count - frameN))
                        ? frameInset : 0;

                    img.style.display  = (isBack && i === count - 1) ? 'none' : '';
                    img.style.position = 'absolute';
                    img.style.width    = imgW + 'px';
                    img.style.left     = (colDef.x + xJitter + insetX) + '%';
                    img.style.top      = top + 'px';
                    img.style.zIndex   = isBack ? 2 : 10;
                    img.dataset.naturalTop  = String(top);
                    img.dataset.speedFactor = speed.toFixed(3);

                    allElements.push(img);
                    imgCache.push({
                        el:         img,
                        speed:      speed,
                        naturalTop: top,
                        height:     imgH,
                        isBack:     isBack
                    });
                });
            }

            frontCols.forEach(function (col) {
                positionColumn(col, frontBuckets[col.id], frontMinW, frontMaxW, frontVw, false);
            });
            backCols.forEach(function (col) {
                positionColumn(col, backBuckets[col.id], backMinW, backMaxW, backVw, true);
            });

            state.trackHeight = totalSlideHeight;
            state.fullHeight  = fullSectionHeight;
            if (track) track.style.height = state.fullHeight + 'px';
        }

        // ── parallax on scroll ────────────────────────────────────────────

        var _smoothFactor = 0;
        var _currentDepth = -1;
        var _targetDepth  = 0;
        var _smoothRaf    = 0;

        function applyDepth(easedDepth) {
            var fH       = state.fullHeight;
            var strength = C.depthParallaxStrength;
            for (var i = 0, len = imgCache.length; i < len; i++) {
                var c         = imgCache[i];
                var parallaxY = easedDepth * (1 - c.speed) * strength;
                var minP      = -c.naturalTop;
                var maxP      = c.isBack ? Infinity : fH - c.naturalTop - c.height;
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

        // ── expose ────────────────────────────────────────────────────────

        var api = {
            state:             state,
            initLayout:        initLayout,
            updateImageScales: updateImageScales,
            setSmooth:         setSmooth,
            avoidanceEl:       null
        };

        initLayout();
        if (track) track.classList.add('about-image-track-positioned');

        return api;
    }

    window.ScatterImages = { init: init };

})();
