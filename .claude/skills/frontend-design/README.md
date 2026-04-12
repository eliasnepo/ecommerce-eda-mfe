# Frontend Design Skill

> Create distinctive, production-grade frontend interfaces with high design quality

## What It Does

Guides the creation of polished, visually striking frontend code that avoids generic AI aesthetics:
- Commits to a bold, intentional aesthetic direction before writing a single line
- Selects characterful typography (no Arial, Inter, or system fonts)
- Applies cohesive color palettes with dominant hues and sharp accents
- Adds motion and micro-interactions (CSS animations, Motion library for React)
- Uses spatial composition — asymmetry, overlap, generous negative space
- Generates atmosphere with gradients, noise textures, shadows, and decorative layers

## When to Use

- "Build a product listing page"
- "Create a cart UI component"
- "Design the shell layout for the MFE host"
- "Make a search bar with autocomplete"
- Any request to build a web component, page, or application

## Key Concepts

### Aesthetic Direction

The skill picks an extreme and executes it precisely. Examples of directions:

| Direction | Characteristics |
|-----------|----------------|
| Brutally minimal | One typeface, two colors, nothing decorative |
| Retro-futuristic | Monospace fonts, scanlines, neon on dark |
| Editorial/magazine | Large display type, editorial grid, pull quotes |
| Luxury/refined | Serif fonts, gold accents, generous whitespace |
| Playful/toy-like | Rounded corners, bright primaries, bouncy motion |
| Industrial | Tight grid, utilitarian spacing, stark contrast |

### What It Avoids

| Anti-pattern | Why |
|--------------|-----|
| Purple gradients on white | Overused AI default |
| Inter / Roboto / Arial | No personality |
| Centered hero + card grid | Predictable layout |
| Equal color distribution | Timid palettes lack identity |
| Scattered micro-interactions | Creates noise, not delight |

## Example Usage

```
You: Build a product search bar for the Catalog MFE

Claude: [Chooses aesthetic direction — e.g. refined editorial]
        [Selects display + body font pair]
        [Defines CSS variables for palette]
        [Implements staggered reveal animation on load]
        [Adds hover state with precise transition timing]
        [Returns production-ready React component]
```

## Output Characteristics

- **Framework-aware** — HTML/CSS/JS, React, Vue depending on context
- **Production-grade** — not prototypes; handles edge cases and empty states
- **Cohesive** — every detail (spacing, shadow, easing) serves the aesthetic
- **Accessible** — contrast, focus states, and semantic markup included

## Related Skills

- `clean-code` — refactor component logic after design is done
- `test-quality` — write tests for interactive component behavior
- `performance-smell-detection` — catch expensive render patterns

## Project Context

In this repo the MFE layer (Phases 4–5) uses:
- **React 18** + **TypeScript 5**
- **Webpack 5 Module Federation** (Shell host + Catalog/Cart remotes)
- **Apollo Client 3.x** for GraphQL (Catalog MFE)
- **Tailwind CSS 3.x** for utility styling
- Gateway entry point at `http://localhost:8080`
