/**
 * GRADIENT ENGINE – Blob Sphere (Stabilized)
 * Corrected for Three.js coordinate systems and precision.
 */
class GradientEngine {
    constructor(canvasId, config) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        this.config = Object.assign({
            colors: ['#ff7a33', '#33a0ff', '#ffc53d'],
            speed: 0.2,
            uNoiseDensity: 1.2,
            uNoiseStrength: 0.3,
            uAmplitude: 1.0,
            colorFalloff: 1.0,
            // color3Start/End: where color3 blends in (0–1); lower start = more area with color3
            color3Start: 0.35,
            color3End: 1.0,
            // color3Amount: boost color3 visibility (>1 = more of third color)
            color3Amount: 1.0,
            // noiseBandScale: [x, y, z] – anisotropic noise; lower x,z = horizontal bands (lateral waves)
            noiseBandScale: [0.3, 1.0, 0.3],
            sphereRadius: 2.5,
            sphereSegments: 128,
            cameraZ: 8,
            updateMode: 'observer',
            contentSelector: '#scroll-content',
            parallax: false,
            gradientHeightRatio: 1 / 3,
            parallaxRotationX: Math.PI * 0.4,
            cameraLookAtY: 0.6,
        }, config);

        this.init();
    }

    getContentHeight() {
        const el = this.config.contentSelector ? document.querySelector(this.config.contentSelector) : null;
        return el ? el.offsetHeight : window.innerHeight;
    }

    resolveColor(colorStr) {
        if (!colorStr) return null;
        colorStr = String(colorStr).trim();
        if (colorStr.startsWith('var(')) {
            const varName = colorStr.slice(4, -1).trim();
            const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
            return val || null;
        }
        return colorStr;
    }

    buildVertexShader() {
        // NOTE: We do NOT add 'precision' here. Three.js adds it automatically.
        return `
            varying vec2 vUv;
            varying float vDistort;
            varying vec3 vNormal;

            uniform float uTime;
            uniform float uSpeed;
            uniform float uNoiseDensity;
            uniform float uNoiseStrength;
            uniform float uAmplitude;
            uniform vec3 uNoiseBandScale;

            // --- CANONICAL SIMPLEX NOISE (Ashima/Webgl-noise) ---
            vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
            vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

            float snoise(vec3 v) {
                const vec2 C = vec2(1.0/6.0, 1.0/3.0);
                const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

                vec3 i  = floor(v + dot(v, C.yyy) );
                vec3 x0 = v - i + dot(i, C.xxx) ;

                vec3 g = step(x0.yzx, x0.xyz);
                vec3 l = 1.0 - g;
                vec3 i1 = min( g.xyz, l.zxy );
                vec3 i2 = max( g.xyz, l.zxy );

                vec3 x1 = x0 - i1 + C.xxx;
                vec3 x2 = x0 - i2 + C.yyy;
                vec3 x3 = x0 - D.yyy;

                i = mod289(i);
                vec4 p = permute( permute( permute(
                            i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                        + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                        + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

                float n_ = 0.142857142857;
                vec3  ns = n_ * D.wyz - D.xzx;

                vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

                vec4 x_ = floor(j * ns.z);
                vec4 y_ = floor(j - 7.0 * x_ );

                vec4 x = x_ *ns.x + ns.yyyy;
                vec4 y = y_ *ns.x + ns.yyyy;
                vec4 h = 1.0 - abs(x) - abs(y);

                vec4 b0 = vec4( x.xy, y.xy );
                vec4 b1 = vec4( x.zw, y.zw );

                vec4 s0 = floor(b0)*2.0 + 1.0;
                vec4 s1 = floor(b1)*2.0 + 1.0;
                vec4 sh = -step(h, vec4(0.0));

                vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
                vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

                vec3 p0 = vec3(a0.xy,h.x);
                vec3 p1 = vec3(a0.zw,h.y);
                vec3 p2 = vec3(a1.xy,h.z);
                vec3 p3 = vec3(a1.zw,h.w);

                vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
                p0 *= norm.x;
                p1 *= norm.y;
                p2 *= norm.z;
                p3 *= norm.w;

                vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
                m = m * m;
                return 105.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
            }

            void main() {
                vUv = uv;
                vNormal = normal; // Pass normal to fragment for simple shading

                // 1. Noise Animation
                float t = uTime * uSpeed;
                
                // 2. Sample Noise (anisotropic: bandScale makes waves more band-like / lateral)
                // Lower X,Z scale = variation mainly in Y = horizontal bands (lateral waves)
                vec3 bandPos = position * uNoiseDensity * uNoiseBandScale;
                float noise = snoise(bandPos + t);
                
                // 3. Displacement
                // Move vertex along its normal
                float distortion = noise * uNoiseStrength * uAmplitude;
                vec3 newPos = position + (normal * distortion);
                
                vDistort = noise; // Pass raw noise (-1 to 1) to fragment
                
                gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
            }
        `;
    }

    buildFragmentShader() {
        return `
            varying vec2 vUv;
            varying float vDistort;
            varying vec3 vNormal;

            uniform vec3 uColor1;
            uniform vec3 uColor2;
            uniform vec3 uColor3;
            uniform float uColorFalloff;
            uniform float uColor3Start;
            uniform float uColor3End;
            uniform float uColor3Amount;

            void main() {
                // Remap distortion from [-1, 1] to [0, 1]
                float distort = (vDistort * 0.5) + 0.5;
                // Falloff: >1 = sharper bands (more raw color), <1 = softer blend (more mix)
                float t = pow(distort, uColorFalloff);

                // 1. Base Gradient (Color 1 -> Color 2)
                vec3 color = mix(uColor1, uColor2, t);

                // 2. Highlights (Color 3) – start/end control where it appears, amount boosts visibility
                float highlight = smoothstep(uColor3Start, uColor3End, t) * uColor3Amount;
                color = mix(color, uColor3, min(1.0, highlight));
                
                // 3. Optional: Subtle Fresnel/Shadow for 3D feel
                // Makes the blob look less flat
                // float fresnel = dot(vNormal, vec3(0.0, 0.0, 1.0));
                // color *= (0.8 + 0.2 * fresnel);

                gl_FragColor = vec4(color, 1.0);
            }
        `;
    }

    init() {
        const cfg = this.config;

        this.currentColors = [
            new THREE.Color(cfg.colors[0] || '#ff7a33'),
            new THREE.Color(cfg.colors[1] || '#33a0ff'),
            new THREE.Color(cfg.colors[2] || '#ffc53d')
        ];
        this.targetColors = [
            new THREE.Color(cfg.colors[0] || '#ff7a33'),
            new THREE.Color(cfg.colors[1] || '#33a0ff'),
            new THREE.Color(cfg.colors[2] || '#ffc53d')
        ];

        // 1. Scene Setup
        this.scene = new THREE.Scene();

        // 2. Camera
        const { width, height } = this.getDimensions();
        this.camera = new THREE.PerspectiveCamera(cfg.fov || 45, width / height, 0.1, 100);
        this.camera.position.z = cfg.cameraZ;
        this.camera.lookAt(0, cfg.cameraLookAtY ?? 0.6, 0);

        // 3. Uniforms
        this.uniforms = {
            uTime: { value: 0 },
            uSpeed: { value: cfg.speed },
            uNoiseDensity: { value: cfg.uNoiseDensity },
            uNoiseStrength: { value: cfg.uNoiseStrength },
            uAmplitude: { value: cfg.uAmplitude },
            uNoiseBandScale: { value: new THREE.Vector3(
                cfg.noiseBandScale?.[0] ?? 0.3,
                cfg.noiseBandScale?.[1] ?? 1.0,
                cfg.noiseBandScale?.[2] ?? 0.3
            ) },
            uColorFalloff: { value: cfg.colorFalloff ?? 1.0 },
            uColor3Start: { value: cfg.color3Start ?? 0.35 },
            uColor3End: { value: cfg.color3End ?? 1.0 },
            uColor3Amount: { value: cfg.color3Amount ?? 1.0 },
            uColor1: { value: this.currentColors[0].clone() },
            uColor2: { value: this.currentColors[1].clone() },
            uColor3: { value: this.currentColors[2].clone() }
        };

        // 4. Geometry & Material
        const material = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: this.buildVertexShader(),
            fragmentShader: this.buildFragmentShader(),
            side: THREE.DoubleSide // Helps if we accidentally clip inside
        });

        const segments = Math.max(cfg.sphereSegments || 128, 64);
        const geometry = new THREE.SphereGeometry(cfg.sphereRadius, segments, segments);
        this.mesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.mesh);

        // 5. Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas, 
            alpha: true, // Allow CSS background to show through
            antialias: true 
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // 6. Events
        this.clock = new THREE.Clock();
        window.addEventListener('resize', () => this.onResize());

        if (cfg.parallax) {
            const onScroll = (e) => {
                const scrollY = (e && e.detail && e.detail.scroll != null)
                    ? e.detail.scroll
                    : (window.lenis && window.lenis.scroll != null)
                        ? window.lenis.scroll
                        : (window.pageYOffset || document.documentElement.scrollTop);
                const ch = this.getContentHeight();
                const vh = window.innerHeight;
                const maxScroll = Math.max(0, ch - vh);
                if (maxScroll <= 0) return;
                const t = Math.min(1, scrollY / maxScroll);
                this.mesh.rotation.x = -t * (cfg.parallaxRotationX ?? Math.PI * 0.4);
            };
            window.addEventListener('lenis-scroll', onScroll);
            onScroll();
        }

        if (cfg.updateMode === 'observer') {
            this.setupMutationObserver();
        }

        this.animate();
    }

    setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((m) => {
                if (m.type === 'attributes' && m.attributeName === 'class') {
                    const el = m.target;
                    if (el.classList.contains('is-active') && el.hasAttribute('data-colors')) {
                        this.updateColorsFromElement(el);
                    }
                }
            });
        });
        const sections = document.querySelectorAll('section[data-colors]');
        sections.forEach((s) => observer.observe(s, { attributes: true }));
        const active = document.querySelector('section.is-active[data-colors]');
        if (active) this.updateColorsFromElement(active);
    }

    updateColorsFromElement(el) {
        const raw = el.getAttribute('data-colors');
        if (!raw) return;
        const list = raw.split(',').map((s) => this.resolveColor(s)).filter(Boolean);
        if (list.length === 0) return;
        this.targetColors[0].set(list[0]);
        this.targetColors[1].set(list[1] ?? list[0]);
        this.targetColors[2].set(list[2] ?? list[0]);
    }

    getDimensions() {
        // Safe fallback if parent has no size yet
        const w = window.innerWidth;
        const h = window.innerHeight;
        return { width: w, height: h };
    }

    onResize() {
        const { width, height } = this.getDimensions();
        this.renderer.setSize(width, height);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        this.uniforms.uTime.value = this.clock.getElapsedTime();
        this.uniforms.uColor1.value.lerp(this.targetColors[0], 0.05);
        this.uniforms.uColor2.value.lerp(this.targetColors[1], 0.05);
        this.uniforms.uColor3.value.lerp(this.targetColors[2], 0.05);

        if (!this.config.parallax) {
            this.mesh.rotation.y += this.config.rotateSpeedY ?? 0.002;
        }

        this.renderer.render(this.scene, this.camera);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new GradientEngine('gradient-canvas', {
        isFullScreen: true,
        updateMode: 'observer',
        parallax: true,
        contentSelector: '#scroll-content',
        // speed: animation speed of the noise (higher = faster morphing)
        speed: 0.03,
        // colors: [color1, color2, color3] – valleys, mid, peaks (overridden by section data-colors when observer is on)
        colors: ['#ff7a33', '#33a0ff', '#ffc53d'],
        // uNoiseDensity: scale of noise input (higher = finer, more ripples; lower = broader blobs)
        uNoiseDensity: 1.5,
        // uNoiseStrength: how much the noise displaces vertices (higher = more bumpy; lower = smoother sphere)
        uNoiseStrength: 0.5,
        // uAmplitude: overall displacement scale (higher = bigger bumps; lower = subtler)
        uAmplitude: 0.5,
        // colorFalloff: >1 = sharper bands (more raw color), <1 = softer blend (more mix), 1 = linear
        colorFalloff: 3,
        // color3Start: where color3 starts (0–1); lower = more area with third color (e.g. 0.2)
        color3Start: 0.25,
        // color3End: where color3 is full (0–1); default 1.0
        color3End: 1,
        // color3Amount: boost third color (>1 = more visible, e.g. 1.2–1.5)
        color3Amount: 1,
        // noiseBandScale: [x, y, z] – lateral bands (low x,z, high y); (1,1,1) = round bumps
        noiseBandScale: [0.4, 1.0, 0.7],
        // sphereRadius: size of the sphere in world units (higher = bigger on screen)
        sphereRadius: 3,
        // sphereSegments: resolution of the mesh (higher = smoother; lower = more angular, faster)
        sphereSegments: 512,
        // cameraZ: camera distance from center (higher = smaller/further; lower = larger/closer) – close, looking at top
        cameraZ: 3.6,
        // cameraLookAtY: camera looks at this Y (positive = tilted up toward top of sphere)
        cameraLookAtY: 1.6,
        // fov: vertical field of view in degrees (higher = wider view; lower = more zoomed)
        fov: 45,
        // parallax: when true, sphere rotation.x (pitch) is driven by scroll (reversed: down scroll = tilt up)
        parallax: true,
        // parallaxRotationX: total X rotation in radians over full scroll (up/down tilt to match page scroll)
        parallaxRotationX: Math.PI * 0.1,
        // rotateSpeedY: per-frame Y rotation when parallax is off (Z rotation removed so bands stay lateral)
        rotateSpeedY: 0.002,
        rotateSpeedZ: 0.001
    });

    new GradientEngine('footer-canvas', {
        isFullScreen: false,
        updateMode: 'none',
        speed: 0.2,
        colors: ['#32CD32', '#f0f4f0', '#FABA2F'],
        uNoiseDensity: 1.2,
        uNoiseStrength: 0.4,
        uAmplitude: 1.0,
        sphereRadius: 2.5,
        sphereSegments: 128,
        cameraZ: 6,
        fov: 45,
        rotateSpeedY: 0.002,
        rotateSpeedZ: 0.001
        // (same options as above: speed, colors, uNoiseDensity, uNoiseStrength, uAmplitude, sphereRadius, sphereSegments, cameraZ, fov, rotateSpeedY)
    });
});
