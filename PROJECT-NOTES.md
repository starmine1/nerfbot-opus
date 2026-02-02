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
- ✅ **Lifespan System** - Move-or-die mechanic using flow vector analysis
- ✅ **Multi-Species Ecosystem** - Predator-prey dynamics (ecosystem.html)

### Known Issues & Performance

**Current State (2026-02-02):**
- Base Lenia is stable at 60 FPS @ 512x512
- Ecosystem mode adds overhead from 3-channel convolution

**Performance Roadmap:**

**Quick Wins (1-2h):**
- [ ] Dynamic loop bounds in shader based on actual R value
- [ ] Reduce default canvas size or add quality toggle
- [ ] Profile CPU vs GPU bottleneck with DevTools

**Medium Effort (4-8h):**
- [ ] WebGL 2.0 migration with compute shaders
- [ ] Separate simulation resolution from render resolution
- [ ] Implement spatial hashing to skip dead regions

**Other Issues:**
- Mobile touch support is basic
- GIF export uses gif.js - might be slow on large canvases

## Development Philosophy

Keep it simple. Make it beautiful. Don't over-engineer. The goal is "fuck me, that's good" not "technically impressive but boring."

## Links
- **Repo:** https://github.com/starmine1/nerfbot-opus
- **Live Demo:** https://starmine1.github.io/nerfbot-opus/
- **Ecosystem Demo:** https://starmine1.github.io/nerfbot-opus/ecosystem.html
- **Lenia paper:** https://arxiv.org/abs/1812.05433

## Session Log

### 2026-02-02 12:30 - Multi-Species Ecosystem (Session 2)

**Goal:** Implement predator-prey dynamics with three species

**Built:**
- `ecosystem.js` - Full ecosystem engine with:
  - Three species: Prey (R), Predator (G), Apex (B)
  - Interaction matrix: predation, benefits, crowding
  - Per-species Lenia parameters (R, T, μ, σ)
  - Real-time population stats
  - Paint mode per species
  - Parameter sliders for tuning

- `ecosystem.html` - Demo page with:
  - Full UI controls
  - Species selection for painting
  - Population stats overlay
  - Keyboard shortcuts (1/2/3 for species)

**Interaction System:**
```
Prey ←eats— Predator ←eats— Apex
     —benefits→      —benefits→
```

**Next:**
- [ ] Test and tune interaction strengths
- [ ] Add auto-spawn when species die out
- [ ] Population graphs over time
- [ ] Audio reactivity to ecosystem

---

### 2026-02-01 - Session 1 Summary
- Lifespan system with flow vector analysis
- Move-or-die mechanic (wobbling doesn't count)
- Stable 60 FPS performance
- All base features working

---

**Last updated:** 2026-02-02 12:45
**Status:** Multi-species ecosystem built, needs testing and tuning
