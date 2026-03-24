/* gradient engine – three.js sphere with dual noise channels */

class GradientEngine {
    constructor(canvasId, config) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        this.config = Object.assign({
            type: 'sphere',
            colors: ['#47ff54', '#f1ffe8', '#f0fd7c'],

            // channel 1: height (blob shape)
            heightDensity: 1.5,
            heightStrength: 0.8,
            heightSpeed: 0.2,

            // channel 2: color (liquid surface)
            colorDensity: 0.6,
            colorSpeed: 0.1,
            colorGradientFalloff: 1.0,  // 1 = linear, >1 = sharper bands, <1 = softer
            colorGradientBalance: 0.5,  // 0 = more color1, 1 = more color2, 0.5 = even

            // edge-bias: 0 = full gradient everywhere; >0 = center fades to uColor1
            // sections opt in via data-edge="0.8" on the <section> element
            edgeStrength: 0.0,
            edgePower: 3.0,   // >1 keeps center clean, pushes colors toward the rim
            edgeNoise: 0.25,  // how much the height noise warps the edge boundary

            // rotation per pixel of scroll
            scrollRotationSpeed: { x: 0, y: 0, z: 0 },

            sphereRadius: 2.0,
            segments: 128,
            positionY: 0,
            rotationZ: 0,

            cameraPosition: { x: 0, y: 0, z: 6.0 },
            cameraRotation: { x: 0, y: 0, z: 0 },
            fov: 45,

            updateMode: 'observer',
            contentSelector: '#scroll-content',
            useSectionObserver: true,  // false = use container data-colors, true = follow active section
        }, config);

        this.init();
    }

    resolveColor(colorStr) {
        if (!colorStr) return null;
        if (colorStr.startsWith('#')) return colorStr;
        if (colorStr.startsWith('var(')) {
            const varName = colorStr.slice(4, -1).trim();
            return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
        }
        return colorStr;
    }

    buildVertexShader() {
        return `
            varying vec2 vUv;
            varying float vDistort;
            varying float vColorNoise;
            varying vec3 vNormal;
            varying vec4 vClipPos;

            uniform float uTime;
            uniform float uHeightDensity;
            uniform float uHeightStrength;
            uniform float uHeightSpeed;
            uniform float uColorDensity;
            uniform float uColorSpeed;

            // simplex noise
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
                p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
                vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
                m = m * m;
                return 105.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
            }

            void main() {
                vUv = uv;
                vNormal = normal;

                // small offset avoids sampling on lattice boundaries (prevents center stutter)
                vec3 eps = vec3(0.001, 0.002, 0.003);

                // height noise – time with different phases so there's no single drift direction
                float t = uTime * uHeightSpeed;
                vec3 heightTimeOff = vec3(sin(t), cos(t * 0.83), sin(t * 1.17)) * 0.5;
                vec3 heightPos = position * uHeightDensity + heightTimeOff + eps;
                float heightNoise = snoise(heightPos);

                // color noise – different phases so color and height don't move in lockstep
                float tc = uTime * uColorSpeed;
                vec3 colorTimeOff = vec3(cos(tc * 1.1), sin(tc * 0.91), cos(tc * 1.23)) * 0.5;
                vec3 colorPos = (position + 10.0) * uColorDensity + colorTimeOff + eps;
                float colorNoise = snoise(colorPos);

                // displace vertex outward along its normal
                float distortion = heightNoise * uHeightStrength;
                vec3 newPos = position + (normal * distortion);

                vDistort = heightNoise;
                vColorNoise = colorNoise;

                vClipPos = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
                gl_Position = vClipPos;
            }
        `;
    }

    buildFragmentShader() {
        return `
            varying vec2 vUv;
            varying float vDistort;
            varying float vColorNoise;
            varying vec3 vNormal;
            varying vec4 vClipPos;

            uniform vec3 uColor1;
            uniform vec3 uColor2;
            uniform vec3 uColor3;
            uniform float uColorGradientFalloff;
            uniform float uColorGradientBalance;

            // uEdgeStrength = 0: original behavior (full gradient everywhere)
            // uEdgeStrength > 0: center fades to uColor1, all colors concentrate at perimeter
            uniform float uEdgeStrength;
            uniform float uEdgePower;  // controls how tight the falloff is toward the edge
            uniform float uEdgeNoise;  // how much vDistort warps the edge boundary (0 = perfect circle)

            void main() {
                float height = (vDistort * 0.5) + 0.5;
                float colorMix = (vColorNoise * 0.5) + 0.5;
                colorMix = pow(colorMix, uColorGradientFalloff);
                // remap so 0.5 noise = balance point (0 = color1 dominant, 1 = color2, 0.5 = even)
                float b = uColorGradientBalance;
                if (colorMix < 0.5)
                    colorMix = b * 2.0 * colorMix;
                else
                    colorMix = b + (1.0 - b) * 2.0 * (colorMix - 0.5);

                vec3 baseColor = mix(uColor1, uColor2, colorMix);
                float highlight = smoothstep(0.6, 1.0, height);
                vec3 fullColor = mix(baseColor, uColor3, highlight);

                // screen-edge vignette: warp the NDC distance with height noise so the
                // boundary undulates with the gradient instead of sitting as a clean circle
                vec2 ndc = vClipPos.xy / vClipPos.w;
                float warpedDist = clamp(length(ndc) + vDistort * uEdgeNoise, 0.0, 2.0);
                float screenEdge = clamp(pow(warpedDist, uEdgePower), 0.0, 1.0);
                float colorMask = mix(1.0, screenEdge, uEdgeStrength);

                gl_FragColor = vec4(mix(uColor1, fullColor, colorMask), 1.0);
            }
        `;
    }

    init() {
        const cfg = this.config;

        this.currentColors = cfg.colors.map(c => new THREE.Color(this.resolveColor(c)));
        this.targetColors = cfg.colors.map(c => new THREE.Color(this.resolveColor(c)));
        this.targetEdgeStrength = cfg.edgeStrength;

        this.scene = new THREE.Scene();

        const { width, height } = this.getDimensions();
        this.camera = new THREE.PerspectiveCamera(cfg.fov, width / height, 0.1, 100);
        this.camera.position.set(cfg.cameraPosition.x, cfg.cameraPosition.y, cfg.cameraPosition.z);
        this.camera.rotation.set(cfg.cameraRotation.x, cfg.cameraRotation.y, cfg.cameraRotation.z);

        this.uniforms = {
            uTime: { value: 0 },
            uHeightDensity: { value: cfg.heightDensity },
            uHeightStrength: { value: cfg.heightStrength },
            uHeightSpeed: { value: cfg.heightSpeed },
            uColorDensity: { value: cfg.colorDensity },
            uColorSpeed: { value: cfg.colorSpeed },
            uColorGradientFalloff: { value: cfg.colorGradientFalloff },
            uColorGradientBalance: { value: cfg.colorGradientBalance },
            uColor1: { value: this.currentColors[0] },
            uColor2: { value: this.currentColors[1] },
            uColor3: { value: this.currentColors[2] },
            uEdgeStrength: { value: cfg.edgeStrength },
            uEdgePower:    { value: cfg.edgePower },
            uEdgeNoise:    { value: cfg.edgeNoise }
        };

        const material = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: this.buildVertexShader(),
            fragmentShader: this.buildFragmentShader(),
            side: THREE.DoubleSide
        });

        const geometry = new THREE.SphereGeometry(cfg.sphereRadius, cfg.segments, cfg.segments);
        this.mesh = new THREE.Mesh(geometry, material);

        if (cfg.rotationZ) this.mesh.rotation.z = cfg.rotationZ;
        if (cfg.positionY) this.mesh.position.y = cfg.positionY;

        this.scene.add(this.mesh);

        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas, 
            alpha: true, 
            antialias: true 
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        this.clock = new THREE.Clock();
        window.addEventListener('resize', () => this.onResize());

        if (cfg.useSectionObserver && cfg.updateMode === 'observer') this.setupObserver();
        else if (this.canvas.parentElement && this.canvas.parentElement.hasAttribute('data-colors')) {
            this.updateColors(this.canvas.parentElement.getAttribute('data-colors'));
        }

        this.animate();
    }

    setupObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((m) => {
                if (m.type === 'attributes' && m.attributeName === 'class') {
                    const el = m.target;
                    if (el.classList.contains('is-active')) {
                        if (el.hasAttribute('data-colors')) this.updateColors(el.getAttribute('data-colors'));
                        if (el.hasAttribute('data-edge'))  this.updateEdge(parseFloat(el.getAttribute('data-edge')));
                    }
                }
            });
        });
        document.querySelectorAll('section[data-colors]').forEach(s => observer.observe(s, { attributes: true }));
        const active = document.querySelector('section.is-active[data-colors]');
        if (active) {
            this.updateColors(active.getAttribute('data-colors'));
            if (active.hasAttribute('data-edge')) this.updateEdge(parseFloat(active.getAttribute('data-edge')));
        }
    }

    updateEdge(strength, power) {
        if (!isNaN(strength)) this.targetEdgeStrength = strength;
        if (power !== undefined && !isNaN(power)) this.uniforms.uEdgePower.value = power;
    }

    updateColors(colorString) {
        if (!colorString) return;
        const cols = colorString.split(',').map(s => s.trim());
        if (cols.length >= 1) this.targetColors[0].set(this.resolveColor(cols[0]));
        if (cols.length >= 2) this.targetColors[1].set(this.resolveColor(cols[1]));
        if (cols.length >= 3) this.targetColors[2].set(this.resolveColor(cols[2]));
    }

    getDimensions() {
        return { width: window.innerWidth, height: window.innerHeight };
    }

    getScrollPosition() {
        // lenis drives scroll via transform, so use its value when available
        if (typeof window !== 'undefined' && window.lenis != null && typeof window.lenis.scroll === 'number') {
            return window.lenis.scroll;
        }
        const el = this.config.contentSelector ? document.querySelector(this.config.contentSelector) : null;
        if (el) return el.scrollTop;
        return typeof window !== 'undefined' ? (window.scrollY ?? document.documentElement.scrollTop) : 0;
    }

    onResize() {
        const { width, height } = this.getDimensions();
        this.renderer.setSize(width, height);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const delta = this.clock.getDelta();
        this.uniforms.uTime.value += delta;

        const scrollPos = this.getScrollPosition();
        const sr = this.config.scrollRotationSpeed;
        this.mesh.rotation.x = scrollPos * sr.x;
        this.mesh.rotation.y = scrollPos * sr.y;
        this.mesh.rotation.z = scrollPos * sr.z;

        this.uniforms.uColor1.value.lerp(this.targetColors[0], 0.15);
        this.uniforms.uColor2.value.lerp(this.targetColors[1], 0.15);
        this.uniforms.uColor3.value.lerp(this.targetColors[2], 0.15);
        this.uniforms.uEdgeStrength.value += (this.targetEdgeStrength - this.uniforms.uEdgeStrength.value) * 0.15;
        this.renderer.render(this.scene, this.camera);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const pageSection = document.querySelector('section[data-colors]');
    const pageSectionColors = pageSection
        ? pageSection.getAttribute('data-colors').split(',').map(s => s.trim())
        : ['#47ff54', '#f1ffe8', '#f0fd7c'];

    new GradientEngine('gradient-canvas', {
        colors: pageSectionColors,
        useSectionObserver: !!document.querySelector('#scroll-viewport'),

        heightDensity: 0.9,
        heightStrength: 0.14,
        heightSpeed: 0.2,

        colorDensity: 1.2,
        colorSpeed: 0.2,
        colorGradientFalloff: 1.4,
        colorGradientBalance: 0.7,

        scrollRotationSpeed: { x: -0.00015, y: 0.0, z: 0.0 },

        sphereRadius: 2.0,
        positionY: 0,

        cameraPosition: { x: 0, y: 0, z: 2.6 },
        cameraRotation: { x: 0, y: 0, z: 0 },

        segments: 512
    });

    new GradientEngine('footer-canvas', {
        colors: ['#32CD32', '#f0f4f0', '#FABA2F'],

        heightDensity: 0.9,
        heightStrength: 0.14,
        heightSpeed: 0.2,

        colorDensity: 1.2,
        colorSpeed: 0.2,
        colorGradientFalloff: 1.4,
        colorGradientBalance: 0.7,

        scrollRotationSpeed: { x: 0.0, y: 0.0, z: 0.0 },

        sphereRadius: 2.0,
        positionY: 0,

        cameraPosition: { x: 0, y: 0, z: 2.6 },
        cameraRotation: { x: 0, y: 0, z: 0 },

        segments: 512,
        useSectionObserver: false  // uses #footer-gradient-container data-colors, not active section
    });
});
