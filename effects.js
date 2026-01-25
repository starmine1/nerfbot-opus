/**
 * POST-PROCESSING EFFECTS
 * 
 * Beautiful visual enhancements for Lenia
 */

// Bloom/Glow shader
const BLOOM_SHADER = `
    precision highp float;
    
    uniform sampler2D u_texture;
    uniform vec2 u_resolution;
    uniform vec2 u_direction;
    uniform float u_sigma;
    
    varying vec2 v_texCoord;
    
    void main() {
        vec2 texelSize = 1.0 / u_resolution;
        vec4 color = vec4(0.0);
        float totalWeight = 0.0;
        
        // Gaussian blur
        for (float i = -8.0; i <= 8.0; i += 1.0) {
            float weight = exp(-i * i / (2.0 * u_sigma * u_sigma));
            vec2 offset = u_direction * texelSize * i;
            color += texture2D(u_texture, v_texCoord + offset) * weight;
            totalWeight += weight;
        }
        
        gl_FragColor = color / totalWeight;
    }
`;

// Final composite shader with all effects
const COMPOSITE_SHADER = `
    precision highp float;
    
    uniform sampler2D u_scene;
    uniform sampler2D u_bloom;
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform float u_bloomStrength;
    uniform float u_chromaticAberration;
    uniform float u_vignette;
    
    varying vec2 v_texCoord;
    
    vec3 sampleWithCA(sampler2D tex, vec2 uv, float amount) {
        vec2 center = uv - 0.5;
        float dist = length(center);
        vec2 dir = center / max(dist, 0.0001);
        
        float r = texture2D(tex, uv + dir * amount * dist).r;
        float g = texture2D(tex, uv).g;
        float b = texture2D(tex, uv - dir * amount * dist).b;
        
        return vec3(r, g, b);
    }
    
    void main() {
        // Chromatic aberration
        vec3 scene = sampleWithCA(u_scene, v_texCoord, u_chromaticAberration);
        vec3 bloom = texture2D(u_bloom, v_texCoord).rgb;
        
        // Combine scene with bloom
        vec3 color = scene + bloom * u_bloomStrength;
        
        // Subtle film grain
        float noise = fract(sin(dot(v_texCoord * u_resolution + u_time, vec2(12.9898, 78.233))) * 43758.5453);
        color += (noise - 0.5) * 0.02;
        
        // Vignette
        vec2 center = v_texCoord - 0.5;
        float vignette = 1.0 - dot(center, center) * u_vignette;
        color *= vignette;
        
        // Slight color grading - lift shadows, compress highlights
        color = pow(color, vec3(0.95));
        color = color / (color + 0.5) * 1.5;
        
        gl_FragColor = vec4(color, 1.0);
    }
`;

// Color palette presets
const COLOR_PALETTES = {
    aurora: {
        name: 'Aurora',
        colors: ['#00ff88', '#00aaff', '#ff00ff', '#ff8800'],
        background: '#050515'
    },
    fire: {
        name: 'Fire',
        colors: ['#ff3300', '#ff8800', '#ffff00', '#ffffff'],
        background: '#100505'
    },
    ocean: {
        name: 'Ocean',
        colors: ['#001133', '#0066aa', '#00aaff', '#aaffff'],
        background: '#000815'
    },
    neon: {
        name: 'Neon',
        colors: ['#ff00ff', '#00ffff', '#ffff00', '#ff00ff'],
        background: '#0a0015'
    },
    mono: {
        name: 'Mono',
        colors: ['#ffffff', '#888888', '#ffffff', '#aaaaaa'],
        background: '#000000'
    },
    plasma: {
        name: 'Plasma',
        colors: ['#ff0066', '#6600ff', '#00ffcc', '#ffff00'],
        background: '#0f0510'
    },
    forest: {
        name: 'Forest',
        colors: ['#004400', '#008800', '#00cc44', '#88ff88'],
        background: '#020804'
    },
    cosmic: {
        name: 'Cosmic',
        colors: ['#6600ff', '#ff0088', '#00aaff', '#ffffff'],
        background: '#050008'
    }
};

// Hex to RGB converter
function hexToRGB(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255
    ] : [0, 0, 0];
}

// Enhanced render shader with palette support
const ENHANCED_RENDER_SHADER = `
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
        // Smooth 4-color gradient
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
        
        // Non-linear mapping for visual interest
        float v = pow(state, 0.7);
        
        // Gradient sampling for edge detection
        vec2 texelSize = 1.0 / u_resolution;
        
        float dx = texture2D(u_state, v_texCoord + vec2(texelSize.x, 0.0)).r - 
                   texture2D(u_state, v_texCoord - vec2(texelSize.x, 0.0)).r;
        float dy = texture2D(u_state, v_texCoord + vec2(0.0, texelSize.y)).r - 
                   texture2D(u_state, v_texCoord - vec2(0.0, texelSize.y)).r;
        
        float edge = length(vec2(dx, dy)) * 10.0;
        float laplacian = texture2D(u_state, v_texCoord + vec2(texelSize.x, 0.0)).r +
                          texture2D(u_state, v_texCoord - vec2(texelSize.x, 0.0)).r +
                          texture2D(u_state, v_texCoord + vec2(0.0, texelSize.y)).r +
                          texture2D(u_state, v_texCoord - vec2(0.0, texelSize.y)).r -
                          4.0 * state;
        
        // Activity indicator (high laplacian = changing)
        float activity = abs(laplacian) * 50.0;
        
        // Color from palette
        vec3 baseColor = palette(v);
        
        // Add edge highlighting
        vec3 edgeColor = palette(0.9) * edge;
        
        // Subtle activity glow
        vec3 activityGlow = vec3(1.0) * activity * 0.3;
        
        // Combine
        vec3 color = mix(u_background, baseColor + edgeColor + activityGlow, 
                         smoothstep(0.0, 0.1, v + edge * 0.5));
        
        // Subtle animation - breathing effect on edges
        float breath = sin(u_time * 2.0) * 0.5 + 0.5;
        color += edgeColor * breath * 0.2;
        
        gl_FragColor = vec4(color, 1.0);
    }
`;

// Export
if (typeof window !== 'undefined') {
    window.BLOOM_SHADER = BLOOM_SHADER;
    window.COMPOSITE_SHADER = COMPOSITE_SHADER;
    window.ENHANCED_RENDER_SHADER = ENHANCED_RENDER_SHADER;
    window.COLOR_PALETTES = COLOR_PALETTES;
    window.hexToRGB = hexToRGB;
}
