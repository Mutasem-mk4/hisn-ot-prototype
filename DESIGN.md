# Interface design system

## Operating scene

A hackathon judge views HISN-OT on a laptop or projector in a bright presentation room. The interface must communicate the safety result in seconds, remain readable at a distance, and keep implementation evidence available without turning the first view into a control room.

## Design direction

HISN-OT uses a warm light background, dark readable text, and a restrained deep-green primary action. The presentation room is bright, so broad dark panels and luminous status colors have been replaced with quiet surfaces and thin neutral dividers.

The demonstration and result share one rounded container. Technical details use native disclosure rows. Layout overrides live in `src/web/presentation.css`; semantic color tokens remain in `src/web/styles.css`.

The hero explains the required technology in one sentence: a LangGraph agent checks Nokia/CAMARA network context before a command can change the plant. References to the 60% authorization boundary must call it the command hard limit so it remains distinct from the 42–52% observed safe band.

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

1. Problem statement
2. One attack demonstration with two quiet comparison actions
3. Decision and four physical-outcome facts
4. Collapsed reasoning and evidence disclosure
5. Collapsed facility and process disclosure
6. Compact, honest provider provenance

The outcome panel stays above the detailed proof path so the final decision remains visible at 1366×768 and 1280×720 presentation sizes.

## Interaction rules

- Only **Run attack demonstration** uses the deep-green primary treatment.
- Safe and read-only scenarios remain secondary comparisons.
- Playback, stepping, reset, presenter cues, and full-screen mode stay inside **Demo controls**.
- **How was this decision made?** reveals the protection path and agent workflow. The facility schematic remains in a separate technical disclosure.
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
