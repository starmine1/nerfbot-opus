/**
 * LENIA - Continuous Cellular Automaton
 * 
 * An artificial life simulation where complex, lifelike creatures
 * emerge from simple mathematical rules operating in continuous space.
 * 
 * The beauty of Lenia is that it bridges the gap between the discrete
 * world of traditional cellular automata (like Conway's Game of Life)
 * and the continuous world of reaction-diffusion systems.
 * 
 * @author Nerfbot
 * @license MIT
 */

// ============================================================================
// SPECIES DEFINITIONS
// ============================================================================
// Each species is defined by its kernel and growth function parameters.
// These were discovered through evolutionary search and manual exploration.

// Lenia species with tuned parameters for stability
// Reduced kernel radii for better performance while maintaining interesting behavior
const SPECIES = {
    orbium: {
        name: 'Orbium',
        color: [0.2, 0.6, 1.0],
        R: 10,        // Reduced kernel radius for performance
        T: 10,        // Time scale
        kernelParams: { beta: [1, 1, 1] },
        growthParams: {
            mu: 0.15,     // Growth center
            sigma: 0.017  // Slightly wider for stability
        }
    },
    
    geminium: {
        name: 'Geminium',
        color: [1.0, 0.4, 0.6],
        R: 8,
        T: 10,
        kernelParams: { beta: [1, 0.5, 0.5] },
        growthParams: {
            mu: 0.14,
            sigma: 0.016
        }
    },
    
    hydrogeminium: {
        name: 'Hydrogeminium',
        color: [0.4, 1.0, 0.6],
        R: 12,
        T: 10,
        kernelParams: { beta: [1, 1/3, 1] },
        growthParams: {
            mu: 0.12,
            sigma: 0.015
        }
    },
    
    scutium: {
        name: 'Scutium',
        color: [1.0, 0.8, 0.2],
        R: 10,
        T: 8,
        kernelParams: { beta: [0.5, 1, 1] },
        growthParams: {
            mu: 0.16,
            sigma: 0.018
        }
    },
    
    gliderium: {
        name: 'Gliderium',
        color: [0.8, 0.4, 1.0],
        R: 11,
        T: 12,
        kernelParams: { beta: [1, 0.8, 0.5] },
        growthParams: {
            mu: 0.135,
            sigma: 0.015
        }
    }
};

// ============================================================================
// WEBGL SHADER SOURCES
// ============================================================================

const VERTEX_SHADER = `
    attribute vec2 a_position;
    varying vec2 v_texCoord;
    
    void main() {
        v_texCoord = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
    }
`;

// Simulation shader - computes the Lenia update rule
const SIMULATION_SHADER = `
    precision highp float;
    
    uniform sampler2D u_state;
    uniform vec2 u_resolution;
    uniform float u_R;          // Kernel radius
    uniform float u_T;          // Time scale
    uniform float u_mu;         // Growth center
    uniform float u_sigma;      // Growth width
    uniform float u_dt;         // Time step
    uniform float u_trail;      // Trail/decay factor (0.0-1.0, where 1.0 = no trail)
    
    varying vec2 v_texCoord;
    
    // Kernel function: creates a smooth ring/annulus shape
    float kernel(float r) {
        // Smooth bump function for ring shape
        float kr = 4.0 * r * (1.0 - r);
        return kr * kr;
    }
    
    // Growth function: bell curve centered at mu
    float growth(float u) {
        float diff = (u - u_mu) / u_sigma;
        return 2.0 * exp(-diff * diff / 2.0) - 1.0;
    }
    
    void main() {
        vec2 texelSize = 1.0 / u_resolution;
        
        // Compute kernel convolution
        float total = 0.0;
        float kernelSum = 0.0;
        
        // Fixed loop bounds (WebGL 1.0 requirement)
        // Max kernel radius is 12, so we loop -12 to 12
        for (int dy = -12; dy <= 12; dy++) {
            for (int dx = -12; dx <= 12; dx++) {
                float fdx = float(dx);
                float fdy = float(dy);
                float dist = sqrt(fdx * fdx + fdy * fdy);
                
                // Skip if outside kernel radius
                if (dist > u_R) continue;
                
                float r = dist / u_R;
                float k = kernel(r);
                
                vec2 samplePos = v_texCoord + vec2(fdx, fdy) * texelSize;
                float state = texture2D(u_state, samplePos).r;
                
                total += state * k;
                kernelSum += k;
            }
        }
        
        // Normalize convolution
        float U = total / max(kernelSum, 0.001);
        
        // Apply growth function
        float G = growth(U);
        
        // Update state
        float currentState = texture2D(u_state, v_texCoord).r;
        float newState = clamp(currentState + G * u_dt / u_T, 0.0, 1.0);
        
        // Apply trail/decay effect
        newState *= u_trail;
        
        gl_FragColor = vec4(newState, newState, newState, 1.0);
    }
`;

// Render shader - visualizes the state with beautiful colors
const RENDER_SHADER = `
    precision highp float;
    
    uniform sampler2D u_state;
    uniform vec3 u_color;
    uniform float u_time;
    
    varying vec2 v_texCoord;
    
    // Beautiful color mapping
    vec3 palette(float t, vec3 baseColor) {
        vec3 a = vec3(0.02, 0.02, 0.05);
        vec3 b = baseColor;
        vec3 c = vec3(1.0, 1.0, 1.0);
        vec3 d = vec3(0.0, 0.1, 0.2);
        
        return a + b * cos(6.28318 * (c * t + d));
    }
    
    void main() {
        float state = texture2D(u_state, v_texCoord).r;
        
        // Non-linear mapping for more visual interest
        float v = pow(state, 0.8);
        
        // Sample neighbors for edge detection / glow
        vec2 texelSize = 1.0 / vec2(textureSize(u_state, 0));
        float dx = texture2D(u_state, v_texCoord + vec2(texelSize.x, 0.0)).r - 
                   texture2D(u_state, v_texCoord - vec2(texelSize.x, 0.0)).r;
        float dy = texture2D(u_state, v_texCoord + vec2(0.0, texelSize.y)).r - 
                   texture2D(u_state, v_texCoord - vec2(0.0, texelSize.y)).r;
        float edge = length(vec2(dx, dy)) * 5.0;
        
        // Beautiful color scheme
        vec3 color = palette(v, u_color);
        
        // Add edge glow
        color += vec3(1.0) * edge * 0.5;
        
        // Subtle background gradient
        vec2 center = v_texCoord - 0.5;
        float vignette = 1.0 - length(center) * 0.5;
        
        gl_FragColor = vec4(color * vignette, 1.0);
    }
`;

// Enhanced render shader with palette support
const RENDER_SHADER_WEBGL1 = `
    precision highp float;
    
    uniform sampler2D u_state;
    uniform vec2 u_resolution;
    uniform float u_time;
    
    // Palette colors
    uniform vec3 u_color1;
    uniform vec3 u_color2;
    uniform vec3 u_color3;
    uniform vec3 u_color4;
    uniform vec3 u_background;
    
    varying vec2 v_texCoord;
    
    vec3 palette(float t) {
        t = clamp(t, 0.0, 1.0);
        
        if (t < 0.33) {
            return mix(u_color1, u_color2, t * 3.0);
        } else if (t < 0.66) {
            return mix(u_color2, u_color3, (t - 0.33) * 3.0);
        } else {
            return mix(u_color3, u_color4, (t - 0.66) * 3.0);
        }
    }
    
    void main() {
        float state = texture2D(u_state, v_texCoord).r;
        float v = pow(state, 0.7);
        
        vec2 texelSize = 1.0 / u_resolution;
        
        float dx = texture2D(u_state, v_texCoord + vec2(texelSize.x, 0.0)).r - 
                   texture2D(u_state, v_texCoord - vec2(texelSize.x, 0.0)).r;
        float dy = texture2D(u_state, v_texCoord + vec2(0.0, texelSize.y)).r - 
                   texture2D(u_state, v_texCoord - vec2(0.0, texelSize.y)).r;
        
        float edge = length(vec2(dx, dy)) * 8.0;
        float laplacian = texture2D(u_state, v_texCoord + vec2(texelSize.x, 0.0)).r +
                          texture2D(u_state, v_texCoord - vec2(texelSize.x, 0.0)).r +
                          texture2D(u_state, v_texCoord + vec2(0.0, texelSize.y)).r +
                          texture2D(u_state, v_texCoord - vec2(0.0, texelSize.y)).r -
                          4.0 * state;
        
        float activity = abs(laplacian) * 30.0;
        
        vec3 baseColor = palette(v);
        vec3 edgeColor = palette(0.95) * edge;
        vec3 activityGlow = vec3(1.0, 0.9, 0.8) * activity * 0.3;
        
        vec3 color = mix(u_background, baseColor + edgeColor + activityGlow, 
                         smoothstep(0.0, 0.08, v + edge * 0.3));
        
        float breath = sin(u_time * 2.0) * 0.5 + 0.5;
        color += edgeColor * breath * 0.15;
        
        vec2 center = v_texCoord - 0.5;
        float vignette = 1.0 - dot(center, center) * 0.6;
        color *= vignette;
        
        gl_FragColor = vec4(color, 1.0);
    }
`;

// ============================================================================
// LENIA ENGINE
// ============================================================================

class Lenia {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!this.gl) {
            throw new Error('WebGL not supported');
        }
        
        this.playing = true;
        this.paintMode = false;
        this.currentSpecies = 'orbium';
        this.currentPalette = 'aurora';
        this.time = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = performance.now();
        this.fps = 0;
        
        // Audio reactivity
        this.audio = typeof AudioReactive !== 'undefined' ? new AudioReactive() : null;
        this.audioReactiveEnabled = false;
        this.lastBeatPerturbTime = 0;
        
        // Demo mode
        this.demoMode = false;
        this.demoTimer = 0;
        this.demoPhase = 0;
        
        // Mutation mode - parameters slowly drift creating organic evolution
        this.mutationMode = false;
        this.mutatedParams = null; // Will be initialized when mutation starts
        this.mutationSpeed = 0.0005; // How fast parameters drift
        
        // Speed control
        this.timeScale = 1.0; // 1.0 = normal speed, 0.5 = slow-mo, 2.0 = fast
        
        // Trail effect for motion blur
        this.trailEnabled = false;
        this.trailAmount = 0.95; // How much previous frame persists (0.9-0.99)
        
        this.init();
    }
    
    init() {
        const gl = this.gl;
        
        // Enable float textures extension
        const ext = gl.getExtension('OES_texture_float');
        if (!ext) {
            console.warn('OES_texture_float not supported, falling back to unsigned byte');
        }
        
        // Setup viewport
        this.resize();
        
        // Create shaders
        console.log('Creating simulation program...');
        this.simProgram = this.createProgram(VERTEX_SHADER, SIMULATION_SHADER);
        console.log('Simulation program created:', this.simProgram);
        
        console.log('Creating render program...');
        this.renderProgram = this.createProgram(VERTEX_SHADER, RENDER_SHADER_WEBGL1);
        console.log('Render program created:', this.renderProgram);
        
        // Create geometry (full-screen quad)
        this.quadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1, 1, -1, -1, 1,
            -1, 1, 1, -1, 1, 1
        ]), gl.STATIC_DRAW);
        
        // Create framebuffers and textures for ping-pong rendering
        this.textures = [this.createTexture(), this.createTexture()];
        this.framebuffers = [
            this.createFramebuffer(this.textures[0]),
            this.createFramebuffer(this.textures[1])
        ];
        this.currentBuffer = 0;
        
        // Initialize with random state
        this.randomize();
        
        // Setup mouse interaction
        this.setupInteraction();
    }
    
    createShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const typeName = type === gl.VERTEX_SHADER ? 'VERTEX' : 'FRAGMENT';
            console.error(`${typeName} shader compile error:`, gl.getShaderInfoLog(shader));
            console.error('Shader source:', source.substring(0, 500));
            gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    createProgram(vertexSource, fragmentSource) {
        const gl = this.gl;
        const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentSource);
        
        if (!vertexShader || !fragmentShader) {
            throw new Error('Shader compilation failed');
        }
        
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(program));
            throw new Error('Shader program linking failed');
        }
        
        return program;
    }
    
    createTexture() {
        const gl = this.gl;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, 
                      gl.RGBA, gl.UNSIGNED_BYTE, null);
        return texture;
    }
    
    createFramebuffer(texture) {
        const gl = this.gl;
        const fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, 
                                gl.TEXTURE_2D, texture, 0);
        return fb;
    }
    
    resize() {
        const dpr = window.devicePixelRatio || 1;
        const scale = 0.5; // Reduce resolution for performance
        
        this.width = Math.floor(this.canvas.clientWidth * dpr * scale);
        this.height = Math.floor(this.canvas.clientHeight * dpr * scale);
        
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        this.gl.viewport(0, 0, this.width, this.height);
    }
    
    randomize() {
        const data = new Uint8Array(this.width * this.height * 4);
        
        // Initialize all alpha to 255
        for (let i = 0; i < this.width * this.height; i++) {
            data[i * 4 + 3] = 255;
        }
        
        // Create Lenia-friendly initial conditions
        // Smooth gaussian blobs with proper density
        const numBlobs = 8 + Math.floor(Math.random() * 8);
        
        for (let i = 0; i < numBlobs; i++) {
            const cx = Math.random() * this.width;
            const cy = Math.random() * this.height;
            const radius = 15 + Math.random() * 25;
            const maxIntensity = 180 + Math.random() * 75;
            
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    const dx = x - cx;
                    const dy = y - cy;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist < radius * 1.5) {
                        // Smooth gaussian falloff
                        const t = dist / radius;
                        const intensity = maxIntensity * Math.exp(-t * t * 2);
                        const idx = (y * this.width + x) * 4;
                        
                        // Add noise for organic feel
                        const noise = (Math.random() - 0.5) * 30;
                        const value = Math.max(0, Math.min(255, data[idx] + intensity + noise));
                        
                        data[idx] = value;
                        data[idx + 1] = value;
                        data[idx + 2] = value;
                    }
                }
            }
        }
        
        // Upload to texture
        const gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, this.textures[this.currentBuffer]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0,
                      gl.RGBA, gl.UNSIGNED_BYTE, data);
    }
    
    clear() {
        const gl = this.gl;
        const data = new Uint8Array(this.width * this.height * 4);
        gl.bindTexture(gl.TEXTURE_2D, this.textures[this.currentBuffer]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0,
                      gl.RGBA, gl.UNSIGNED_BYTE, data);
    }
    
    spawnCreature(creature, x, y, scale = 1.0) {
        const gl = this.gl;
        const patternSize = 64;
        const pattern = creature.generate(patternSize);
        
        // Read current state
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[this.currentBuffer]);
        const data = new Uint8Array(this.width * this.height * 4);
        gl.readPixels(0, 0, this.width, this.height, gl.RGBA, gl.UNSIGNED_BYTE, data);
        
        // Place creature at position
        const px = Math.floor(x * this.width);
        const py = Math.floor((1 - y) * this.height);
        const scaledSize = Math.floor(patternSize * scale);
        
        for (let sy = 0; sy < patternSize; sy++) {
            for (let sx = 0; sx < patternSize; sx++) {
                const value = pattern[sy * patternSize + sx];
                if (value < 0.01) continue;
                
                const tx = px + Math.floor((sx - patternSize/2) * scale);
                const ty = py + Math.floor((sy - patternSize/2) * scale);
                
                if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) continue;
                
                const idx = (ty * this.width + tx) * 4;
                const newVal = Math.min(255, Math.floor(value * 255));
                data[idx] = Math.max(data[idx], newVal);
                data[idx + 1] = data[idx];
                data[idx + 2] = data[idx];
                data[idx + 3] = 255;
            }
        }
        
        // Upload modified state
        gl.bindTexture(gl.TEXTURE_2D, this.textures[this.currentBuffer]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0,
                      gl.RGBA, gl.UNSIGNED_BYTE, data);
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    
    paint(x, y, radius = 20, intensity = 200) {
        const gl = this.gl;
        
        // Read current state
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[this.currentBuffer]);
        const data = new Uint8Array(this.width * this.height * 4);
        gl.readPixels(0, 0, this.width, this.height, gl.RGBA, gl.UNSIGNED_BYTE, data);
        
        // Paint circle
        const px = Math.floor(x * this.width);
        const py = Math.floor((1 - y) * this.height);
        
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > radius) continue;
                
                const nx = px + dx;
                const ny = py + dy;
                
                if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) continue;
                
                const falloff = 1 - dist / radius;
                const add = intensity * falloff * falloff;
                const idx = (ny * this.width + nx) * 4;
                
                data[idx] = Math.min(255, data[idx] + add);
                data[idx + 1] = data[idx];
                data[idx + 2] = data[idx];
            }
        }
        
        // Upload modified state
        gl.bindTexture(gl.TEXTURE_2D, this.textures[this.currentBuffer]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0,
                      gl.RGBA, gl.UNSIGNED_BYTE, data);
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    
    toggleMutation() {
        this.mutationMode = !this.mutationMode;
        
        if (this.mutationMode) {
            // Initialize mutated params from current species
            const species = SPECIES[this.currentSpecies];
            this.mutatedParams = {
                R: species.R,
                T: species.T,
                growthParams: {
                    mu: species.growthParams.mu,
                    sigma: species.growthParams.sigma
                },
                kernelParams: { ...species.kernelParams },
                name: species.name + ' (Mutating)',
                color: [...species.color]
            };
            console.log('🧬 Mutation mode activated - watching evolution unfold...');
        } else {
            this.mutatedParams = null;
            console.log('🧬 Mutation mode deactivated - returning to baseline');
        }
        
        return this.mutationMode;
    }
    
    mutate() {
        if (!this.mutatedParams) return;
        
        const p = this.mutatedParams;
        const speed = this.mutationSpeed;
        
        // Random walk with bounds
        // Kernel radius R: 5-20
        p.R += (Math.random() - 0.5) * speed * 100;
        p.R = Math.max(5, Math.min(20, p.R));
        
        // Time scale T: 5-20
        p.T += (Math.random() - 0.5) * speed * 100;
        p.T = Math.max(5, Math.min(20, p.T));
        
        // Growth center mu: 0.05-0.3
        p.growthParams.mu += (Math.random() - 0.5) * speed;
        p.growthParams.mu = Math.max(0.05, Math.min(0.3, p.growthParams.mu));
        
        // Growth width sigma: 0.005-0.05
        p.growthParams.sigma += (Math.random() - 0.5) * speed * 0.1;
        p.growthParams.sigma = Math.max(0.005, Math.min(0.05, p.growthParams.sigma));
        
        // Occasionally log current params
        if (Math.random() < 0.001) {
            console.log('🧬 Mutation state:', {
                R: p.R.toFixed(2),
                T: p.T.toFixed(2),
                mu: p.growthParams.mu.toFixed(4),
                sigma: p.growthParams.sigma.toFixed(4)
            });
        }
    }
    
    setSpeed(scale) {
        this.timeScale = Math.max(0.1, Math.min(5.0, scale));
        console.log(`⏱️ Speed: ${this.timeScale.toFixed(2)}x`);
        return this.timeScale;
    }
    
    /**
     * Set custom simulation parameters from the Lab panel
     */
    setParameters(params) {
        // Create a custom species based on current one
        const baseSpecies = SPECIES[this.currentSpecies];
        const customSpecies = {
            name: 'Custom',
            color: baseSpecies.color,
            R: params.R || baseSpecies.R,
            T: params.T || baseSpecies.T,
            kernelParams: baseSpecies.kernelParams,
            growthParams: {
                mu: params.mu || baseSpecies.growthParams.mu,
                sigma: params.sigma || baseSpecies.growthParams.sigma
            }
        };
        
        // Store as custom species
        SPECIES['custom'] = customSpecies;
        this.currentSpecies = 'custom';
        
        // Update mutation params if mutation mode is active
        if (this.mutationMode && this.mutatedParams) {
            this.mutatedParams.R = customSpecies.R;
            this.mutatedParams.T = customSpecies.T;
            this.mutatedParams.growthParams.mu = customSpecies.growthParams.mu;
            this.mutatedParams.growthParams.sigma = customSpecies.growthParams.sigma;
        }
        
        console.log(`🔬 Parameters set: R=${customSpecies.R}, T=${customSpecies.T}, μ=${customSpecies.growthParams.mu.toFixed(4)}, σ=${customSpecies.growthParams.sigma.toFixed(4)}`);
    }
    
    toggleTrail() {
        this.trailEnabled = !this.trailEnabled;
        if (this.trailEnabled) {
            console.log(`👻 Trail effect enabled (${this.trailAmount})`);
        } else {
            console.log('👻 Trail effect disabled');
        }
        return this.trailEnabled;
    }
    
    screenshot() {
        // Get canvas as PNG data URL
        const dataURL = this.canvas.toDataURL('image/png');
        
        // Create download link
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        link.download = `lenia-${timestamp}.png`;
        link.href = dataURL;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('📸 Screenshot saved!');
    }
    
    step() {
        const gl = this.gl;
        const species = SPECIES[this.currentSpecies];
        
        // Apply mutation if enabled
        if (this.mutationMode) {
            this.mutate();
        }
        
        // Use mutated parameters if mutation is active, otherwise use species defaults
        const params = this.mutatedParams || species;
        
        // Render to next framebuffer
        const nextBuffer = 1 - this.currentBuffer;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[nextBuffer]);
        gl.viewport(0, 0, this.width, this.height);
        
        // Use simulation shader
        gl.useProgram(this.simProgram);
        
        // Bind current state texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textures[this.currentBuffer]);
        
        // Set uniforms
        gl.uniform1i(gl.getUniformLocation(this.simProgram, 'u_state'), 0);
        gl.uniform2f(gl.getUniformLocation(this.simProgram, 'u_resolution'), 
                     this.width, this.height);
        gl.uniform1f(gl.getUniformLocation(this.simProgram, 'u_R'), params.R);
        gl.uniform1f(gl.getUniformLocation(this.simProgram, 'u_T'), params.T);
        gl.uniform1f(gl.getUniformLocation(this.simProgram, 'u_mu'), params.growthParams.mu);
        gl.uniform1f(gl.getUniformLocation(this.simProgram, 'u_sigma'), params.growthParams.sigma);
        gl.uniform1f(gl.getUniformLocation(this.simProgram, 'u_dt'), this.timeScale);
        gl.uniform1f(gl.getUniformLocation(this.simProgram, 'u_trail'), 
                     this.trailEnabled ? this.trailAmount : 1.0);
        
        // Draw
        const posAttr = gl.getAttribLocation(this.simProgram, 'a_position');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
        gl.enableVertexAttribArray(posAttr);
        gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        
        // Swap buffers
        this.currentBuffer = nextBuffer;
    }
    
    render() {
        const gl = this.gl;
        
        // Helper to convert hex to RGB array
        const toRGB = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? [
                parseInt(result[1], 16) / 255,
                parseInt(result[2], 16) / 255,
                parseInt(result[3], 16) / 255
            ] : [0.5, 0.5, 0.5];
        };
        
        // Default palette
        const defaultPalette = { 
            colors: ['#00ff88', '#00aaff', '#ff00ff', '#ff8800'], 
            background: '#050515' 
        };
        
        // Get palette colors
        const palette = (typeof COLOR_PALETTES !== 'undefined' && COLOR_PALETTES[this.currentPalette]) 
            ? COLOR_PALETTES[this.currentPalette] 
            : defaultPalette;
        
        const colors = palette.colors.map(c => toRGB(c));
        const bg = toRGB(palette.background);
        
        // Render to screen
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        
        // Use render shader
        gl.useProgram(this.renderProgram);
        
        // Bind state texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textures[this.currentBuffer]);
        
        // Set uniforms
        gl.uniform1i(gl.getUniformLocation(this.renderProgram, 'u_state'), 0);
        gl.uniform1f(gl.getUniformLocation(this.renderProgram, 'u_time'), this.time);
        gl.uniform2f(gl.getUniformLocation(this.renderProgram, 'u_resolution'),
                     this.width, this.height);
        
        // Palette uniforms
        gl.uniform3fv(gl.getUniformLocation(this.renderProgram, 'u_color1'), colors[0] || [1,1,1]);
        gl.uniform3fv(gl.getUniformLocation(this.renderProgram, 'u_color2'), colors[1] || [1,1,1]);
        gl.uniform3fv(gl.getUniformLocation(this.renderProgram, 'u_color3'), colors[2] || [1,1,1]);
        gl.uniform3fv(gl.getUniformLocation(this.renderProgram, 'u_color4'), colors[3] || [1,1,1]);
        gl.uniform3fv(gl.getUniformLocation(this.renderProgram, 'u_background'), bg);
        
        // Draw
        const posAttr = gl.getAttribLocation(this.renderProgram, 'a_position');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
        gl.enableVertexAttribArray(posAttr);
        gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    
    setupInteraction() {
        let isMouseDown = false;
        
        this.canvas.addEventListener('mousedown', (e) => {
            isMouseDown = true;
            if (this.paintMode) {
                const rect = this.canvas.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                const y = (e.clientY - rect.top) / rect.height;
                this.paint(x, y);
            }
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (isMouseDown && this.paintMode) {
                const rect = this.canvas.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                const y = (e.clientY - rect.top) / rect.height;
                this.paint(x, y, 15, 150);
            }
        });
        
        this.canvas.addEventListener('mouseup', () => {
            isMouseDown = false;
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            isMouseDown = false;
        });
        
        // Touch support
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.paintMode) {
                const touch = e.touches[0];
                const rect = this.canvas.getBoundingClientRect();
                const x = (touch.clientX - rect.left) / rect.width;
                const y = (touch.clientY - rect.top) / rect.height;
                this.paint(x, y);
            }
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (this.paintMode) {
                const touch = e.touches[0];
                const rect = this.canvas.getBoundingClientRect();
                const x = (touch.clientX - rect.left) / rect.width;
                const y = (touch.clientY - rect.top) / rect.height;
                this.paint(x, y, 15, 100);
            }
        });
    }
    
    async toggleAudio() {
        if (!this.audio) {
            console.log('Audio not available');
            return false;
        }
        
        if (this.audioReactiveEnabled) {
            this.audio.stop();
            this.audioReactiveEnabled = false;
            return false;
        } else {
            const success = await this.audio.initMicrophone();
            this.audioReactiveEnabled = success;
            return success;
        }
    }
    
    runDemo() {
        if (!this.demoMode) return;
        
        const dt = 0.016;
        this.demoTimer += dt;
        
        // Phase timing
        const spawnInterval = 3; // seconds between spawns
        const paletteInterval = 15; // seconds between palette changes
        
        // Spawn creatures periodically
        if (this.demoTimer % spawnInterval < dt) {
            const templates = typeof CREATURE_TEMPLATES !== 'undefined' ? 
                Object.values(CREATURE_TEMPLATES) : [];
            if (templates.length > 0) {
                const creature = templates[Math.floor(Math.random() * templates.length)];
                const x = 0.15 + Math.random() * 0.7;
                const y = 0.15 + Math.random() * 0.7;
                this.spawnCreature(creature, x, y, 0.8 + Math.random() * 0.4);
            }
        }
        
        // Change palette periodically
        if (this.demoTimer % paletteInterval < dt) {
            const palettes = typeof COLOR_PALETTES !== 'undefined' ? 
                Object.keys(COLOR_PALETTES) : ['aurora'];
            const newPalette = palettes[Math.floor(Math.random() * palettes.length)];
            this.currentPalette = newPalette;
            
            // Update UI
            const paletteSelect = document.getElementById('palette-select');
            if (paletteSelect) {
                paletteSelect.querySelectorAll('.species-btn').forEach((btn, i) => {
                    btn.classList.toggle('selected', Object.keys(COLOR_PALETTES)[i] === newPalette);
                });
            }
        }
        
        // Random perturbations
        if (Math.random() < 0.02) {
            const x = Math.random();
            const y = Math.random();
            this.paint(x, y, 15, 120);
        }
        
        // Change species occasionally
        if (this.demoTimer % 20 < dt) {
            const speciesKeys = Object.keys(SPECIES);
            this.currentSpecies = speciesKeys[Math.floor(Math.random() * speciesKeys.length)];
        }
    }
    
    toggleDemo() {
        this.demoMode = !this.demoMode;
        if (this.demoMode) {
            this.demoTimer = 0;
            this.playing = true;
        }
        return this.demoMode;
    }
    
    applyAudioEffects() {
        if (!this.audioReactiveEnabled || !this.audio) return;
        
        this.audio.update();
        
        const bass = this.audio.getBass();
        const energy = this.audio.getEnergy();
        
        // On beat, add a perturbation
        if (this.audio.hasBeat()) {
            const now = performance.now();
            if (now - this.lastBeatPerturbTime > 150) {
                // Add random perturbation on beat
                const x = Math.random();
                const y = Math.random();
                const intensity = 150 + bass * 100;
                const radius = 20 + bass * 30;
                this.paint(x, y, radius, intensity);
                this.lastBeatPerturbTime = now;
            }
        }
        
        // Continuous bass-driven subtle perturbations
        if (bass > 0.3 && Math.random() < bass * 0.3) {
            const x = Math.random();
            const y = Math.random();
            this.paint(x, y, 10, bass * 80);
        }
    }
    
    updateFPS() {
        this.frameCount++;
        const now = performance.now();
        const delta = now - this.lastFpsUpdate;
        
        if (delta >= 1000) {
            this.fps = Math.round(this.frameCount * 1000 / delta);
            this.frameCount = 0;
            this.lastFpsUpdate = now;
            
            document.getElementById('fps').textContent = `FPS: ${this.fps}`;
        }
    }
    
    animate() {
        // Demo mode
        this.runDemo();
        
        // Apply audio effects
        this.applyAudioEffects();
        
        if (this.playing) {
            this.step();
        }
        
        this.render();
        this.time += 0.016;
        this.updateFPS();
        
        // Capture frame if recording
        if (this.recorder && this.recorder.recording) {
            this.recorder.captureFrame(performance.now());
        }
        
        requestAnimationFrame(() => this.animate());
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    const loading = document.getElementById('loading');
    
    try {
        const lenia = new Lenia(canvas);
        
        // Setup UI controls
        const btnPlay = document.getElementById('btn-play');
        const btnStep = document.getElementById('btn-step');
        const btnClear = document.getElementById('btn-clear');
        const btnRandom = document.getElementById('btn-random');
        const btnPaint = document.getElementById('btn-paint');
        const speciesSelect = document.getElementById('species-select');
        
        btnPlay.addEventListener('click', () => {
            lenia.playing = !lenia.playing;
            btnPlay.textContent = lenia.playing ? 'Pause' : 'Play';
            btnPlay.classList.toggle('active', lenia.playing);
        });
        
        btnStep.addEventListener('click', () => {
            lenia.step();
        });
        
        btnClear.addEventListener('click', () => {
            lenia.clear();
        });
        
        btnRandom.addEventListener('click', () => {
            lenia.randomize();
        });
        
        btnPaint.addEventListener('click', () => {
            lenia.paintMode = !lenia.paintMode;
            btnPaint.classList.toggle('active', lenia.paintMode);
            canvas.style.cursor = lenia.paintMode ? 'crosshair' : 'default';
        });
        
        // Create palette buttons
        const paletteSelect = document.getElementById('palette-select');
        if (typeof COLOR_PALETTES !== 'undefined' && paletteSelect) {
            Object.entries(COLOR_PALETTES).forEach(([key, palette]) => {
                const btn = document.createElement('button');
                btn.className = 'species-btn';
                btn.title = palette.name;
                btn.style.width = '24px';
                btn.style.height = '24px';
                btn.style.background = `linear-gradient(135deg, ${palette.colors[0]}, ${palette.colors[1]}, ${palette.colors[2]})`;
                
                if (key === lenia.currentPalette) {
                    btn.classList.add('selected');
                }
                
                btn.addEventListener('click', () => {
                    paletteSelect.querySelectorAll('.species-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    lenia.currentPalette = key;
                });
                
                paletteSelect.appendChild(btn);
            });
        }
        
        // Create species buttons
        Object.entries(SPECIES).forEach(([key, species]) => {
            const btn = document.createElement('button');
            btn.className = 'species-btn';
            btn.title = species.name;
            btn.style.background = `rgb(${species.color.map(c => Math.round(c * 255)).join(',')})`;
            
            if (key === lenia.currentSpecies) {
                btn.classList.add('selected');
            }
            
            btn.addEventListener('click', () => {
                document.querySelectorAll('.species-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                lenia.currentSpecies = key;
            });
            
            speciesSelect.appendChild(btn);
        });
        
        // Handle resize
        window.addEventListener('resize', () => {
            lenia.resize();
            // Recreate textures
            lenia.textures = [lenia.createTexture(), lenia.createTexture()];
            lenia.framebuffers = [
                lenia.createFramebuffer(lenia.textures[0]),
                lenia.createFramebuffer(lenia.textures[1])
            ];
            lenia.randomize();
        });
        
        // Hide loading screen and start
        loading.classList.add('hidden');
        lenia.animate();
        
        // Audio button
        const btnAudio = document.getElementById('btn-audio');
        if (btnAudio) {
            btnAudio.addEventListener('click', async () => {
                const active = await lenia.toggleAudio();
                btnAudio.classList.toggle('active', active);
                btnAudio.textContent = active ? '🎤 Active' : '🎤 Audio';
            });
        }
        
        // Demo button
        const btnDemo = document.getElementById('btn-demo');
        if (btnDemo) {
            btnDemo.addEventListener('click', () => {
                const active = lenia.toggleDemo();
                btnDemo.classList.toggle('active', active);
                btnDemo.textContent = active ? '🎬 Stop' : '🎬 Demo';
                
                if (active) {
                    btnPlay.textContent = 'Pause';
                    btnPlay.classList.add('active');
                }
            });
        }
        
        // Record button
        const btnRecord = document.getElementById('btn-record');
        if (btnRecord && window.LeniaRecorder) {
            const recorder = new LeniaRecorder(canvas);
            lenia.recorder = recorder;
            
            btnRecord.addEventListener('click', () => {
                const recording = recorder.toggle();
                btnRecord.classList.toggle('active', recording);
                btnRecord.textContent = recording ? '⏹️ Stop' : '⏺️ Record';
                
                if (recording && !lenia.playing) {
                    lenia.playing = true;
                    btnPlay.textContent = 'Pause';
                    btnPlay.classList.add('active');
                }
            });
        }
        
        // Mutate button for evolutionary parameter drift
        const btnMutate = document.getElementById('btn-mutate');
        if (btnMutate) {
            btnMutate.addEventListener('click', () => {
                const mutating = lenia.toggleMutation();
                btnMutate.classList.toggle('active', mutating);
                btnMutate.textContent = mutating ? '🧬 Evolving' : '🧬 Mutate';
            });
        }
        
        // Trail effect button
        const btnTrail = document.getElementById('btn-trail');
        if (btnTrail) {
            btnTrail.addEventListener('click', () => {
                const active = lenia.toggleTrail();
                btnTrail.classList.toggle('active', active);
            });
        }
        
        // Screenshot button
        const btnScreenshot = document.getElementById('btn-screenshot');
        if (btnScreenshot) {
            btnScreenshot.addEventListener('click', () => {
                lenia.screenshot();
            });
        }
        
        // Speed control buttons
        const btnSpeedDown = document.getElementById('btn-speed-down');
        const btnSpeedNormal = document.getElementById('btn-speed-normal');
        const btnSpeedUp = document.getElementById('btn-speed-up');
        
        if (btnSpeedDown && btnSpeedNormal && btnSpeedUp) {
            btnSpeedDown.addEventListener('click', () => {
                lenia.setSpeed(0.5);
                [btnSpeedDown, btnSpeedNormal, btnSpeedUp].forEach(b => b.classList.remove('active'));
                btnSpeedDown.classList.add('active');
            });
            
            btnSpeedNormal.addEventListener('click', () => {
                lenia.setSpeed(1.0);
                [btnSpeedDown, btnSpeedNormal, btnSpeedUp].forEach(b => b.classList.remove('active'));
                btnSpeedNormal.classList.add('active');
            });
            
            btnSpeedUp.addEventListener('click', () => {
                lenia.setSpeed(2.0);
                [btnSpeedDown, btnSpeedNormal, btnSpeedUp].forEach(b => b.classList.remove('active'));
                btnSpeedUp.classList.add('active');
            });
        }
        
        // Spawn button cycles through creatures
        let spawnIndex = 0;
        const creatureKeys = Object.keys(CREATURE_TEMPLATES);
        
        document.getElementById('btn-spawn').addEventListener('click', () => {
            const key = creatureKeys[spawnIndex];
            const creature = CREATURE_TEMPLATES[key];
            
            // Also set the species params
            if (SPECIES[key]) {
                lenia.currentSpecies = key;
                document.querySelectorAll('.species-btn').forEach((b, i) => {
                    b.classList.toggle('selected', Object.keys(SPECIES)[i] === key);
                });
            }
            
            // Spawn at random position
            const x = 0.2 + Math.random() * 0.6;
            const y = 0.2 + Math.random() * 0.6;
            lenia.spawnCreature(creature, x, y);
            
            spawnIndex = (spawnIndex + 1) % creatureKeys.length;
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            switch(e.key.toLowerCase()) {
                case ' ':
                    e.preventDefault();
                    lenia.playing = !lenia.playing;
                    btnPlay.textContent = lenia.playing ? 'Pause' : 'Play';
                    btnPlay.classList.toggle('active', lenia.playing);
                    break;
                case 'r':
                    lenia.randomize();
                    break;
                case 'c':
                    lenia.clear();
                    break;
                case 'p':
                    lenia.paintMode = !lenia.paintMode;
                    btnPaint.classList.toggle('active', lenia.paintMode);
                    canvas.style.cursor = lenia.paintMode ? 'crosshair' : 'default';
                    break;
                case 'd':
                    const demoActive = lenia.toggleDemo();
                    const btnDemo = document.getElementById('btn-demo');
                    if (btnDemo) {
                        btnDemo.classList.toggle('active', demoActive);
                        btnDemo.textContent = demoActive ? '🎬 Stop' : '🎬 Demo';
                    }
                    if (demoActive) {
                        btnPlay.textContent = 'Pause';
                        btnPlay.classList.add('active');
                    }
                    break;
                case '1': case '2': case '3': case '4': case '5': case '6':
                    const idx = parseInt(e.key) - 1;
                    if (idx < creatureKeys.length) {
                        const key = creatureKeys[idx];
                        const creature = CREATURE_TEMPLATES[key];
                        lenia.spawnCreature(creature, 0.3 + Math.random() * 0.4, 0.3 + Math.random() * 0.4);
                    }
                    break;
                case 'g':
                    if (lenia.recorder) {
                        const recording = lenia.recorder.toggle();
                        const btnRecord = document.getElementById('btn-record');
                        if (btnRecord) {
                            btnRecord.classList.toggle('active', recording);
                            btnRecord.textContent = recording ? '⏹️ Stop' : '⏺️ Record';
                        }
                        if (recording && !lenia.playing) {
                            lenia.playing = true;
                            btnPlay.textContent = 'Pause';
                            btnPlay.classList.add('active');
                        }
                    }
                    break;
                case 'm':
                    const mutating = lenia.toggleMutation();
                    const btnMutate = document.getElementById('btn-mutate');
                    if (btnMutate) {
                        btnMutate.classList.toggle('active', mutating);
                        btnMutate.textContent = mutating ? '🧬 Evolving' : '🧬 Mutate';
                    }
                    break;
                case 't':
                    const trailActive = lenia.toggleTrail();
                    const btnTrail = document.getElementById('btn-trail');
                    if (btnTrail) {
                        btnTrail.classList.toggle('active', trailActive);
                    }
                    break;
                case 's':
                    lenia.screenshot();
                    break;
                case '[':
                    lenia.setSpeed(Math.max(0.1, lenia.timeScale * 0.5));
                    const btnSpeedDown = document.getElementById('btn-speed-down');
                    const btnSpeedNormal = document.getElementById('btn-speed-normal');
                    const btnSpeedUp = document.getElementById('btn-speed-up');
                    [btnSpeedDown, btnSpeedNormal, btnSpeedUp].forEach(b => b.classList.remove('active'));
                    if (lenia.timeScale === 0.5) btnSpeedDown?.classList.add('active');
                    else if (lenia.timeScale === 1.0) btnSpeedNormal?.classList.add('active');
                    break;
                case ']':
                    lenia.setSpeed(Math.min(5.0, lenia.timeScale * 2.0));
                    const btnSpeedDown2 = document.getElementById('btn-speed-down');
                    const btnSpeedNormal2 = document.getElementById('btn-speed-normal');
                    const btnSpeedUp2 = document.getElementById('btn-speed-up');
                    [btnSpeedDown2, btnSpeedNormal2, btnSpeedUp2].forEach(b => b.classList.remove('active'));
                    if (lenia.timeScale === 2.0) btnSpeedUp2?.classList.add('active');
                    else if (lenia.timeScale === 1.0) btnSpeedNormal2?.classList.add('active');
                    break;
                case 'l':
                    const labPanel = document.getElementById('lab-panel');
                    const btnLab = document.getElementById('btn-lab');
                    if (labPanel && btnLab) {
                        labPanel.classList.toggle('visible');
                        btnLab.classList.toggle('active');
                    }
                    break;
            }
        });
        
        // Click to spawn/disturb
        canvas.addEventListener('click', (e) => {
            if (!lenia.paintMode) {
                const rect = canvas.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                const y = (e.clientY - rect.top) / rect.height;
                lenia.paint(x, y, 25, 180);
            }
        });
        
        // Lab Panel - Real-time parameter tweaking
        const labPanel = document.getElementById('lab-panel');
        const btnLab = document.getElementById('btn-lab');
        
        if (btnLab && labPanel) {
            btnLab.addEventListener('click', () => {
                labPanel.classList.toggle('visible');
                btnLab.classList.toggle('active');
            });
            
            // Slider elements
            const sliderR = document.getElementById('slider-R');
            const sliderT = document.getElementById('slider-T');
            const sliderMu = document.getElementById('slider-mu');
            const sliderSigma = document.getElementById('slider-sigma');
            const valR = document.getElementById('val-R');
            const valT = document.getElementById('val-T');
            const valMu = document.getElementById('val-mu');
            const valSigma = document.getElementById('val-sigma');
            
            // Update display values on slider change
            sliderR.addEventListener('input', () => { valR.textContent = sliderR.value; });
            sliderT.addEventListener('input', () => { valT.textContent = sliderT.value; });
            sliderMu.addEventListener('input', () => { valMu.textContent = parseFloat(sliderMu.value).toFixed(3); });
            sliderSigma.addEventListener('input', () => { valSigma.textContent = parseFloat(sliderSigma.value).toFixed(3); });
            
            // Apply button - updates the simulation parameters
            document.getElementById('btn-lab-apply').addEventListener('click', () => {
                const params = {
                    R: parseInt(sliderR.value),
                    T: parseInt(sliderT.value),
                    mu: parseFloat(sliderMu.value),
                    sigma: parseFloat(sliderSigma.value)
                };
                lenia.setParameters(params);
                console.log('Applied params:', params);
            });
            
            // Random button - generates random viable parameters
            document.getElementById('btn-lab-random').addEventListener('click', () => {
                const R = Math.floor(Math.random() * 12) + 6;
                const T = Math.floor(Math.random() * 15) + 3;
                const mu = (Math.random() * 0.20 + 0.08).toFixed(3);
                const sigma = (Math.random() * 0.025 + 0.010).toFixed(3);
                
                sliderR.value = R; valR.textContent = R;
                sliderT.value = T; valT.textContent = T;
                sliderMu.value = mu; valMu.textContent = mu;
                sliderSigma.value = sigma; valSigma.textContent = sigma;
                
                lenia.setParameters({ R, T, mu: parseFloat(mu), sigma: parseFloat(sigma) });
            });
            
            // Copy button - copies params to clipboard
            document.getElementById('btn-lab-copy').addEventListener('click', () => {
                const params = {
                    R: parseInt(sliderR.value),
                    T: parseInt(sliderT.value),
                    mu: parseFloat(sliderMu.value),
                    sigma: parseFloat(sliderSigma.value)
                };
                const text = JSON.stringify(params, null, 2);
                navigator.clipboard.writeText(text).then(() => {
                    const btn = document.getElementById('btn-lab-copy');
                    btn.textContent = 'Copied!';
                    setTimeout(() => { btn.textContent = 'Copy'; }, 1000);
                });
            });
        }
        
        // Expose for debugging
        window.lenia = lenia;
        
    } catch (e) {
        loading.textContent = 'Error: ' + e.message;
        loading.style.fontSize = '12px';
        loading.style.padding = '20px';
        loading.style.whiteSpace = 'pre-wrap';
        console.error('Lenia init error:', e);
        console.error(e.stack);
    }
});
