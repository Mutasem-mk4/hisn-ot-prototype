# HISN-OT Design System

## Direction

The visual system is the Network Proof Lattice: a spatial gate that assembles Identity, Presence, Connectivity, and Physical Safety evidence around a held command, then resolves into a containment topology. The interface combines an industrial safety instrument with an editorial data story. It is dense, quiet, and decisive.

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

The lattice uses code-native SVG: orthogonal routes, clipped corners, fine one-pixel rules, and nested gate geometry. Depth comes from tonal planes and real topology, not blurred glass. Corners stay mostly square with 2 to 8 pixel radii reserved for controls and compact status marks.

## Layout

Judge Mode uses a three-part instrument at wide sizes: process reality, Network Proof Lattice, and decision record. At narrower widths the process instrument follows the lattice. On mobile, the lattice becomes a text-first proof sequence and contract tables remain available through horizontal scrolling. The lattice also uses a container query so it adapts when its own content column narrows.

## Components

- Wordmark: custom fortress gate symbol paired with HISN-OT lettering.
- Lattice node: label, evidence state, provenance mark, and concise measurement.
- Process rail: requested and actual pressure on separate visual tracks.
- Event ledger: persisted event index, timestamp, state, and presenter cue.
- Evidence call: purpose, request state, redacted response, provenance, latency, timestamp, and correlation ID.
- Decision seal: authoritative state, failed policy references, and recovery conditions.
- Control deck: Play, Pause, Next, Previous, Reset, Explain, and Speed with 44-pixel minimum targets.

## Motion

Only persisted events animate. Route strokes reveal when evidence completes, topology lines reroute when containment begins, and heartbeat marks advance from server measurements. Most transitions last 160 to 240 milliseconds with an exponential ease-out. Reduced-motion mode removes transforms and route drawing while preserving state changes.

## Content rules

Use direct operational language. Never expose hidden chain-of-thought. Distinguish recommendation, deterministic evaluation, authoritative decision, and enforcement. Do not use em dashes, emojis, decorative badges, or unsupported certainty.
