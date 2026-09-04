# Network Proof Lattice Design System

## Intent

The interface is an industrial safety instrument combined with an editorial data story. It should feel exacting, composed, and consequential. It is not a general administration dashboard.

## Signature structure

The Network Proof Lattice shows a held command crossing four trust layers:

1. Identity — credentials and number binding
2. Presence — SIM/device change and facility location
3. Connectivity — current reachability/attachment context
4. Physical Safety — deterministic operating policy

Waiting, verified, and failed nodes assemble from backend event state. After authorization, red and cyan topology routes show the compromised attachment severed and trusted backup path prioritized. At narrow container widths, the diagram becomes a text-first evidence sequence.

## Tokens

The implementation uses OKLCH variables in `src/web/styles.css`:

- Obsidian canvas `--ink-0`
- Basalt/graphite surfaces `--ink-1` through `--ink-3`
- Warm sand and copper for human action and regional industrial character
- Cyan only for trusted network/process activity
- Amber for uncertainty and step-up states
- Red only for danger, failed proof, or containment

System UI fonts render prose and controls; Cascadia Code/Consolas-style monospace renders measurements, states, timestamps, and identifiers. No webfont is required.

## Geometry

One-pixel structural rules, clipped corners, orthogonal routes, and fortress-gate SVG geometry provide identity. Depth comes from tonal planes, a restrained code-native noise texture, and real topology. Rounded-card grids, glass effects, stock imagery, decorative terminals, and unsupported charts are excluded.

## Components

- Original HISN-OT gate mark and wordmark
- Control Rail with Play/Pause, Back, Step, Reset, Speed, Explain, and Present
- Event Banner sourced from the current persisted event
- Network Proof Lattice and narrow-width proof sequence
- Physical State instrument with independent requested/actual values
- Adaptive Evidence comparison
- Contract evidence table
- Telemetry history reconstructed from event twins
- Print-friendly incident document
- Clean-architecture and Demo Readiness map

## Motion

Only state-linked motion is used: process heartbeat, pressure marker movement, progress, and containment-route travel. `prefers-reduced-motion` collapses every animation and transition to effectively zero duration without hiding state.

## Responsive and accessible behavior

- Reference targets: 1440×900 laptop, 1280×720 projector, tablet, and 390×844 mobile.
- Wide Judge Mode places lattice and physical instrumentation together.
- Below 1050 px, supporting instruments follow the lattice and primary navigation becomes a persistent bottom rail.
- Below 720 px, controls become compact, the SVG lattice becomes a semantic ordered list, and report columns stack.
- A container query also swaps the lattice presentation based on its own available width.
- All operations have accessible names, visible focus, keyboard access, textual status, and live announcements.
- Semantic tables, headings, definition lists, progressbar semantics, and SVG alternative descriptions support assistive technology.
- Automated axe checks reject serious or critical violations in every Playwright viewport.

## Content rules

Use direct operational language. Keep “requested” and “actual” explicit. Distinguish agent plan, evidence, deterministic evaluation, authoritative decision, and enforcement. Never expose hidden reasoning, claim a simulated call is live, or explain controls that are self-evident.
