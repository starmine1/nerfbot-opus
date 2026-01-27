# nerfbot-opus - Project Notes

## What The Fuck Is This?

A **Lenia** implementation - continuous cellular automaton that creates lifelike digital creatures. Think Game of Life but smooth, organic, and actually interesting.

## Why This Exists

Mission from Nerf: build something that makes a jaded dev say "fuck me, that's good." Not cutting-edge fancy shit - just good shit that's interesting and beautiful.

## The Technical Bits

### Core Tech
- **WebGL 1.0** for GPU acceleration (compatibility over fancy features)
- **Double-buffered textures** for ping-pong rendering
- **Convolution kernel** using Gaussian bell curve for neighborhood calculations
- **Growth function** controls how cells live/die based on neighbors

### The Math (Simplified)
1. For each pixel, look at neighbors in a circular radius
2. Weight them by distance (Gaussian kernel)
3. Calculate "potential" (weighted sum)
4. Apply growth function: cells thrive in a "Goldilocks zone" of neighbor density
5. Update cell state based on growth

### Creatures
Each creature is defined by parameters:
- **R** (radius) - how far they "see"
- **T** (time step) - how fast they evolve  
- **m** (mean), **s** (std dev) - defines the growth function bell curve
- **h** (activation) - height of the curve

Current roster: Orbium, Geminium, Trilobite, Scutium, Pulsar, Swimmer

### Features Built
- ✅ WebGL-accelerated simulation
- ✅ 6 creature templates with unique behaviors
- ✅ 8 color palettes (Aurora, Fire, Ocean, Neon, Mono, Plasma, Forest, Cosmic)
- ✅ Interactive paint mode - draw new creatures
- ✅ Keyboard shortcuts (space, r, c, d, g, m, t, s, l, [, ], 1-6, p)
- ✅ Audio reactivity - creatures pulse with music/microphone
- ✅ Demo mode - auto-cycles through creatures and palettes
- ✅ Enhanced rendering with edge glow, breathing effects
- ✅ **GIF recording** - capture 5 seconds of animation and export (G key or button)
- ✅ **Mutation mode** - parameters slowly evolve in real-time, discovering new behaviors organically (M key or button)
- ✅ **PNG Screenshot** - instant capture of beautiful moments (S key or button)
- ✅ **Speed Control** - slow-motion (0.5x), normal (1x), or fast-forward (2x) using buttons or [ / ] keys
- ✅ **Trail Effect** - motion blur/ghosting for more organic, flowing visuals (T key or button)
- ✅ **Lab Mode** - real-time parameter tweaking with sliders for R, T, μ, σ (L key or button)

### Known Issues & Performance

**Current State (2026-01-28):**
- Performance is **UNACCEPTABLE** at 1-2 FPS on standard hardware
- Simple optimizations (0.25 scale, stride-2 sampling) provide minimal improvement
- This is NOT "good enough" - it's unusable

**Root Cause:**
- Convolution is O(R²) per pixel: ~625 samples × 400K pixels = 250M samples/frame
- Shader loop hardcoded to -12..12 range even when R is smaller
- CPU overhead from requestAnimationFrame and state updates
- No spatial optimization (quadtree, hierarchical, etc.)

**Performance Roadmap:**

**Quick Wins (1-2h):**
- [ ] Dynamic loop bounds in shader based on actual R value
- [ ] Reduce default canvas size or add quality toggle
- [ ] Profile CPU vs GPU bottleneck with DevTools
- [ ] Test on different hardware to isolate issue

**Medium Effort (4-8h):**
- [ ] WebGL 2.0 migration with compute shaders
- [ ] Separate simulation resolution from render resolution (sim at 128x128, display at full res)
- [ ] Implement spatial hashing to skip dead regions
- [ ] Multi-pass rendering: rough sim → detail refinement

**Nuclear Option (12h+):**
- [ ] FFT-based convolution for O(n log n) complexity
- [ ] Migrate to WebGPU for modern compute capabilities
- [ ] Parallel multi-resolution simulation

**Other Issues:**
- Mobile touch support is basic
- GIF export uses gif.js - might be slow on large canvases

## Development Philosophy

Keep it simple. Make it beautiful. Don't over-engineer. The goal is "fuck me, that's good" not "technically impressive but boring."

## Links
- **Repo:** https://github.com/starmine1/nerfbot-opus
- **Live Demo:** https://starmine1.github.io/nerfbot-opus/
- **Lenia paper:** https://arxiv.org/abs/1812.05433

## Session Log

### 2026-01-28 02:00 - Performance Investigation
**Goal:** Fix performance issues (1-2 FPS → smooth 60 FPS)

**Attempted:**
- Reduced resolution scale from 0.5 to 0.25 (4x fewer pixels)
- Added stride-2 sampling in shader loops (75% fewer samples per pixel)
- Combined: theoretical 16x speedup

**Results:**
- Minimal improvement (1 FPS → 2 FPS in some tests)
- Browser/server caching made testing painful
- Changes pushed to GitHub but need proper benchmarking

**Conclusion:**
- Performance issues run deeper than simple optimizations
- Needs proper profiling to identify CPU vs GPU bottleneck
- Consider WebGL 2.0 or WebGPU migration
- Project is beautiful but UNUSABLE at current performance

**Next Steps:**
- Profile with Chrome DevTools Performance tab
- Test on different hardware (GPU-bound vs CPU-bound?)
- Consider separate simulation/render resolutions
- Maybe this needs a from-scratch WebGL 2.0 rewrite

---

**Last updated:** 2026-01-28 02:35
**Status:** Feature-complete but performance-broken - needs optimization work before it's actually usable
