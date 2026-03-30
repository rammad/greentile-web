/* scatter-images.js — column-based image layout with depth layers
   ─────────────────────────────────────────────────────────────────
   Images are placed into fixed vertical columns rather than being
   randomly scattered.  Front columns sit on the left/right edges
   with full opacity; back columns sit closer to center with blur
   and reduced opacity for atmospheric depth.

   Back-layer images are cloned from the front-layer source images
   automatically — no extra assets needed.

   Responsive tiers:
     desktop  (≥1200):  4 front + 4 back  = 8 columns
     tablet   (768–1199): 2 front + 2 back = 4 columns
     mobile   (<768):    2 front + 2 back  = 4 columns

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
            { id: 'fil', x: 14,  layer: 'front', stagger: -0.25, frameInset: 8  },
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
            { id: 'fl',  x: -4, layer: 'front', stagger: -0.20, frameInset: 8 },
            { id: 'bl',  x: 16,   layer: 'back',  stagger: -0.15, frameInset: 8 },
            { id: 'br',  x: 68,  layer: 'back',  stagger: -0.15, frameInset: -8 },
            { id: 'fr',  x: 86,  layer: 'front', stagger: -0.20, frameInset: -8 }
        ]
    };

    var DEFAULTS = {
        // ── breakpoints ────────────────────────────────────────────────────
        mobileBreakpoint:       768,   // px — below this = mobile layout
        tabletBreakpoint:       1200,  // px — below this = tablet, above = desktop

        // ── section height ─────────────────────────────────────────────────
        slideHeightVhDesktop:   0.75,  // vh per slide — controls total section height (desktop)
        slideHeightVhMobile:    0.85,  // vh per slide — same for mobile

        // ── image sizing (desktop) ────────────────────────────────────────
        desktopFrontMinPx:      120,   // px — smallest front image width on desktop
        desktopFrontMaxPx:      180,   // px — largest front image width on desktop
        desktopBackMinPx:       80,    // px — smallest back image width on desktop
        desktopBackMaxPx:       120,   // px — largest back image width on desktop

        // ── image sizing (tablet) ─────────────────────────────────────────
        tabletFrontMinPx:       90,    // px — smallest front image width on tablet
        tabletFrontMaxPx:       140,   // px — largest front image width on tablet
        tabletBackMinPx:        60,    // px — smallest back image width on tablet
        tabletBackMaxPx:        90,    // px — largest back image width on tablet

        // ── image sizing (mobile) ─────────────────────────────────────────
        mobileFrontMinPx:       80,    // px — smallest front image width on mobile
        mobileFrontMaxPx:       120,   // px — largest front image width on mobile
        mobileBackMinPx:        50,    // px — smallest back image width on mobile
        mobileBackMaxPx:        70,    // px — largest back image width on mobile

        // ── vertical & horizontal scatter ──────────────────────────────────
        verticalJitter:         0.12,  // 0–1 — random vertical offset for front images (fraction of spacing)
        backVerticalJitter:     0.30,  // 0–1 — random vertical offset for back images (fraction of spacing)
        mobileVerticalJitter:   0.30,  // 0–1 — front vertical jitter on mobile
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
                        var clone = document.createElement('img');
                        clone.src = srcPool[poolIdx % srcPool.length];
                        clone.className = 'scatter-img back-layer';
                        clone.setAttribute('aria-hidden', 'true');
                        track.appendChild(clone);
                        backClones.push(clone);
                        backBuckets[col.id].push(clone);
                        poolIdx++;
                    }
                });
            }

            // ── size ranges ────────────────────────────────────────────────

            var frontMinW, frontMaxW, backMinW, backMaxW;
            if (isMobile) {
                frontMinW = C.mobileFrontMinPx;
                frontMaxW = C.mobileFrontMaxPx;
                backMinW  = C.mobileBackMinPx;
                backMaxW  = C.mobileBackMaxPx;
            } else if (bp === 'tablet') {
                frontMinW = C.tabletFrontMinPx;
                frontMaxW = C.tabletFrontMaxPx;
                backMinW  = C.tabletBackMinPx;
                backMaxW  = C.tabletBackMaxPx;
            } else {
                frontMinW = C.desktopFrontMinPx;
                frontMaxW = C.desktopFrontMaxPx;
                backMinW  = C.desktopBackMinPx;
                backMaxW  = C.desktopBackMaxPx;
            }

            // ── position each column's images ──────────────────────────────

            function positionColumn(colDef, images, minW, maxW, isBack) {
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

                images.forEach(function (img, i) {
                    var baseTop = edgeTop + spacing * (i + 0.5) + staggerPx;
                    var jitter  = (Math.random() - 0.5) * 2 * jitterAmt;
                    var imgW    = Math.round(randRange(minW, maxW));
                    var imgH    = imgW * (5 / 4);
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
                });
            }

            frontCols.forEach(function (col) {
                positionColumn(col, frontBuckets[col.id], frontMinW, frontMaxW, false);
            });
            backCols.forEach(function (col) {
                positionColumn(col, backBuckets[col.id], backMinW, backMaxW, true);
            });

            state.trackHeight = totalSlideHeight;
            state.fullHeight  = fullSectionHeight;
            if (track) track.style.height = state.fullHeight + 'px';
        }

        // ── parallax on scroll ────────────────────────────────────────────

        function updateImageScales() {
            if (!viewport) return;
            var vpRect     = viewport.getBoundingClientRect();
            var vpH        = vpRect.height;
            var sectionTop = section.getBoundingClientRect().top;
            var depth      = Math.max(0, vpH - sectionTop);

            // Entrance easing: constant deceleration over the last 10% of
            // each image's parallax displacement.  Because parallax is linear
            // in depth, easing depth directly achieves per-image easing.
            // Deceleration zone = 0.2·vpH of scroll to cover the final 10%.
            var easeStart  = vpH * 0.9;
            var easeLen    = vpH * 0.2;
            var easedDepth;
            if (depth <= easeStart) {
                easedDepth = depth;
            } else {
                var u = Math.min(depth - easeStart, easeLen);
                easedDepth = easeStart + u - (u * u) / (2 * easeLen);
            }

            allElements.forEach(function (img) {
                var speed      = parseFloat(img.dataset.speedFactor || '1');
                var parallaxY  = easedDepth * (1 - speed) * C.depthParallaxStrength;
                var naturalTop = parseFloat(img.dataset.naturalTop || '0');
                var imgH       = img.offsetHeight || 0;
                var isBack     = img.classList.contains('back-layer');
                var minP       = -naturalTop;
                var maxP       = isBack ? Infinity : state.fullHeight - naturalTop - imgH;
                var clamped    = Math.max(minP, Math.min(maxP, parallaxY));

                img.style.transform = 'translateY(' + clamped.toFixed(2) + 'px)';
            });
        }

        // ── expose ────────────────────────────────────────────────────────

        var api = {
            state:             state,
            initLayout:        initLayout,
            updateImageScales: updateImageScales,
            avoidanceEl:       null
        };

        initLayout();
        if (track) track.classList.add('about-image-track-positioned');

        return api;
    }

    window.ScatterImages = { init: init };

})();
