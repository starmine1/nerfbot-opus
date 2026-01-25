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

const SPECIES = {
    orbium: {
        name: 'Orbium',
        color: [0.2, 0.6, 1.0],
        R: 13,        // Kernel radius
        T: 10,        // Time scale
        kernelParams: {
            rings: [{ r: 1.0, w: 1.0 }],
            beta: [1, 1, 1]
        },
        growthParams: {
            mu: 0.15,    // Growth center
            sigma: 0.015 // Growth width
        }
    },
    
    geminium: {
        name: 'Geminium',
        color: [1.0, 0.4, 0.6],
        R: 10,
        T: 10,
        kernelParams: {
            rings: [{ r: 0.5, w: 0.5 }, { r: 1.0, w: 1.0 }],
            beta: [1, 0.5, 0.5]
        },
        growthParams: {
            mu: 0.14,
            sigma: 0.014
        }
    },
    
    hydrogeminium: {
        name: 'Hydrogeminium',
        color: [0.4, 1.0, 0.6],
        R: 15,
        T: 10,
        kernelParams: {
            rings: [{ r: 1.0, w: 1.0 }],
            beta: [1, 1/3, 1]
        },
        growthParams: {
            mu: 0.12,
            sigma: 0.012
        }
    },
    
    scutium: {
        name: 'Scutium',
        color: [1.0, 0.8, 0.2],
        R: 12,
        T: 8,
        kernelParams: {
            rings: [{ r: 1.0, w: 1.0 }],
            beta: [0.5, 1, 1]
        },
        growthParams: {
            mu: 0.16,
            sigma: 0.016
        }
    },
    
    gliderium: {
        name: 'Gliderium',
        color: [0.8, 0.4, 1.0],
        R: 14,
        T: 12,
        kernelParams: {
            rings: [{ r: 0.8, w: 0.8 }, { r: 1.0, w: 0.2 }],
            beta: [1, 0.8, 0.5]
        },
        growthParams: {
            mu: 0.135,
            sigma: 0.013
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
    uniform vec3 u_beta;        // Kernel shell weights
    uniform float u_dt;         // Time step
    
    varying vec2 v_texCoord;
    
    // Kernel function: creates a smooth ring/annulus shape
    float kernel(float r, vec3 beta) {
        float b = beta.x;
        float w1 = beta.y;
        float w2 = beta.z;
        
        // Smooth bump function for ring shape
        float kr = 4.0 * r * (1.0 - r);
        return kr * kr;
    }
    
    // Growth function: bell curve centered at mu
    float growth(float u) {
        return 2.0 * exp(-pow((u - u_mu) / u_sigma, 2.0) / 2.0) - 1.0;
    }
    
    void main() {
        vec2 texelSize = 1.0 / u_resolution;
        
        // Compute kernel convolution
        float total = 0.0;
        float kernelSum = 0.0;
        
        int R = int(u_R);
        
        for (int dy = -30; dy <= 30; dy++) {
            for (int dx = -30; dx <= 30; dx++) {
                if (dx*dx + dy*dy > R*R) continue;
                if (abs(dx) > R || abs(dy) > R) continue;
                
                float r = length(vec2(float(dx), float(dy))) / u_R;
                if (r > 1.0) continue;
                
                float k = kernel(r, u_beta);
                vec2 samplePos = v_texCoord + vec2(float(dx), float(dy)) * texelSize;
                float state = texture2D(u_state, samplePos).r;
                
                total += state * k;
                kernelSum += k;
            }
        }
        
        // Normalize convolution
        float U = total / max(kernelSum, 0.0001);
        
        // Apply growth function
        float G = growth(U);
        
        // Update state
        float currentState = texture2D(u_state, v_texCoord).r;
        float newState = clamp(currentState + G * u_dt / u_T, 0.0, 1.0);
        
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
        this.simProgram = this.createProgram(VERTEX_SHADER, SIMULATION_SHADER);
        this.renderProgram = this.createProgram(VERTEX_SHADER, RENDER_SHADER_WEBGL1);
        
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
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    createProgram(vertexSource, fragmentSource) {
        const gl = this.gl;
        const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentSource);
        
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(program));
            return null;
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
        
        // Create a few random blobs
        const numBlobs = 5 + Math.floor(Math.random() * 5);
        
        for (let i = 0; i < numBlobs; i++) {
            const cx = Math.random() * this.width;
            const cy = Math.random() * this.height;
            const radius = 20 + Math.random() * 40;
            
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    const dx = x - cx;
                    const dy = y - cy;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist < radius) {
                        const intensity = Math.random() * 200 + 55;
                        const idx = (y * this.width + x) * 4;
                        data[idx] = Math.min(255, data[idx] + intensity);
                        data[idx + 1] = data[idx];
                        data[idx + 2] = data[idx];
                        data[idx + 3] = 255;
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
    
    step() {
        const gl = this.gl;
        const species = SPECIES[this.currentSpecies];
        
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
        gl.uniform1f(gl.getUniformLocation(this.simProgram, 'u_R'), species.R);
        gl.uniform1f(gl.getUniformLocation(this.simProgram, 'u_T'), species.T);
        gl.uniform1f(gl.getUniformLocation(this.simProgram, 'u_mu'), species.growthParams.mu);
        gl.uniform1f(gl.getUniformLocation(this.simProgram, 'u_sigma'), species.growthParams.sigma);
        gl.uniform3fv(gl.getUniformLocation(this.simProgram, 'u_beta'), species.kernelParams.beta);
        gl.uniform1f(gl.getUniformLocation(this.simProgram, 'u_dt'), 1.0);
        
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
        
        // Get palette colors
        const palette = (typeof COLOR_PALETTES !== 'undefined') 
            ? COLOR_PALETTES[this.currentPalette] || COLOR_PALETTES.aurora
            : { colors: ['#00ff88', '#00aaff', '#ff00ff', '#ff8800'], background: '#050515' };
        
        const colors = palette.colors.map(c => hexToRGB ? hexToRGB(c) : [1, 1, 1]);
        const bg = hexToRGB ? hexToRGB(palette.background) : [0, 0, 0];
        
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
        if (this.playing) {
            this.step();
        }
        
        this.render();
        this.time += 0.016;
        this.updateFPS();
        
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
                case '1': case '2': case '3': case '4': case '5': case '6':
                    const idx = parseInt(e.key) - 1;
                    if (idx < creatureKeys.length) {
                        const key = creatureKeys[idx];
                        const creature = CREATURE_TEMPLATES[key];
                        lenia.spawnCreature(creature, 0.3 + Math.random() * 0.4, 0.3 + Math.random() * 0.4);
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
        
        // Expose for debugging
        window.lenia = lenia;
        
    } catch (e) {
        loading.textContent = 'Error: ' + e.message;
        console.error(e);
    }
});
