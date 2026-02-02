/**
 * LENIA ECOSYSTEM - Multi-Species Extension
 * 
 * Extends base Lenia with predator-prey dynamics.
 * Three species occupy R, G, B channels with interaction matrix.
 * 
 * Species roles:
 * - RED (R channel): Prey - reproduces quickly, eaten by predators
 * - GREEN (G channel): Predator - eats prey, reproduces slower
 * - BLUE (B channel): Apex - eats predators, reproduces slowest
 * 
 * @author Nerfbot
 * @license MIT
 */

// ============================================================================
// ECOSYSTEM SPECIES DEFINITIONS
// ============================================================================

const ECOSYSTEM_SPECIES = {
    prey: {
        channel: 0,  // R
        name: 'Prey',
        color: [1.0, 0.3, 0.2],
        R: 10,
        T: 15,       // Fast reproduction
        growthParams: {
            mu: 0.14,
            sigma: 0.015  // Wider tolerance = hardier
        },
        // Interaction: loses to predator
        eatenBy: ['predator'],
        eats: []
    },
    
    predator: {
        channel: 1,  // G
        name: 'Predator',
        color: [0.2, 1.0, 0.4],
        R: 12,
        T: 20,       // Medium speed
        growthParams: {
            mu: 0.13,
            sigma: 0.012
        },
        // Interaction: eats prey, eaten by apex
        eatenBy: ['apex'],
        eats: ['prey']
    },
    
    apex: {
        channel: 2,  // B
        name: 'Apex',
        color: [0.3, 0.4, 1.0],
        R: 14,
        T: 25,       // Slowest reproduction
        growthParams: {
            mu: 0.12,
            sigma: 0.010  // Narrow tolerance = fragile
        },
        // Interaction: eats predators
        eatenBy: [],
        eats: ['predator']
    }
};

// Interaction matrix: how much species i affects species j
// Positive = helps (food source), Negative = hurts (predation)
const INTERACTION_MATRIX = {
    // [prey, predator, apex] effect on prey
    prey:     [0.0, -0.3, 0.0],     // Prey is eaten by predator
    // [prey, predator, apex] effect on predator  
    predator: [0.2, 0.0, -0.3],     // Predator benefits from prey, eaten by apex
    // [prey, predator, apex] effect on apex
    apex:     [0.0, 0.15, 0.0]      // Apex benefits from predator
};

// ============================================================================
// ECOSYSTEM SIMULATION SHADER
// ============================================================================

const ECOSYSTEM_SIMULATION_SHADER = `
    precision highp float;
    
    uniform sampler2D u_state;
    uniform vec2 u_resolution;
    uniform float u_dt;
    uniform float u_time;
    
    // Per-species parameters (3 species: prey, predator, apex)
    uniform vec3 u_R;           // Kernel radii
    uniform vec3 u_T;           // Time scales
    uniform vec3 u_mu;          // Growth centers
    uniform vec3 u_sigma;       // Growth widths
    
    // Interaction strengths
    uniform float u_predation;  // How strongly predators affect prey
    uniform float u_benefit;    // How much predators gain from prey
    
    varying vec2 v_texCoord;
    
    // Kernel function: ring-shaped pattern
    float kernel(float r) {
        float kr = 4.0 * r * (1.0 - r);
        return kr * kr;
    }
    
    // Growth function: bell curve centered at mu
    float growth(float u, float mu, float sigma) {
        float diff = (u - mu) / sigma;
        return 2.0 * exp(-diff * diff / 2.0) - 1.0;
    }
    
    void main() {
        vec2 texelSize = 1.0 / u_resolution;
        vec4 current = texture2D(u_state, v_texCoord);
        
        // Current densities for each species
        float preyDensity = current.r;
        float predDensity = current.g;
        float apexDensity = current.b;
        
        // Compute neighborhood averages for each species
        vec3 totals = vec3(0.0);
        vec3 kernelSums = vec3(0.0);
        
        // Use largest kernel radius for sampling
        float maxR = max(u_R.x, max(u_R.y, u_R.z));
        int iMaxR = int(ceil(maxR));
        
        // Sample neighborhood
        for (int dy = -15; dy <= 15; dy++) {
            for (int dx = -15; dx <= 15; dx++) {
                float fdx = float(dx);
                float fdy = float(dy);
                float dist = sqrt(fdx * fdx + fdy * fdy);
                
                if (dist < 0.5) continue;
                
                vec2 samplePos = v_texCoord + vec2(fdx, fdy) * texelSize;
                vec4 neighbor = texture2D(u_state, samplePos);
                
                // For each species, compute kernel weight at this distance
                // Prey (R channel)
                if (dist <= u_R.x) {
                    float r = dist / u_R.x;
                    float k = kernel(r);
                    totals.x += neighbor.r * k;
                    kernelSums.x += k;
                }
                
                // Predator (G channel)
                if (dist <= u_R.y) {
                    float r = dist / u_R.y;
                    float k = kernel(r);
                    totals.y += neighbor.g * k;
                    kernelSums.y += k;
                }
                
                // Apex (B channel)
                if (dist <= u_R.z) {
                    float r = dist / u_R.z;
                    float k = kernel(r);
                    totals.z += neighbor.b * k;
                    kernelSums.z += k;
                }
            }
        }
        
        // Compute neighborhood averages
        vec3 U = totals / max(kernelSums, vec3(0.001));
        
        // Compute base growth for each species
        float preyGrowth = growth(U.x, u_mu.x, u_sigma.x);
        float predGrowth = growth(U.y, u_mu.y, u_sigma.y);
        float apexGrowth = growth(U.z, u_mu.z, u_sigma.z);
        
        // ==========================================
        // ECOSYSTEM INTERACTIONS
        // ==========================================
        
        // Local density sampling for interactions
        // Sample prey density at predator locations
        float localPrey = preyDensity;
        float localPred = predDensity;
        float localApex = apexDensity;
        
        // Predation: predators eat prey
        // Prey loses density proportional to local predator density
        float preyLoss = localPred * u_predation * localPrey;
        
        // Predator gains from eating prey
        float predGain = localPrey * u_benefit * localPred * 0.5;
        
        // Apex eats predators
        float predLoss = localApex * u_predation * localPred;
        float apexGain = localPred * u_benefit * localApex * 0.3;
        
        // Competition: density-dependent mortality (prevents overcrowding)
        float totalDensity = preyDensity + predDensity + apexDensity;
        float crowding = smoothstep(0.5, 1.5, totalDensity) * 0.1;
        
        // Apply updates
        float newPrey = preyDensity + (preyGrowth * u_dt / u_T.x) - preyLoss - crowding * preyDensity;
        float newPred = predDensity + (predGrowth * u_dt / u_T.y) + predGain - predLoss - crowding * predDensity;
        float newApex = apexDensity + (apexGrowth * u_dt / u_T.z) + apexGain - crowding * apexDensity;
        
        // Clamp to valid range
        newPrey = clamp(newPrey, 0.0, 1.0);
        newPred = clamp(newPred, 0.0, 1.0);
        newApex = clamp(newApex, 0.0, 1.0);
        
        // Very slow base decay to prevent stagnation
        newPrey *= 0.9995;
        newPred *= 0.9993;
        newApex *= 0.9990;
        
        gl_FragColor = vec4(newPrey, newPred, newApex, 1.0);
    }
`;

// ============================================================================
// ECOSYSTEM RENDER SHADER
// ============================================================================

const ECOSYSTEM_RENDER_SHADER = `
    precision highp float;
    
    uniform sampler2D u_state;
    uniform vec2 u_resolution;
    uniform float u_time;
    
    // Species colors
    uniform vec3 u_preyColor;
    uniform vec3 u_predColor;
    uniform vec3 u_apexColor;
    uniform vec3 u_background;
    
    varying vec2 v_texCoord;
    
    void main() {
        vec2 texelSize = 1.0 / u_resolution;
        vec4 data = texture2D(u_state, v_texCoord);
        
        float prey = data.r;
        float pred = data.g;
        float apex = data.b;
        
        // Edge detection for glow effect
        vec4 dx = texture2D(u_state, v_texCoord + vec2(texelSize.x, 0.0)) - 
                  texture2D(u_state, v_texCoord - vec2(texelSize.x, 0.0));
        vec4 dy = texture2D(u_state, v_texCoord + vec2(0.0, texelSize.y)) - 
                  texture2D(u_state, v_texCoord - vec2(0.0, texelSize.y));
        
        vec3 edges = vec3(
            length(vec2(dx.r, dy.r)),
            length(vec2(dx.g, dy.g)),
            length(vec2(dx.b, dy.b))
        ) * 5.0;
        
        // Blend species colors based on density
        vec3 color = u_background;
        
        // Layer species (prey at bottom, apex on top for visual hierarchy)
        float preyV = pow(prey, 0.7);
        float predV = pow(pred, 0.7);
        float apexV = pow(apex, 0.7);
        
        // Additive blending with glow
        color += u_preyColor * preyV + vec3(1.0) * edges.x * 0.3;
        color += u_predColor * predV + vec3(1.0) * edges.y * 0.3;
        color += u_apexColor * apexV + vec3(1.0) * edges.z * 0.3;
        
        // Subtle pulsing based on local density
        float pulse = sin(u_time * 2.0) * 0.5 + 0.5;
        float totalDensity = prey + pred + apex;
        color += vec3(0.02, 0.02, 0.05) * pulse * totalDensity;
        
        // Vignette
        vec2 center = v_texCoord - 0.5;
        float vignette = 1.0 - dot(center, center) * 0.5;
        color *= vignette;
        
        gl_FragColor = vec4(color, 1.0);
    }
`;

// ============================================================================
// ECOSYSTEM ENGINE CLASS
// ============================================================================

class LeniaEcosystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!this.gl) {
            throw new Error('WebGL not supported');
        }
        
        this.playing = true;
        this.time = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = performance.now();
        this.fps = 0;
        
        // Ecosystem parameters
        this.predationStrength = 0.15;
        this.benefitStrength = 0.12;
        this.timeScale = 0.5;
        
        // Paint mode
        this.paintMode = false;
        this.paintSpecies = 'prey';  // prey, predator, apex
        
        this.init();
    }
    
    init() {
        const gl = this.gl;
        
        // Enable float textures
        gl.getExtension('OES_texture_float');
        
        this.resize();
        
        // Create shaders
        this.simProgram = this.createProgram(VERTEX_SHADER, ECOSYSTEM_SIMULATION_SHADER);
        this.renderProgram = this.createProgram(VERTEX_SHADER, ECOSYSTEM_RENDER_SHADER);
        
        // Geometry
        this.quadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1, 1, -1, -1, 1,
            -1, 1, 1, -1, 1, 1
        ]), gl.STATIC_DRAW);
        
        // Ping-pong textures
        this.textures = [this.createTexture(), this.createTexture()];
        this.framebuffers = [
            this.createFramebuffer(this.textures[0]),
            this.createFramebuffer(this.textures[1])
        ];
        this.currentBuffer = 0;
        
        this.seedEcosystem();
        this.setupInteraction();
    }
    
    createShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader error:', gl.getShaderInfoLog(shader));
            return null;
        }
        return shader;
    }
    
    createProgram(vertexSource, fragmentSource) {
        const gl = this.gl;
        const vs = this.createShader(gl.VERTEX_SHADER, vertexSource);
        const fs = this.createShader(gl.FRAGMENT_SHADER, fragmentSource);
        
        if (!vs || !fs) throw new Error('Shader compilation failed');
        
        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Link error:', gl.getProgramInfoLog(program));
            throw new Error('Program linking failed');
        }
        return program;
    }
    
    createTexture() {
        const gl = this.gl;
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0,
                      gl.RGBA, gl.UNSIGNED_BYTE, null);
        return tex;
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
        const scale = 0.5;
        
        this.width = Math.floor(this.canvas.clientWidth * dpr * scale);
        this.height = Math.floor(this.canvas.clientHeight * dpr * scale);
        
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.gl.viewport(0, 0, this.width, this.height);
    }
    
    /**
     * Seed the ecosystem with initial populations
     */
    seedEcosystem() {
        const data = new Uint8Array(this.width * this.height * 4);
        
        // Seed clusters of each species in different regions
        const regions = [
            { species: 0, cx: 0.25, cy: 0.5, count: 3 },   // Prey (R) - left
            { species: 1, cx: 0.5, cy: 0.5, count: 2 },    // Predator (G) - center
            { species: 2, cx: 0.75, cy: 0.5, count: 1 }    // Apex (B) - right
        ];
        
        for (const region of regions) {
            for (let i = 0; i < region.count; i++) {
                const cx = this.width * (region.cx + (Math.random() - 0.5) * 0.3);
                const cy = this.height * (region.cy + (Math.random() - 0.5) * 0.6);
                const outerR = 15 + Math.random() * 10;
                const innerR = outerR * 0.4;
                const ringCenter = (innerR + outerR) / 2;
                const ringWidth = (outerR - innerR) / 2;
                
                for (let y = 0; y < this.height; y++) {
                    for (let x = 0; x < this.width; x++) {
                        const dx = x - cx;
                        const dy = y - cy;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        
                        if (dist < outerR * 1.2) {
                            const ringDist = Math.abs(dist - ringCenter) / ringWidth;
                            const ringVal = Math.exp(-ringDist * ringDist * 1.5);
                            const coreVal = dist < innerR ? 
                                Math.exp(-Math.pow(dist / innerR, 2) * 2) * 0.5 : 0;
                            
                            const intensity = Math.max(ringVal, coreVal) * 200;
                            const idx = (y * this.width + x) * 4;
                            
                            // Add to appropriate channel
                            data[idx + region.species] = Math.min(255, 
                                data[idx + region.species] + intensity + (Math.random() - 0.5) * 10);
                        }
                    }
                }
            }
        }
        
        // Set alpha
        for (let i = 3; i < data.length; i += 4) {
            data[i] = 255;
        }
        
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
    
    /**
     * Paint a species at position
     */
    paint(x, y, species = 'prey', radius = 20, intensity = 180) {
        const gl = this.gl;
        const channel = { prey: 0, predator: 1, apex: 2 }[species] || 0;
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[this.currentBuffer]);
        const data = new Uint8Array(this.width * this.height * 4);
        gl.readPixels(0, 0, this.width, this.height, gl.RGBA, gl.UNSIGNED_BYTE, data);
        
        const px = Math.floor(x * this.width);
        const py = Math.floor((1 - y) * this.height);
        const innerR = radius * 0.4;
        const ringCenter = radius * 0.7;
        const ringWidth = radius * 0.3;
        
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > radius) continue;
                
                const nx = px + dx;
                const ny = py + dy;
                if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) continue;
                
                const ringDist = Math.abs(dist - ringCenter) / ringWidth;
                const ringVal = Math.exp(-ringDist * ringDist * 1.5);
                const coreVal = dist < innerR ?
                    Math.exp(-Math.pow(dist / innerR, 2) * 2) * 0.5 : 0;
                
                const value = Math.max(ringVal, coreVal) * intensity;
                const idx = (ny * this.width + nx) * 4;
                
                data[idx + channel] = Math.min(255, data[idx + channel] + value);
                data[idx + 3] = 255;
            }
        }
        
        gl.bindTexture(gl.TEXTURE_2D, this.textures[this.currentBuffer]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0,
                      gl.RGBA, gl.UNSIGNED_BYTE, data);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    
    setupInteraction() {
        let isDown = false;
        
        this.canvas.addEventListener('mousedown', (e) => {
            isDown = true;
            if (this.paintMode) {
                const rect = this.canvas.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                const y = (e.clientY - rect.top) / rect.height;
                this.paint(x, y, this.paintSpecies);
            }
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (isDown && this.paintMode) {
                const rect = this.canvas.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                const y = (e.clientY - rect.top) / rect.height;
                this.paint(x, y, this.paintSpecies, 15, 120);
            }
        });
        
        this.canvas.addEventListener('mouseup', () => isDown = false);
        this.canvas.addEventListener('mouseleave', () => isDown = false);
    }
    
    step() {
        const gl = this.gl;
        const prey = ECOSYSTEM_SPECIES.prey;
        const pred = ECOSYSTEM_SPECIES.predator;
        const apex = ECOSYSTEM_SPECIES.apex;
        
        const nextBuffer = 1 - this.currentBuffer;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[nextBuffer]);
        gl.viewport(0, 0, this.width, this.height);
        
        gl.useProgram(this.simProgram);
        
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textures[this.currentBuffer]);
        
        // Uniforms
        gl.uniform1i(gl.getUniformLocation(this.simProgram, 'u_state'), 0);
        gl.uniform2f(gl.getUniformLocation(this.simProgram, 'u_resolution'),
                     this.width, this.height);
        gl.uniform1f(gl.getUniformLocation(this.simProgram, 'u_dt'), this.timeScale);
        gl.uniform1f(gl.getUniformLocation(this.simProgram, 'u_time'), this.time);
        
        // Per-species params
        gl.uniform3f(gl.getUniformLocation(this.simProgram, 'u_R'),
                     prey.R, pred.R, apex.R);
        gl.uniform3f(gl.getUniformLocation(this.simProgram, 'u_T'),
                     prey.T, pred.T, apex.T);
        gl.uniform3f(gl.getUniformLocation(this.simProgram, 'u_mu'),
                     prey.growthParams.mu, pred.growthParams.mu, apex.growthParams.mu);
        gl.uniform3f(gl.getUniformLocation(this.simProgram, 'u_sigma'),
                     prey.growthParams.sigma, pred.growthParams.sigma, apex.growthParams.sigma);
        
        // Interaction params
        gl.uniform1f(gl.getUniformLocation(this.simProgram, 'u_predation'),
                     this.predationStrength);
        gl.uniform1f(gl.getUniformLocation(this.simProgram, 'u_benefit'),
                     this.benefitStrength);
        
        // Draw
        const posAttr = gl.getAttribLocation(this.simProgram, 'a_position');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
        gl.enableVertexAttribArray(posAttr);
        gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        
        this.currentBuffer = nextBuffer;
    }
    
    render() {
        const gl = this.gl;
        const prey = ECOSYSTEM_SPECIES.prey;
        const pred = ECOSYSTEM_SPECIES.predator;
        const apex = ECOSYSTEM_SPECIES.apex;
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        
        gl.useProgram(this.renderProgram);
        
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textures[this.currentBuffer]);
        
        gl.uniform1i(gl.getUniformLocation(this.renderProgram, 'u_state'), 0);
        gl.uniform2f(gl.getUniformLocation(this.renderProgram, 'u_resolution'),
                     this.width, this.height);
        gl.uniform1f(gl.getUniformLocation(this.renderProgram, 'u_time'), this.time);
        
        // Species colors
        gl.uniform3fv(gl.getUniformLocation(this.renderProgram, 'u_preyColor'), prey.color);
        gl.uniform3fv(gl.getUniformLocation(this.renderProgram, 'u_predColor'), pred.color);
        gl.uniform3fv(gl.getUniformLocation(this.renderProgram, 'u_apexColor'), apex.color);
        gl.uniform3fv(gl.getUniformLocation(this.renderProgram, 'u_background'), [0.02, 0.02, 0.05]);
        
        const posAttr = gl.getAttribLocation(this.renderProgram, 'a_position');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
        gl.enableVertexAttribArray(posAttr);
        gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    
    updateFPS() {
        this.frameCount++;
        const now = performance.now();
        const delta = now - this.lastFpsUpdate;
        
        if (delta >= 1000) {
            this.fps = Math.round(this.frameCount * 1000 / delta);
            this.frameCount = 0;
            this.lastFpsUpdate = now;
            
            const fpsEl = document.getElementById('fps');
            if (fpsEl) fpsEl.textContent = `FPS: ${this.fps}`;
        }
    }
    
    /**
     * Get population stats for each species
     */
    getPopulationStats() {
        const gl = this.gl;
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[this.currentBuffer]);
        const data = new Uint8Array(this.width * this.height * 4);
        gl.readPixels(0, 0, this.width, this.height, gl.RGBA, gl.UNSIGNED_BYTE, data);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        
        let prey = 0, pred = 0, apex = 0;
        const pixels = this.width * this.height;
        
        for (let i = 0; i < data.length; i += 4) {
            prey += data[i];
            pred += data[i + 1];
            apex += data[i + 2];
        }
        
        return {
            prey: (prey / pixels / 255).toFixed(4),
            predator: (pred / pixels / 255).toFixed(4),
            apex: (apex / pixels / 255).toFixed(4)
        };
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

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LeniaEcosystem, ECOSYSTEM_SPECIES, INTERACTION_MATRIX };
}
