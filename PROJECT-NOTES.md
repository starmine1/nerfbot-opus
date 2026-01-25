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
- ✅ Keyboard shortcuts (space, r, c, d, 1-6, p)
- ✅ Audio reactivity - creatures pulse with music/microphone
- ✅ Demo mode - auto-cycles through creatures and palettes
- ✅ Enhanced rendering with edge glow, breathing effects

### Known Issues
- Performance could be better (convolution is O(R²) per pixel)
  - Could use FFT for O(n log n) but adds complexity
  - Current approach is "good enough" and simpler
- Mobile touch support is basic
- No GIF export yet (would be cool for sharing)

## Development Philosophy

Keep it simple. Make it beautiful. Don't over-engineer. The goal is "fuck me, that's good" not "technically impressive but boring."

## Links
- **Repo:** https://github.com/starmine1/nerfbot-opus
- **Live Demo:** https://starmine1.github.io/nerfbot-opus/
- **Lenia paper:** https://arxiv.org/abs/1812.05433

---

**Last updated:** 2026-01-25 21:29
**Status:** Live and deployed, audio reactivity working, demo mode complete
