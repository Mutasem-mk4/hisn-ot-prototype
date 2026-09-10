# HISN-OT Design System

## Direction

The visual system centers on a state-bound desalination facility schematic. A distinct digital lane shows the operator, HISN command gate, evidence services, gateways, and controller ownership; a physical lane shows tanks, pump, treatment, valve, and water flow. The interface combines an industrial safety instrument with an editorial data story. It is dense, quiet, and decisive.

Physical scene: an OT security lead and a judging panel read a 27-inch display in a controlled operations room under low ambient light, where rapid distinction between safe telemetry, uncertain context, and genuine danger matters more than decoration.

## Color strategy

Use a restrained mineral-dark palette with full-palette semantics. All colors use OKLCH.

- Obsidian canvas: `oklch(0.145 0.012 72)`
- Basalt surface: `oklch(0.19 0.014 72)`
- Raised graphite: `oklch(0.235 0.016 72)`
- Warm sand text: `oklch(0.9 0.025 78)`
- Muted mineral text: `oklch(0.67 0.022 72)`
- Copper action: `oklch(0.69 0.13 48)`
- Trusted cyan: `oklch(0.75 0.115 205)`
- Uncertain amber: `oklch(0.79 0.145 82)`
- Containment red: `oklch(0.63 0.19 28)`
- Safe green: `oklch(0.72 0.13 155)`

Red appears only for a failed proof, a dangerous request, or containment. Cyan describes live trusted network activity. Copper marks human action and editorial emphasis.

## Typography

Use the local system UI stack for controls and prose. Use a local monospace stack for measurements, event codes, timestamps, and correlation identifiers. Maintain a compact fixed product scale with strong weight contrast. Body prose is capped at 72 characters.

## Geometry and depth

The facility view uses code-native SVG: distinct physical/digital routes, clipped corners, fine one-pixel rules, and nested gate geometry. Depth comes from tonal planes and real topology, not blurred glass. Corners stay mostly square with 2 to 8 pixel radii reserved for controls and compact status marks.

## Layout

Judge Mode uses a wide facility instrument with a component inspector, followed by compact process and evidence summaries. Below 1050 pixels, time, setpoint, and presentation controls stack. On mobile, the SVG remains available in a component-owned horizontal viewport while the inspector and supporting instruments stack below it.

## Components

- Wordmark: custom fortress gate symbol paired with HISN-OT lettering.
- Facility asset: selectable SVG equipment with state-derived measurement and recent events.
- Process rail: requested and actual pressure on separate visual tracks.
- Event ledger: persisted event index, timestamp, state, and presenter cue.
- Evidence call: purpose, request state, redacted response, provenance, latency, timestamp, and correlation ID.
- Decision seal: authoritative state, failed policy references, and recovery conditions.
- Control deck: separate simulation-time and pump-setpoint groups, plus Step, Back, Reset, Explain, and Present with 44-pixel minimum targets.

## Motion

Only state-linked values animate. Pump rotation follows modeled speed, water markers follow modeled flow, evidence routes follow workflow phase, and containment paths follow gateway/controller state. Pause freezes the local clock and corresponding motion. Reduced-motion mode removes motion while preserving every label and state change.

## Content rules

Use direct operational language. Never expose hidden chain-of-thought. Distinguish recommendation, deterministic evaluation, authoritative decision, and enforcement. Do not use em dashes, emojis, decorative badges, or unsupported certainty.
