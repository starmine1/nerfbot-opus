/**
 * LENIA CREATURE TEMPLATES
 * 
 * These are known stable creatures discovered through evolutionary search.
 * Each creature is defined by its initial pattern and optimal parameters.
 * 
 * The patterns are stored as base64-encoded grayscale images
 * or as mathematical descriptions.
 */

const CREATURE_TEMPLATES = {
    // Orbium - the classic Lenia glider
    orbium: {
        name: 'Orbium',
        description: 'A smooth, spherical glider that moves diagonally',
        params: {
            R: 13,
            T: 10,
            mu: 0.15,
            sigma: 0.015,
            b: [1, 1, 1]
        },
        // Pattern generator function
        generate: (size = 64) => {
            const pattern = new Float32Array(size * size);
            const cx = size / 2;
            const cy = size / 2;
            const r1 = size * 0.35;
            const r2 = size * 0.15;
            
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    const dx = x - cx;
                    const dy = y - cy;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    // Ring pattern with inner void
                    let value = 0;
                    if (dist < r1) {
                        value = Math.exp(-Math.pow((dist - r2) / (r1 * 0.3), 2));
                    }
                    
                    pattern[y * size + x] = value;
                }
            }
            return pattern;
        }
    },
    
    // Geminium - a splitting/merging creature
    geminium: {
        name: 'Geminium',
        description: 'Twins that orbit each other',
        params: {
            R: 10,
            T: 10,
            mu: 0.14,
            sigma: 0.014,
            b: [1, 0.5, 0.5]
        },
        generate: (size = 64) => {
            const pattern = new Float32Array(size * size);
            const offset = size * 0.15;
            
            // Two overlapping circles
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    const dx1 = x - (size/2 - offset);
                    const dy1 = y - size/2;
                    const dx2 = x - (size/2 + offset);
                    const dy2 = y - size/2;
                    
                    const r = size * 0.25;
                    const d1 = Math.sqrt(dx1*dx1 + dy1*dy1);
                    const d2 = Math.sqrt(dx2*dx2 + dy2*dy2);
                    
                    let v1 = d1 < r ? Math.exp(-Math.pow(d1 / (r * 0.5), 2)) : 0;
                    let v2 = d2 < r ? Math.exp(-Math.pow(d2 / (r * 0.5), 2)) : 0;
                    
                    pattern[y * size + x] = Math.max(v1, v2);
                }
            }
            return pattern;
        }
    },
    
    // Trilobite - an elongated crawler
    trilobite: {
        name: 'Trilobite',
        description: 'A segmented crawler with bilateral symmetry',
        params: {
            R: 15,
            T: 12,
            mu: 0.13,
            sigma: 0.013,
            b: [0.8, 1, 0.8]
        },
        generate: (size = 64) => {
            const pattern = new Float32Array(size * size);
            const segments = 5;
            const cx = size / 2;
            
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    let value = 0;
                    
                    for (let s = 0; s < segments; s++) {
                        const sy = (s + 0.5) * (size * 0.8) / segments + size * 0.1;
                        const segmentR = (size * 0.15) * (1 - Math.abs(s - segments/2) / segments);
                        
                        const dx = x - cx;
                        const dy = y - sy;
                        const dist = Math.sqrt(dx*dx + dy*dy);
                        
                        if (dist < segmentR) {
                            value = Math.max(value, Math.exp(-Math.pow(dist / (segmentR * 0.6), 2)));
                        }
                    }
                    
                    pattern[y * size + x] = value;
                }
            }
            return pattern;
        }
    },
    
    // Scutium - a shield-shaped creature
    scutium: {
        name: 'Scutium',
        description: 'A defensive shield that pulses while moving',
        params: {
            R: 12,
            T: 8,
            mu: 0.16,
            sigma: 0.016,
            b: [0.5, 1, 1]
        },
        generate: (size = 64) => {
            const pattern = new Float32Array(size * size);
            const cx = size / 2;
            const cy = size / 2;
            
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    const dx = (x - cx) / size;
                    const dy = (y - cy) / size;
                    
                    // Shield shape: wider at bottom, pointed at top
                    const r = 0.35 - dy * 0.15;
                    const dist = Math.abs(dx) / r;
                    const yDist = Math.abs(dy) / 0.35;
                    
                    if (dist < 1 && yDist < 1) {
                        const edge = 1 - Math.max(dist, yDist);
                        pattern[y * size + x] = Math.pow(edge, 1.5);
                    }
                }
            }
            return pattern;
        }
    },
    
    // Pulsar - an oscillating pattern
    pulsar: {
        name: 'Pulsar',
        description: 'A stationary creature that breathes in place',
        params: {
            R: 10,
            T: 10,
            mu: 0.145,
            sigma: 0.0145,
            b: [1, 0.7, 1]
        },
        generate: (size = 64) => {
            const pattern = new Float32Array(size * size);
            const cx = size / 2;
            const cy = size / 2;
            
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    const dx = x - cx;
                    const dy = y - cy;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const angle = Math.atan2(dy, dx);
                    
                    // Create a pattern with radial symmetry
                    const r1 = size * 0.2;
                    const r2 = size * 0.35;
                    
                    let value = 0;
                    if (dist >= r1 && dist <= r2) {
                        const wave = Math.sin(angle * 6) * 0.5 + 0.5;
                        value = wave * Math.exp(-Math.pow((dist - (r1 + r2)/2) / ((r2-r1)*0.4), 2));
                    } else if (dist < r1) {
                        value = Math.exp(-Math.pow(dist / (r1 * 0.5), 2)) * 0.5;
                    }
                    
                    pattern[y * size + x] = value;
                }
            }
            return pattern;
        }
    },
    
    // Swimmer - a jellyfish-like creature
    swimmer: {
        name: 'Swimmer',
        description: 'A jellyfish that propels itself through pulsing',
        params: {
            R: 14,
            T: 11,
            mu: 0.135,
            sigma: 0.0135,
            b: [1, 1, 0.8]
        },
        generate: (size = 64) => {
            const pattern = new Float32Array(size * size);
            const cx = size / 2;
            const cy = size * 0.4;
            
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    const dx = x - cx;
                    const dy = y - cy;
                    
                    // Bell shape
                    const bellR = size * 0.3;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    let value = 0;
                    
                    if (dy < 0 && dist < bellR) {
                        value = Math.exp(-Math.pow(dist / (bellR * 0.6), 2));
                    }
                    
                    // Tentacles
                    if (dy > 0 && dy < size * 0.5) {
                        const tentacleSpacing = size * 0.15;
                        const tentacleWidth = size * 0.05;
                        
                        for (let t = -1; t <= 1; t++) {
                            const tx = t * tentacleSpacing;
                            const tentacleDist = Math.abs(dx - tx);
                            
                            if (tentacleDist < tentacleWidth) {
                                const wave = Math.sin(dy * 0.3 + t * 0.5) * tentacleWidth * 0.3;
                                const adjustedDist = Math.abs(dx - tx - wave);
                                
                                if (adjustedDist < tentacleWidth) {
                                    const tv = Math.exp(-Math.pow(adjustedDist / (tentacleWidth * 0.6), 2));
                                    const falloff = 1 - dy / (size * 0.5);
                                    value = Math.max(value, tv * falloff * 0.7);
                                }
                            }
                        }
                    }
                    
                    pattern[y * size + x] = value;
                }
            }
            return pattern;
        }
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.CREATURE_TEMPLATES = CREATURE_TEMPLATES;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CREATURE_TEMPLATES;
}
