# Performance Analysis & Optimization Guide

## Current Problem

**Symptom:** 1-2 FPS on standard hardware (unusable)  
**Expected:** 30-60 FPS (smooth, responsive)

## Bottleneck Analysis

### Theoretical Complexity

```
Pixels: 620 × 639 = 396,180 pixels
Kernel samples per pixel: 25 × 25 = 625 (hardcoded loop -12..12)
Total samples per frame: 396,180 × 625 = 247,612,500 samples
At 1 FPS: ~248 million samples/second
At 60 FPS target: ~15 BILLION samples/second (unrealistic)
```

### Why It's Slow

1. **Massive Sample Count**
   - Every pixel samples 625 neighbors
   - Most are outside the actual kernel radius R (wasted work)
   - No spatial culling or optimization

2. **Shader Loop Bounds**
   ```glsl
   for (int dy = -12; dy <= 12; dy++) {  // Hardcoded!
       for (int dx = -12; dx <= 12; dx++) {
           // Even when R=8, we loop 25x25
       }
   }
   ```

3. **No Spatial Optimization**
   - Every pixel computed every frame
   - Dead regions (all zeros) still processed
   - No hierarchical simulation

4. **Potential CPU Overhead**
   - JavaScript state management
   - requestAnimationFrame overhead
   - Texture uploads/downloads

## Optimization Strategies

### Level 1: Quick Wins (1-2 hours)

**A. Dynamic Loop Bounds**
```glsl
// Instead of hardcoded -12..12, use ceil(u_R)
int maxOffset = int(ceil(u_R));
for (int dy = -maxOffset; dy <= maxOffset; dy++) {
    for (int dx = -maxOffset; dx <= maxOffset; dx++) {
```

**Impact:** For R=8, reduces from 625 to 289 samples (2.2x speedup)

**B. Stratified Sampling**
```glsl
// Sample every Nth pixel in a pattern
for (int dy = -12; dy <= 12; dy += stride) {
    for (int dx = -12; dx <= 12; dx += stride) {
```

**Impact:** stride=2 → 75% fewer samples (4x speedup)  
**Tradeoff:** Slightly less accurate, might affect creature stability

**C. Separate Sim/Render Resolution**
```javascript
simWidth = Math.floor(clientWidth * 0.25);   // 256×256
renderWidth = Math.floor(clientWidth * 1.0);  // 1024×1024
// Simulate at low-res, upscale for display
```

**Impact:** 16x fewer pixels to simulate (16x speedup)  
**Tradeoff:** Slightly blockier look (use bilinear filtering)

### Level 2: Medium Effort (4-8 hours)

**D. WebGL 2.0 Compute Shaders**
- Use transform feedback or compute shaders
- Better GPU utilization
- More modern pipeline

**E. Multi-Pass Rendering**
```
Pass 1: Rough simulation at low-res (128×128)
Pass 2: Detail refinement at edges
Pass 3: Upscale to display resolution
```

**F. Spatial Hashing**
- Track active regions
- Skip processing dead zones
- Dynamic quality based on activity

### Level 3: Nuclear Options (12+ hours)

**G. FFT-Based Convolution**
```
Convolution theorem: f ⊗ g = F⁻¹(F(f) · F(g))
Complexity: O(n²) → O(n log n)
```

- Use WebGL FFT library
- Massive speedup for large kernels
- Adds complexity and dependencies

**H. WebGPU Migration**
- Modern GPU compute API
- Better performance primitives
- Requires browser support (Chrome/Edge 94+)

**I. Parallel Multi-Resolution**
- Simulate at multiple scales simultaneously
- Coarse for global patterns
- Fine for local details
- Combine results

## Profiling Checklist

Before optimizing further, profile to find the ACTUAL bottleneck:

```javascript
// Add to update loop:
const gpuTimeStart = performance.now();
gl.finish();  // Wait for GPU
const gpuTime = performance.now() - gpuTimeStart;

const cpuTimeStart = performance.now();
// CPU work here
const cpuTime = performance.now() - cpuTimeStart;

console.log(`GPU: ${gpuTime}ms, CPU: ${cpuTime}ms`);
```

**If GPU-bound:** Optimize shaders (reduce samples, simpler math)  
**If CPU-bound:** Optimize JavaScript (reduce state updates, batch operations)

## Recommended Next Steps

1. **Profile first** - Identify CPU vs GPU bottleneck
2. **Start with Level 1 optimizations** - Quick wins, low risk
3. **Test on multiple devices** - Desktop vs laptop vs integrated GPU
4. **Add quality toggle** - Let users choose performance vs beauty
5. **Consider WebGL 2.0 rewrite** - If serious about performance

## Hardware Considerations

**Target Specs:**
- **Minimum:** Intel HD 4000 (2012), 30 FPS
- **Recommended:** GTX 1060 / RX 580 (2016), 60 FPS
- **Ideal:** Any modern discrete GPU, 60 FPS locked

**Current Performance:**
- **Tested:** VM (possibly software rendering?), 1-2 FPS
- **Needs testing:** Real hardware with decent GPU

## The Harsh Truth

The current implementation is **fundamentally unscalable**. Even with all Level 1 optimizations, you might hit 10-20 FPS. To get smooth 60 FPS, you probably need:

- WebGL 2.0 compute shaders, OR
- Dramatic resolution reduction (sim at 128×128), OR
- FFT-based convolution, OR
- Complete rewrite with spatial optimization

**But:** Sometimes "good enough" is fine. If the goal is aesthetic beauty and art, not real-time interaction, maybe 15-30 FPS is acceptable with a disclaimer.

---

*Written during 2am work session, 2026-01-28*  
*By: Nerfbot, fighting the good fight against shitty performance*
