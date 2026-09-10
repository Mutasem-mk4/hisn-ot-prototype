# Interface design system

## Operating scene

A hackathon judge views HISN-OT on a laptop or projector in a bright presentation room. The interface must communicate the safety result in seconds, remain readable at a distance, and keep implementation evidence available without turning the first view into a control room.

## Design direction

HISN-OT is a calm industrial instrument. The visual system is restrained, dark, and high contrast. Sand marks the recommended demonstration, cyan identifies trusted evidence and active paths, amber signals pending attention, and red is reserved for unsafe requests or failed-safe outcomes.

The interface uses square geometry and thin dividers to suggest operational equipment. It avoids decorative cards, glass effects, excessive motion, and color without semantic meaning.

## Tokens

The canonical tokens are defined in `src/web/styles.css` under `@layer tokens`.

- Surfaces: `--ink-0`, `--ink-1`, `--ink-2`, and `--ink-3`
- Text: `--text` and `--muted`
- Actions and states: `--sand`, `--copper`, `--cyan`, `--amber`, `--red`, and `--green`
- Dividers: `--line` and `--line-bright`
- Type: `--sans` for explanations and controls, `--mono` for telemetry, provenance, identifiers, and compact labels

Use the existing OKLCH values. Do not introduce isolated hexadecimal colors in components.

## Judge-mode hierarchy

The Demo screen follows this order:

1. Problem statement and attack context
2. Honest provider provenance
3. One recommended attack demonstration with two optional comparisons
4. Decision and physical outcome
5. Four-step protection path
6. Agent summary and recorded observations
7. Expandable execution trace and digital twin

The outcome panel stays above the detailed proof path so the final decision remains visible at 1366×768 and 1280×720 presentation sizes.

## Interaction rules

- Only **Run attack demonstration** uses the primary sand treatment.
- Safe and read-only scenarios remain secondary comparisons.
- Playback, stepping, reset, presenter cues, and full-screen mode stay inside **Demo controls**.
- The complete agent journal and facility schematic use native disclosure controls.
- Every interactive control needs a visible keyboard focus state and a minimum 44-pixel touch target on narrow screens.
- Motion communicates state only. Reduced-motion preferences must disable nonessential animation.

## Provenance language

Never imply that simulated evidence is a live Nokia response. Show the active source beside the claim using the application vocabulary: `LANGGRAPH AGENT`, `NOKIA SANDBOX`, `LIVE`, `FALLBACK`, `UNAVAILABLE`, `SIMULATED`, and `IMPLEMENTED LOCALLY`.

The AI selects and evaluates evidence. Deterministic policy authorizes control. The digital twin visualizes the physical result. Those responsibilities must remain distinct in layout and copy.

## Responsive behavior

- Above 1100 pixels, scenario actions, outcomes, and agent stages use horizontal comparison layouts.
- At 800 pixels and below, scenario actions stack and the protection path becomes a two-column sequence.
- At 560 pixels and below, proof, outcome, and agent sections become single-column flows.
- At 1050 pixels and below, primary navigation becomes a bottom navigation bar.
- No supported viewport from 360 to 1920 pixels may scroll horizontally.

Typography stays fixed and compact for product use. Layout changes at content breakpoints instead of shrinking controls below readable or touchable sizes.

## Accessibility

Target WCAG 2.2 AA. Maintain complete keyboard operation, visible focus, sentence-case explanations, color-independent status text, screen-reader status announcements, and reduced-motion support. Automated browser checks use Axe and run across desktop, projector, tablet, and mobile projects.
