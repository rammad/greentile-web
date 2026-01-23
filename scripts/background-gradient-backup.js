document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gradient-canvas');
    if (!canvas) return;

    // =========================================================================
    // --- 🎛️ CONFIGURATION ZONE ---
    // =========================================================================

    const CONFIG = {
        // 1. AMOUNT: Number of blobs.
        NUM_POINTS: 20, 

        // 2. DISTRIBUTION: Ratio of [Primary, Secondary, Accent] colors.
        // Example [6, 3, 1] = 60% Primary, 30% Secondary, 10% Accent.
        DISTRIBUTION: [6, 3, 1, 1],

        // 3. RADIUS: How "fat" the gradients are. 
        // Lower (0.3) = Small points. Higher (0.8) = Large soft areas.
        RADIUS: 0.6, 

        // 4. WHITE SPACE: Controls the background visibility.
        // 0.0 = Very dense, color fills screen.
        // 1.0 = Lots of white space, isolated blobs.
        WHITE_SPACE: 0.0, 

        // 5. INTERACTION HARDNESS: 
        // Controls the "Tension" line when blobs touch.
        // 0.0 = Pure fog (always soft).
        // 1.0 = Hard lines appear only when they touch.
        HARDNESS: 0.7, 

        // 6. SPEED: How fast they wander.
        SPEED: 0.1,

        // 7. COLORS: Your palette.
        COLORS: ["#1a3c1a", "#0e200e", "#32CD32"]
    };

    // =========================================================================
    // --- ⚙️ SYSTEM SETUP ---
    // =========================================================================

    const LERP_FACTOR = 0.05;
    let currentColors = [];
    let targetColors = [];

    // --- 1. CALCULATE ROLES ---
    // This distributes the colors based on your Ratio array.
    const pointRoles = generatePointRoles(CONFIG.NUM_POINTS, CONFIG.DISTRIBUTION);

    // --- 2. INITIALIZE COLORS ---
    for (let i = 0; i < CONFIG.NUM_POINTS; i++) {
        const roleIndex = pointRoles[i];
        const hex = CONFIG.COLORS[roleIndex] || CONFIG.COLORS[0];
        currentColors.push(new THREE.Color(hex));
        targetColors.push(new THREE.Color(hex));
    }

    // --- 3. HELPER: DENSITY CALCULATION ---
    // We map "White Space" (0-1) to a Density Threshold (0.5 - 4.0)
    // If White Space is 0.0, Threshold is 0.5 (Very easy to cover screen).
    // If White Space is 1.0, Threshold is 4.0 (Need lots of overlap to see color).
    const DENSITY_THRESHOLD = 0.5 + (CONFIG.WHITE_SPACE * 3.5);

    function resolveColor(colorStr) {
        if (!colorStr) return null;
        colorStr = colorStr.trim();
        if (colorStr.startsWith('var(')) {
            const varName = colorStr.substring(4, colorStr.length - 1);
            const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
            return val || null;
        }
        return colorStr;
    }

    let baseColorHex = resolveColor('var(--color-bg)');
    if (!baseColorHex || baseColorHex === '') baseColorHex = '#f0f0f0';
    const baseColor = new THREE.Color(baseColorHex);

    const scene = new THREE.Scene();
    scene.background = baseColor;

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const vertexShader = `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
        }
    `;

    // Generate uniforms
    let fragmentUniforms = `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec3 uBaseColor;
        uniform float uSpeed;
        uniform float uRadius;
        uniform float uHardness;
        uniform float uDensityThreshold; 
    `;
    
    // Create color uniforms for exact number of points
    for (let i = 0; i < CONFIG.NUM_POINTS; i++) {
        fragmentUniforms += `uniform vec3 uColor${i};\n`;
    }

    const fragmentShader = `
        ${fragmentUniforms}
        varying vec2 vUv;

        float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }

        vec2 getPointData(float id) {
            float x = fract(sin(id * 12.9898) * 43758.5453);
            float y = fract(cos(id * 78.233) * 12345.6789);
            return vec2(x, y);
        }

        vec2 getPos(int i, float t, float aspect) {
            float id = float(i);
            vec2 data1 = getPointData(id);
            vec2 data2 = getPointData(id + 100.0);
            
            // Organic, wandering movement (Original Logic)
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

            // DYNAMIC LOOP
            for (int i = 0; i < ${CONFIG.NUM_POINTS}; i++) {
                vec2 pos = getPos(i, t, aspect);
                float dist = distance(samplePos, pos);
                
                // --- ORIGINAL RADIAL FORMULA ---
                // Gaussian falloff
                float factor = 1.0 / (uRadius * uRadius);
                float weight = exp(-dist * dist * factor * 4.0);
                
                sumWeight += weight;
                if (weight > maxWeight) maxWeight = weight;
                
                // Color Lookup
                vec3 color;
                ${generateColorLookup(CONFIG.NUM_POINTS)}

                sumColor += color * weight;
            }

            // 1. Average Color
            vec3 avgColor = sumColor / sumWeight;

            // 2. DYNAMIC HARDNESS LOGIC (The logic you liked)
            float dominance = maxWeight / sumWeight;
            
            // If dominance is low (conflict), we want HIGH hardness.
            float tension = 1.0 - dominance;
            
            // Scale density using our new Configurable Threshold
            float density = smoothstep(0.0, uDensityThreshold, sumWeight);
            
            // Apply the sharpener based on Tension
            float sharpenFactor = 1.0 + (tension * uHardness * 10.0);
            float sharpDensity = pow(density, sharpenFactor);
            
            vec3 finalColor = mix(uBaseColor, avgColor, sharpDensity);
            
            float dither = (random(vUv * uTime) - 0.5) * 0.05;
            finalColor += dither;

            gl_FragColor = vec4(finalColor, 1.0);
        }
    `;

    // Initialize Uniforms
    const uniforms = {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uBaseColor: { value: baseColor },
        uSpeed: { value: CONFIG.SPEED },
        uRadius: { value: CONFIG.RADIUS },
        uHardness: { value: CONFIG.HARDNESS },
        uDensityThreshold: { value: DENSITY_THRESHOLD }
    };
    for (let i = 0; i < CONFIG.NUM_POINTS; i++) {
        uniforms[`uColor${i}`] = { value: currentColors[i] };
    }

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader });
    const plane = new THREE.Mesh(geometry, material);
    scene.add(plane);

    // --- SCROLL OBSERVER ---
    const sections = document.querySelectorAll('section[data-colors]');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const colorString = entry.target.getAttribute('data-colors');
                if (colorString) {
                    const rawList = colorString.split(',').map(s => resolveColor(s)).filter(c => c !== null);
                    if (rawList.length > 0) {
                        for (let i = 0; i < CONFIG.NUM_POINTS; i++) {
                            const role = pointRoles[i];
                            if (role < rawList.length) {
                                targetColors[i].set(rawList[role]);
                            } else {
                                targetColors[i].set(rawList[0]);
                            }
                        }
                    }
                }
            }
        });
    }, { threshold: 0.5 });
    sections.forEach(s => observer.observe(s));

    function animate(time) {
        requestAnimationFrame(animate);
        uniforms.uTime.value = time * 0.001;
        for (let i = 0; i < CONFIG.NUM_POINTS; i++) {
            uniforms[`uColor${i}`].value.lerp(targetColors[i], LERP_FACTOR);
        }
        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    });

    // --- HELPERS ---

    function generateColorLookup(num) {
        let code = '';
        for (let i = 0; i < num; i++) {
            if (i === 0) code += `if (i == 0) color = uColor0;`;
            else code += ` else if (i == ${i}) color = uColor${i};`;
        }
        return code;
    }

    function generatePointRoles(totalPoints, ratios) {
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
});