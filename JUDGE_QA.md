# Judge Q&A

## Is this a scripted animation?

No. Controls call the backend. The backend validates an explicit state transition, runs the use case, writes a hash-linked SQLite event, updates the stateful twin, and streams the snapshot. Back only changes the persisted presentation cursor over recorded events. The browser has no decision table or scenario timer.

## Where is the 60% limit?

In startup-validated `config/policy.v1.json`, version `desalination-safety-2026.1`. The UI reads the resulting safety event. It does not contain the threshold or decide the result.

## What is agentic about it?

The `AgentReasoner` interprets command consequence, assigns risk, selects allowlisted evidence tools within a call budget, interprets returned evidence, and emits a strict recommendation. Judge Mode visibly compares a low-risk one-tool plan with the critical five-tool plan. Deterministic process safety remains authoritative.

## Is the LLM actually required?

No. DEMO uses a deterministic reasoner for reliability. A provider-neutral live structured-output adapter is included. It validates output and falls back with `FALLBACK` provenance on timeout or malformed output. This makes the role real but bounded.

## Are Nokia or CAMARA calls live?

Not in the delivered DEMO run. Results say `SIMULATED`. The TypeScript Nokia SDK adapter implements Number Verification, SIM Swap, Device Swap, Location Verification, Device Reachability, Specialized Network device detach, and QoD. Sandbox/live execution requires credentials, consent, registered devices, operator coverage, a slice attachment, and an entitled QoS profile.

## Why use telecom evidence?

Credentials prove knowledge or possession of identity material. Operator-network evidence can add current subscription, device, presence, and attachment context that the application alone cannot establish. HISN combines those signals with deterministic plant limits.

## Can the AI operate the PLC?

No. The reasoner ports expose only plan and recommend. It cannot invoke enforcement or a PLC. The repository contains no real OT endpoint. The safety and decision engines are ordinary deterministic code.

## What happens if evidence is missing?

The provider returns `UNAVAILABLE`. Critical missing evidence becomes `BLOCK`; it never becomes a successful signal. The Architecture screen can launch a degraded-provider proof that demonstrates this path.

## Could an ALLOW recommendation bypass the limit?

No. A test explicitly supplies an ALLOW recommendation for 88%; the authoritative output is BLOCK because the versioned maximum is 60%.

## Why detach only the gateway?

Containment is proportionate and continuity-aware. The implicated attachment is isolated while the trusted backup path is protected. Removing the entire network would trade cyber risk for an availability incident.

## How do you prove continuity?

The digital twin reports actual pressure against the safe band, backup heartbeat delta, flow, path latency, and unsafe-execution count. These values enter the incident report from persisted state.

## Is the audit log immutable?

It is tamper-evident within the prototype: each event hashes its content and the previous hash. It is not WORM storage, externally signed, or independently timestamped. Those are production requirements.

## How does recovery work?

Recovery is not automatic. The decision record requires device/SIM re-enrollment, verified facility presence, OT security supervisor approval, and a fresh critical-command network proof. Production would use dual control and signed authorization.

## Is this deployable to a plant today?

No. It is a defensive architecture prototype, not a certified industrial safety system. Production needs site hazard analysis, certified safety functions, operator onboarding, enterprise identity, an approved OT gateway, and regulatory/site acceptance.

## What is the business model?

Deploy as an enterprise safety-control layer priced by protected site, critical asset, or verified command volume, with integration and compliance packages. Initial MENA customers are utilities and industrial operators; the architecture expands to oil and gas, energy, ports, factories, airports, hospitals, and smart-city infrastructure.
