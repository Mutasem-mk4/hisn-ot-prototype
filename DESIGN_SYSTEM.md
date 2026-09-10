# HISN-OT Facility Simulation Design System

## Intent

The interface is an industrial safety instrument combined with an editorial data story. It should feel exacting, composed, and consequential. It is not a general administration dashboard.

## Signature structure

The facility schematic shows a held command crossing four trust layers while the physical process remains readable:

1. Identity — credentials and number binding
2. Presence — SIM/device change and facility location
3. Connectivity — current reachability/attachment context
4. Physical Safety — deterministic operating policy

Waiting, verified, and failed evidence states assemble from backend snapshots. After authorization, topology routes show the compromised attachment severed and the trusted backup path taking ownership only after confirmed handover. Physical water uses a solid cyan route; digital control and evidence use thin dashed routes.

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
- Control deck with separate simulation playback and pump setpoint groups
- Event Banner sourced from the current persisted event
- Interactive desalination facility SVG with component inspector
- Physical State instrument with independent requested/actual values
- Adaptive Evidence comparison
- Contract evidence table
- Telemetry history reconstructed from event twins
- Print-friendly incident document
- Clean-architecture and Demo Readiness map

## Motion

Only state-linked motion is used: pump rotation, flow-marker travel, tank/valve transitions, evidence travel, progress, and containment routes. `prefers-reduced-motion` collapses every animation and transition to effectively zero duration without hiding state.

## Responsive and accessible behavior

- Reference targets: 1440×900 laptop, 1280×720 projector, tablet, and 390×844 mobile.
- Wide Judge Mode places digital proof and physical equipment in one schematic with an adjacent inspector.
- Below 1050 px, control groups stack and primary navigation becomes a persistent bottom rail.
- Below 720 px, the facility uses a labeled horizontal viewport and report columns stack.
- All operations have accessible names, visible focus, keyboard access, textual status, and live announcements.
- Semantic tables, headings, definition lists, progressbar semantics, and SVG alternative descriptions support assistive technology.
- Automated axe checks reject serious or critical violations in every Playwright viewport.

## Content rules

Use direct operational language. Keep “requested” and “actual” explicit. Distinguish agent plan, evidence, deterministic evaluation, authoritative decision, and enforcement. Never expose hidden reasoning, claim a simulated call is live, or explain controls that are self-evident.
