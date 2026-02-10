/**
 * GRADIENT ENGINE – Dual Channel Control
 * * NEW VARIABLES:
 * - heightDensity/Speed: Controls the physical waves.
 * - colorDensity/Speed: Controls the liquid gradient flow.
 */
class GradientEngine {
    constructor(canvasId, config) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        this.config = Object.assign({
            type: 'plane',       
            colors: ['#47ff54', '#f1ffe8', '#f0fd7c'], // Green -> White -> Yellow
            
            // --- CHANNEL 1: HEIGHT (The Waves) ---
            heightDensity: 1.8,   // How many waves? (Higher = more ripples)
            heightStrength: 3.0,  // How tall are they?
            heightSpeed: 0.2,     // How fast do waves move?
            
            // --- CHANNEL 2: COLOR (The Liquid) ---
            colorDensity: 0.4,    // How large are the color patches? (Lower = bigger blobs)
            colorSpeed: 0.1,      // How fast do colors morph?
            
            // Geometry
            planeSize: [20, 20], 
            segments: 128,       
            
            // Positioning
            positionY: -2.1,     
            rotationZ: 225 * (Math.PI / 180),
            
            // Camera
            cameraPosition: { x: 0, y: 0.5, z: 2.4 }, 
            cameraRotation: { x: -0.4, y: 0, z: 0 },   
            fov: 45,
            
            updateMode: 'observer',
            contentSelector: '#scroll-content',
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
            varying float vDistort;     // Height Noise
            varying float vColorNoise;  // Color Noise
            
            uniform float uTime;
            
            // Channel 1: Height
            uniform float uHeightDensity;
            uniform float uHeightStrength;
            uniform float uHeightSpeed;
            
            // Channel 2: Color
            uniform float uColorDensity;
            uniform float uColorSpeed;

            // --- SIMPLEX NOISE ALGORITHM ---
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

                // 1. CALCULATE HEIGHT NOISE
                // Uses heightSpeed and heightDensity
                float tHeight = uTime * uHeightSpeed;
                vec3 heightPos = vec3(position.x * uHeightDensity, position.y * uHeightDensity, tHeight);
                float heightNoise = snoise(heightPos);
                
                // 2. CALCULATE COLOR NOISE
                // Uses colorSpeed and colorDensity (independent from height!)
                float tColor = uTime * uColorSpeed;
                vec3 colorPos = vec3((position.x + 10.0) * uColorDensity, (position.y + 10.0) * uColorDensity, tColor);
                float colorNoise = snoise(colorPos);
                
                // 3. DISPLACEMENT
                // Only the Height Noise moves the vertices
                float distortion = heightNoise * uHeightStrength;
                vec3 newPos = position + (normal * distortion);
                
                // Pass values to Fragment Shader
                vDistort = heightNoise; 
                vColorNoise = colorNoise; 
                
                gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
            }
        `;
    }

    buildFragmentShader() {
        return `
            varying vec2 vUv;
            varying float vDistort;     // Height Map (-1 to 1)
            varying float vColorNoise;  // Color Map (-1 to 1)
            
            uniform vec3 uColor1;
            uniform vec3 uColor2;
            uniform vec3 uColor3;

            void main() {
                // Map noises to 0-1
                float height = (vDistort * 0.5) + 0.5;
                float colorMix = (vColorNoise * 0.5) + 0.5;

                // 1. BASE COLOR LAYER
                // Driven by 'colorDensity' and 'colorSpeed'
                // This creates the liquid blobs flowing on the surface
                vec3 baseColor = mix(uColor1, uColor2, colorMix);

                // 2. HIGHLIGHT LAYER
                // Driven by 'heightDensity' and 'heightSpeed'
                // This ensures the tips of the waves always get Color 3
                float highlight = smoothstep(0.6, 1.0, height);
                
                vec3 finalColor = mix(baseColor, uColor3, highlight);

                gl_FragColor = vec4(finalColor, 1.0);
            }
        `;
    }

    init() {
        const cfg = this.config;

        this.currentColors = cfg.colors.map(c => new THREE.Color(this.resolveColor(c)));
        this.targetColors = cfg.colors.map(c => new THREE.Color(this.resolveColor(c)));

        this.scene = new THREE.Scene();

        const { width, height } = this.getDimensions();
        this.camera = new THREE.PerspectiveCamera(cfg.fov, width / height, 0.1, 100);
        this.camera.position.set(cfg.cameraPosition.x, cfg.cameraPosition.y, cfg.cameraPosition.z);
        this.camera.rotation.set(cfg.cameraRotation.x, cfg.cameraRotation.y, cfg.cameraRotation.z);

        this.uniforms = {
            uTime: { value: 0 },
            
            // Height Channel
            uHeightDensity: { value: cfg.heightDensity },
            uHeightStrength: { value: cfg.heightStrength },
            uHeightSpeed: { value: cfg.heightSpeed },
            
            // Color Channel
            uColorDensity: { value: cfg.colorDensity },
            uColorSpeed: { value: cfg.colorSpeed },
            
            uColor1: { value: this.currentColors[0] },
            uColor2: { value: this.currentColors[1] },
            uColor3: { value: this.currentColors[2] }
        };

        const material = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: this.buildVertexShader(),
            fragmentShader: this.buildFragmentShader(),
            side: THREE.DoubleSide
        });

        const geometry = new THREE.PlaneGeometry(cfg.planeSize[0], cfg.planeSize[1], cfg.segments, cfg.segments);
        this.mesh = new THREE.Mesh(geometry, material);

        this.mesh.rotation.x = -Math.PI / 2;
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
        
        if (cfg.updateMode === 'observer') this.setupObserver();

        this.animate();
    }

    setupObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((m) => {
                if (m.type === 'attributes' && m.attributeName === 'class') {
                    const el = m.target;
                    if (el.classList.contains('is-active') && el.hasAttribute('data-colors')) {
                        this.updateColors(el.getAttribute('data-colors'));
                    }
                }
            });
        });
        document.querySelectorAll('section[data-colors]').forEach(s => observer.observe(s, { attributes: true }));
        const active = document.querySelector('section.is-active[data-colors]');
        if (active) this.updateColors(active.getAttribute('data-colors'));
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
        this.uniforms.uColor1.value.lerp(this.targetColors[0], 0.05);
        this.uniforms.uColor2.value.lerp(this.targetColors[1], 0.05);
        this.uniforms.uColor3.value.lerp(this.targetColors[2], 0.05);
        this.renderer.render(this.scene, this.camera);
    }
}

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    new GradientEngine('gradient-canvas', {
        colors: ['#47ff54', '#f1ffe8', '#f0fd7c'], 
        
        // --- CHANNEL 1: WAVES ---
        heightDensity: 0.2,   // High = lots of small ripples
        heightStrength: 1,  // High = tall spikes
        heightSpeed: 0.1,     // Speed of the ripples
        
        // --- CHANNEL 2: LIQUID FLOW ---
        colorDensity: 0.3,    // Low = big, broad patches of color
        colorSpeed: 0.1,      // Slow = lazy morphing color
        
        positionY: -2.1,
        rotationZ: 225 * (Math.PI / 180),
        
        cameraPosition: { x: 0, y: 0.0, z: 2.4 }, 
        cameraRotation: { x: -1, y: 0, z: 0 },
        
        planeSize: [20, 20],
        segments: 128
    });
});