# Judge Q&A

## Is this a scripted animation?

No. Controls call the backend. The backend validates an explicit state transition, runs the use case, writes a hash-linked SQLite event, updates the stateful twin, and streams the snapshot. Back only changes the persisted presentation cursor over recorded events. The browser has no decision table or scenario timer.

## Where is the 60% limit?

In startup-validated `config/policy.v1.json`, version `desalination-safety-2026.1`. The UI reads the resulting safety event. It does not contain the threshold or decide the result.

## What is agentic about it?

The `AgentReasoner` interprets command consequence, assigns risk, selects allowlisted evidence tools within a call budget, interprets returned evidence, and emits a strict recommendation. Judge Mode visibly compares a low-risk one-tool plan with the critical five-tool plan. Deterministic process safety remains authoritative.

## Is the LLM actually required?

No. The deployed Judge Mode uses a hosted Groq-compatible reasoner and validates its structured plan and recommendation, but a deterministic reasoner takes over on timeout or invalid output. Tool plans differ by command risk, but this is not an open-ended evidence-dependent agent loop. The deterministic safety and authorization engines remain authoritative in both cases.

## Are Nokia or CAMARA calls live?

The public DEMO uses Nokia's test network through the TypeScript SDK. SIM Swap, Device Swap, Location Verification, Device Reachability, and QoD calls return `SANDBOX` provenance. Number Verification returns a reason-bearing `SIMULATED` fallback because subscriber OAuth is absent. Specialized Network detachment does the same because no slice attachment is configured. These test-network results do not prove an operator production effect.

## Why use telecom evidence?

Credentials prove knowledge or possession of identity material. Operator-network evidence can add current subscription, device, presence, and attachment context that the application alone cannot establish. HISN combines those signals with deterministic plant limits.

## Can the AI operate the PLC?

No. The reasoner ports expose only plan and recommend. It cannot invoke enforcement or a PLC. The repository contains no real OT endpoint. The safety and decision engines are ordinary deterministic code.

## What happens if evidence is missing?

The provider returns `UNAVAILABLE`. Critical missing evidence becomes `BLOCK`; it never becomes a successful signal. The Architecture screen can launch a degraded-provider proof that demonstrates this path.

## Could an ALLOW recommendation bypass the limit?

No. A test explicitly supplies an ALLOW recommendation for 88%; the authoritative output is BLOCK because the versioned maximum is 60%.

## Why detach only the gateway?

The design scopes containment to the implicated attachment while it requests continuity for the trusted backup path. In the current public rehearsal, no real slice attachment exists, so detachment is visibly simulated. The Nokia test-network QoD request remains pending, which correctly withholds backup ownership and safe-stops the modeled pump.

## How do you prove continuity?

The digital twin reports pressure bounds, simulated observation time and duration, heartbeat delta, maximum observation gap, simulated flow, tank levels, valve position, and unsafe-execution count. Heartbeats advance with the shared simulation clock, not proof steps, and pause with the local process. Backup ownership requires confirmed QoD and safe-control activation; the current pending QoD therefore produces a visible safe stop rather than a false continuity claim. Configured network latency is not a measured network result.

## Is the audit log immutable?

It is tamper-evident within the prototype: each event hashes its content and the previous hash. It is not WORM storage, externally signed, or independently timestamped. Those are production requirements.

## How does recovery work?

Recovery is not automatic. The decision record requires device/SIM re-enrollment, verified facility presence, OT security supervisor approval, and a fresh critical-command network proof. Production would use dual control and signed authorization.

## Is this deployable to a plant today?

No. It is a defensive architecture prototype, not a certified industrial safety system. Production needs site hazard analysis, certified safety functions, operator onboarding, enterprise identity, an approved OT gateway, and regulatory/site acceptance.

## What is the business model?

Deploy as an enterprise safety-control layer priced by protected site, critical asset, or verified command volume, with integration and compliance packages. Initial MENA customers are utilities and industrial operators; the architecture expands to oil and gas, energy, ports, factories, airports, hospitals, and smart-city infrastructure.
