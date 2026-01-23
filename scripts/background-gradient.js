/**
 * GRADIENT ENGINE
 * - Supports "Full Screen" mode even inside small containers (creates a crop effect).
 * - Checks HTML data-colors for automatic palette overrides.
 */
class GradientEngine {
    constructor(canvasId, config) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.warn(`GradientEngine: Canvas with ID '${canvasId}' not found.`);
            return;
        }

        this.config = Object.assign({
            // 1. SIZING
            // true = Canvas is always Window Size (1920x1080 etc)
            // false = Canvas fits to parent div
            isFullScreen: true, 

            // 2. SYSTEM
            numPoints: 20,
            speed: 0.1,
            scrollInteraction: true,

            // 3. LOOK & FEEL
            distribution: [1, 1, 1], 
            radius: 0.6, 
            whiteSpace: 0.0, 
            hardness: 0.7, 
            
            // 4. PALETTE
            colors: ["#1a3c1a", "#0e200e", "#32CD32"], 
            baseColorVar: '--color-bg'
        }, config);

        this.init();
    }

    resolveColor(colorStr) {
        if (!colorStr) return null;
        colorStr = colorStr.trim();
        if (colorStr.startsWith('var(')) {
            const varName = colorStr.substring(4, colorStr.length - 1);
            const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
            return val || null;
        }
        return colorStr;
    }

    generateColorLookup(num) {
        let code = '';
        for (let i = 0; i < num; i++) {
            if (i === 0) code += `if (i == 0) color = uColor0;`;
            else code += ` else if (i == ${i}) color = uColor${i};`;
        }
        return code;
    }

    generatePointRoles(totalPoints, ratios) {
        const roles = [];
        const totalWeight = ratios.reduce((a, b) => a + b, 0);
        ratios.forEach((weight, roleIndex) => {
            const count = Math.round((weight / totalWeight) * totalPoints);
            for(let k=0; k < count; k++) roles.push(roleIndex);
        });
        while(roles.length < totalPoints) roles.push(0);
        while(roles.length > totalPoints) roles.pop();
        for (let i = roles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [roles[i], roles[j]] = [roles[j], roles[i]];
        }
        return roles;
    }

    getDimensions() {
        if (this.config.isFullScreen) {
            return { width: window.innerWidth, height: window.innerHeight };
        } else {
            const parent = this.canvas.parentElement;
            return { width: parent.offsetWidth, height: parent.offsetHeight };
        }
    }

    init() {
        const cfg = this.config;

        // 0. HTML OVERRIDE (Check for data-colors on footer/parent)
        const htmlPalette = this.canvas.closest('[data-colors]');
        if (htmlPalette) {
            const colorString = htmlPalette.getAttribute('data-colors');
            if (colorString) {
                const parsedColors = colorString.split(',').map(s => this.resolveColor(s)).filter(c => c !== null);
                if (parsedColors.length > 0) {
                    cfg.colors = parsedColors;
                }
            }
        }

        // 1. SETUP COLORS
        this.currentColors = [];
        this.targetColors = [];
        const pointRoles = this.generatePointRoles(cfg.numPoints, cfg.distribution);

        for (let i = 0; i < cfg.numPoints; i++) {
            const roleIndex = pointRoles[i];
            const hex = cfg.colors[roleIndex] || cfg.colors[0];
            this.currentColors.push(new THREE.Color(hex));
            this.targetColors.push(new THREE.Color(hex));
        }

        let baseColorHex = this.resolveColor(`var(${cfg.baseColorVar})`);
        if (!baseColorHex || baseColorHex === '') baseColorHex = '#f0f0f0';
        const baseColor = new THREE.Color(baseColorHex);

        // 2. SCENE
        this.scene = new THREE.Scene();
        this.scene.background = baseColor;
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        
        // 3. RENDERER
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: false, antialias: true });
        
        // Sizing logic
        const { width, height } = this.getDimensions();
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // 4. SHADER
        const vertexShader = `
            varying vec2 vUv;
            void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
        `;

        let fragmentUniforms = `
            uniform float uTime;
            uniform vec2 uResolution;
            uniform vec3 uBaseColor;
            uniform float uSpeed;
            uniform float uRadius;
            uniform float uHardness;
            uniform float uDensityThreshold; 
        `;
        
        for (let i = 0; i < cfg.numPoints; i++) {
            fragmentUniforms += `uniform vec3 uColor${i};\n`;
        }

        // --- SHADER WITH NOTES ADDED ---
        const fragmentShader = `
            ${fragmentUniforms}
            varying vec2 vUv;

            // basic noise generator
            float random(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
            }

            // gets a pseudo-random starting point for a blob id
            vec2 getPointData(float id) {
                float x = fract(sin(id * 12.9898) * 43758.5453);
                float y = fract(cos(id * 78.233) * 12345.6789);
                return vec2(x, y);
            }

            // calculates where the blob moves based on time
            vec2 getPos(int i, float t, float aspect) {
                float id = float(i);
                vec2 data1 = getPointData(id);
                vec2 data2 = getPointData(id + 100.0);
                
                // organic movement math (sine waves)
                vec2 pos = vec2(
                    data1.x + 0.35 * sin(t * (0.5 + data2.x * 0.5) + data1.y * 6.28),
                    data1.y + 0.35 * cos(t * (0.5 + data2.y * 0.5) + data2.x * 6.28)
                );
                pos.x *= aspect;
                return pos;
            }

            void main() {
                vec2 st = vUv;
                float aspect = uResolution.x / uResolution.y;
                vec2 samplePos = st;
                samplePos.x *= aspect;
                float t = uTime * uSpeed;

                float sumWeight = 0.0;
                float maxWeight = 0.0;
                vec3 sumColor = vec3(0.0);

                // loop through every single blob
                for (int i = 0; i < ${cfg.numPoints}; i++) {
                    vec2 pos = getPos(i, t, aspect);
                    float dist = distance(samplePos, pos);
                    
                    // gaussian math: makes the blob a soft blurry ball
                    float factor = 1.0 / (uRadius * uRadius);
                    float weight = exp(-dist * dist * factor * 4.0);
                    
                    sumWeight += weight;
                    
                    // track which blob is heaviest (for dominance logic later)
                    if (weight > maxWeight) maxWeight = weight;
                    
                    // get the specific color for this blob
                    vec3 color;
                    ${this.generateColorLookup(cfg.numPoints)}

                    // add this blob's color to the pile
                    sumColor += color * weight;
                }

                // mix all overlapping colors together
                vec3 avgColor = sumColor / sumWeight;

                // dominance: does one blob own this pixel?
                // tension: or are multiple blobs fighting? (this creates the hard lines)
                float dominance = maxWeight / sumWeight;
                float tension = 1.0 - dominance;
                
                // cut off the faint edges of the blur
                float density = smoothstep(0.0, uDensityThreshold, sumWeight);
                
                // sharpen the edges where tension is high
                float sharpenFactor = 1.0 + (tension * uHardness * 10.0);
                float sharpDensity = pow(density, sharpenFactor);
                
                // blend the blob color onto the background
                vec3 finalColor = mix(uBaseColor, avgColor, sharpDensity);
                
                // tiny bit of noise to fix ugly banding on screens
                float dither = (random(vUv * uTime) - 0.5) * 0.05;
                finalColor += dither;

                gl_FragColor = vec4(finalColor, 1.0);
            }
        `;

        const densityThreshold = 0.5 + (cfg.whiteSpace * 3.5);

        this.uniforms = {
            uTime: { value: 0 },
            uResolution: { value: new THREE.Vector2(width, height) },
            uBaseColor: { value: baseColor },
            uSpeed: { value: cfg.speed },
            uRadius: { value: cfg.radius },
            uHardness: { value: cfg.hardness },
            uDensityThreshold: { value: densityThreshold }
        };
        for (let i = 0; i < cfg.numPoints; i++) {
            this.uniforms[`uColor${i}`] = { value: this.currentColors[i] };
        }

        const geometry = new THREE.PlaneGeometry(2, 2);
        const material = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader, fragmentShader });
        const plane = new THREE.Mesh(geometry, material);
        this.scene.add(plane);

        // 5. OBSERVERS
        window.addEventListener('resize', () => this.onResize());
        
        if (cfg.scrollInteraction) {
            const sections = document.querySelectorAll('section[data-colors]');
            
            // trigger zone: ignore top/bottom 45%, only fire in the middle 10%
            // fixes huge sections (like about) not triggering
            const observerOptions = {
                root: null,
                rootMargin: '-45% 0px -45% 0px', 
                threshold: 0 
            };

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const colorString = entry.target.getAttribute('data-colors');
                        if (colorString) {
                            const rawList = colorString.split(',').map(s => this.resolveColor(s)).filter(c => c !== null);
                            if (rawList.length > 0) {
                                for (let i = 0; i < cfg.numPoints; i++) {
                                    const role = pointRoles[i];
                                    if (role < rawList.length) {
                                        this.targetColors[i].set(rawList[role]);
                                    } else {
                                        this.targetColors[i].set(rawList[0]);
                                    }
                                }
                            }
                        }
                    }
                });
            }, observerOptions);

            sections.forEach(s => observer.observe(s));
        }

        this.animate();
    }

    onResize() {
        if(!this.canvas) return;
        
        // Re-calculate based on mode
        const { width, height } = this.getDimensions();
        
        this.renderer.setSize(width, height);
        this.uniforms.uResolution.value.set(width, height);
    }

    animate(time) {
        requestAnimationFrame((t) => this.animate(t));
        this.uniforms.uTime.value = time ? time * 0.001 : 0;
        
        for (let i = 0; i < this.config.numPoints; i++) {
            this.uniforms[`uColor${i}`].value.lerp(this.targetColors[i], 0.05);
        }
        
        this.renderer.render(this.scene, this.camera);
    }
}

// =========================================================================
// --- 🚀 INSTANTIATION ---
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {

    // 1. MAIN BACKGROUND
    new GradientEngine('gradient-canvas', {
        isFullScreen: true,  
        numPoints: 20, 
        distribution: [6, 3, 1, 1], 
        radius: 0.6, 
        whiteSpace: 0.0, 
        hardness: 0.7, 
        speed: 0.1, 
        colors: ["f0f4f0", "#f0f4f0", "#f0f4f0", "#f0f4f0"],
        scrollInteraction: true
    });

    // 2. FOOTER (Cropped Fullscreen)
    new GradientEngine('footer-canvas', {
        isFullScreen: true,
        numPoints: 20,       
        distribution: [6, 3, 1, 1], 
        radius: 0.6,        
        whiteSpace: 0.0,   
        hardness: 0.7, 
        speed: 0.1, 
        colors: ["#f0f4f0", "#f0f4f0", "#f0f4f0", "#f0f4f0"], 
        scrollInteraction: false
    });

});