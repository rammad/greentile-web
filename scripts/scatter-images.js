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
            { id: 'fl',  x: -3,  layer: 'front', stagger: -0.20 },
            { id: 'bl',  x: 16,  layer: 'back',  stagger:  0.20 },
            { id: 'br',  x: 60,  layer: 'back',  stagger:  0.20 },
            { id: 'fr',  x: 78,  layer: 'front', stagger: -0.20 }
        ]
    };

    var DEFAULTS = {
        // ── breakpoints ────────────────────────────────────────────────────
        mobileBreakpoint:       768,   // px — below this = mobile layout
        tabletBreakpoint:       1200,  // px — below this = tablet, above = desktop

        // ── section height ─────────────────────────────────────────────────
        slideHeightVhDesktop:   0.75,  // vh per slide — controls total section height (desktop)
        slideHeightVhMobile:    0.60,  // vh per slide — same for mobile

        // ── image sizing (desktop/tablet) ──────────────────────────────────
        frontWidthMinVw:        8,     // vw — smallest front image width
        frontWidthMaxVw:        12,    // vw — largest front image width
        backWidthMinVw:         6,     // vw — smallest back image width
        backWidthMaxVw:         9,     // vw — largest back image width

        // ── image sizing (mobile) ──────────────────────────────────────────
        mobileFrontWidthMinPx:  65,    // px — smallest front image width on mobile
        mobileFrontWidthMaxPx:  95,    // px — largest front image width on mobile
        mobileBackWidthMinPx:   50,    // px — smallest back image width on mobile
        mobileBackWidthMaxPx:   70,    // px — largest back image width on mobile

        // ── vertical & horizontal scatter ──────────────────────────────────
        verticalJitter:         0.12,  // 0–1 — random vertical offset per image (fraction of spacing)
        horizontalJitterPct:    1.5,   // % — random horizontal offset per image within its column

        // ── parallax ───────────────────────────────────────────────────────
        frontSpeedMin:          0.94,  // parallax speed range for front images (1.0 = natural scroll)
        frontSpeedMax:          1.06,
        backSpeedMin:           0.55,  // parallax speed range for back images (lower = more parallax)
        backSpeedMax:           0.70,
        depthParallaxStrength:  0.50,  // multiplier — overall parallax intensity

        // ── image counts & layout ──────────────────────────────────────────
        backImagesPerCol:       3,     // cloned back images per back column
        maxImagesPerColMobile:  6,     // max front images per column on mobile
        frameCount:             1,     // images at the top of inner front columns to inset toward center

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
                backCols.forEach(function (col) {
                    for (var i = 0; i < C.backImagesPerCol; i++) {
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
                frontMinW = C.mobileFrontWidthMinPx;
                frontMaxW = C.mobileFrontWidthMaxPx;
                backMinW  = C.mobileBackWidthMinPx;
                backMaxW  = C.mobileBackWidthMaxPx;
            } else {
                frontMinW = Math.round((C.frontWidthMinVw / 100) * vpW);
                frontMaxW = Math.round((C.frontWidthMaxVw / 100) * vpW);
                backMinW  = Math.round((C.backWidthMinVw  / 100) * vpW);
                backMaxW  = Math.round((C.backWidthMaxVw  / 100) * vpW);
            }

            // ── position each column's images ──────────────────────────────

            function positionColumn(colDef, images, minW, maxW, isBack) {
                var count = images.length;
                if (count === 0) return;

                var edgeTop    = fullSectionHeight * C.edgePadding;
                var usable     = fullSectionHeight * (1 - 2 * C.edgePadding);
                var spacing    = usable / Math.max(1, count);
                var staggerPx  = (colDef.stagger || 0) * spacing;
                var jitterAmt  = spacing * C.verticalJitter;
                var frameInset = colDef.frameInset || 0;
                var frameN     = frameInset ? C.frameCount : 0;

                images.forEach(function (img, i) {
                    var baseTop = edgeTop + spacing * (i + 0.5) + staggerPx;
                    var jitter  = (Math.random() - 0.5) * 2 * jitterAmt;
                    var imgW    = Math.round(randRange(minW, maxW));
                    var imgH    = imgW * (5 / 4);
                    var top     = Math.max(0, Math.min(fullSectionHeight - imgH, baseTop + jitter));

                    var speed = isBack
                        ? randRange(C.backSpeedMin, C.backSpeedMax)
                        : randRange(C.frontSpeedMin, C.frontSpeedMax);

                    if (isBack) {
                        var midDepth = (vpH + fullSectionHeight) * 0.5;
                        top -= midDepth * (1 - speed) * C.depthParallaxStrength;
                        top = Math.max(0, Math.min(fullSectionHeight - imgH, top));
                    }

                    var xJitter = (Math.random() - 0.5) * 2 * C.horizontalJitterPct;
                    var insetX  = (frameN > 0 && i < frameN)
                        ? frameInset : 0;

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
            var sectionTop = section.getBoundingClientRect().top;
            var depth      = Math.max(0, vpRect.height - sectionTop);

            allElements.forEach(function (img) {
                var speed      = parseFloat(img.dataset.speedFactor || '1');
                var parallaxY  = depth * (1 - speed) * C.depthParallaxStrength;
                var naturalTop = parseFloat(img.dataset.naturalTop || '0');
                var imgH       = img.offsetHeight || 0;
                var minP       = -naturalTop;
                var maxP       = state.fullHeight - naturalTop - imgH;
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
