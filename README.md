# HISN-OT

**A LangGraph and CAMARA safety agent for critical infrastructure**

> No critical command becomes a physical action without network proof.

[![Live demo](https://img.shields.io/badge/LIVE_DEMO-JUDGE_MODE-28d7c5?style=for-the-badge)](https://hisn-ot-prototype.vercel.app/#judge)
[![Verify](https://img.shields.io/github/actions/workflow/status/Mutasem-mk4/hisn-ot-prototype/ci.yml?branch=main&style=for-the-badge&label=VERIFY)](https://github.com/Mutasem-mk4/hisn-ot-prototype/actions/workflows/ci.yml)
[![Theme](https://img.shields.io/badge/MENA_IGNITE-INDUSTRIAL_AI-e7b36f?style=for-the-badge)](https://www.hackerearth.com/community/challenges/hackathon/mena-ignite-hackathon/)

HISN-OT protects a connected desalination facility from valid-credential attacks. A bounded LangGraph agent selects Nokia Network as Code/CAMARA evidence tools, observes their results, and can adapt its next call. A separate deterministic policy engine decides whether the command may reach the modeled controller.

The industrial plant is a clearly labeled digital twin. Nokia responses show their real provenance, and the model never receives provider credentials or physical authority.

## Run the judged proof

### [Open Judge Mode](https://hisn-ot-prototype.vercel.app/#judge)

1. Select **Run attack demonstration**. A valid account requests an unsafe **88%** pressure setting.
2. Watch the four-step protection path: the gateway holds the command, the agent selects telecom evidence, deterministic policy decides, and only authorized state can reach the plant.
3. Confirm the outcome panel shows **88% requested**, the previous accepted setting unchanged, and the independent **60% hard maximum**.
4. Expand **Show technical trace** or open **Evidence Trace** to inspect model-requested tools, observations, provenance, adaptation, recommendation, and the authoritative policy result.
5. Use **Run safe command** and **Run read-only inspection** as optional comparisons. Open the incident report from the technical view or Evidence Trace after a completed run.

Expected invariant: the blocked request never changes the previously accepted control value.

## What makes the agent real

```mermaid
flowchart LR
  A[Held command + twin state] --> B[LangGraph agent]
  B -->|typed tool call| C[Trusted ToolNode executor]
  C --> D[Nokia Network as Code]
  D -->|redacted observation| B
  B --> E[Agent recommendation]
  E --> F[Deterministic policy authority]
  F -->|ALLOW| G[Accepted control state]
  F -->|BLOCK| H[Command remains held]
  F -->|authorized containment| I[Guarded response workflow]
```

The model chooses from five allowlisted, typed tools:

- Number Verification
- SIM Swap
- Device Swap
- Location Verification
- Device Reachability

LangGraph executes the model/tool/observation loop. The application injects trusted run context, invokes the existing Nokia adapters, validates every result with Zod, enforces a five-call budget, rejects duplicate calls, and records an inspectable action trace. The graph reminds the model when required evidence is missing; if the model still stops early or becomes unavailable, the workflow fails closed without substituting a rule-based recommendation.

The final decision remains deterministic. Model output cannot change the 60% command maximum, authorize missing evidence, detach a gateway, or activate backup control by itself.

## Honest integration status

| Capability            | Deployed path                         | Boundary                                                     |
| --------------------- | ------------------------------------- | ------------------------------------------------------------ |
| Agent orchestration   | LangGraph.js with a hosted Groq model | Advisory evidence selection and recommendation; fails closed |
| SIM Swap              | Authenticated Nokia sandbox API       | Simulator identity                                           |
| Device Swap           | Authenticated Nokia sandbox API       | Simulator identity                                           |
| Location Verification | Authenticated Nokia sandbox API       | Simulator identity                                           |
| Device Reachability   | Authenticated Nokia sandbox API       | Simulator identity                                           |
| Number Verification   | Local CAMARA-shaped fallback          | Subscriber OAuth is not configured                           |
| Quality on Demand     | Authenticated Nokia sandbox request   | Observed sessions may remain pending; no handover is claimed |
| Slice detachment      | Guarded local implementation          | No operational slice attachment is configured                |
| Plant and PLC         | Stateful digital twin                 | No physical PLC or calibrated plant claim                    |

The UI uses the same provenance vocabulary throughout: `LANGGRAPH AGENT`, `NOKIA SANDBOX`, `LIVE`, `FALLBACK`, `UNAVAILABLE`, and `IMPLEMENTED LOCALLY`.

## Run locally

Requires Node.js 22.18 or later.

```powershell
git clone https://github.com/Mutasem-mk4/hisn-ot-prototype.git
cd hisn-ot-prototype
npm ci
Copy-Item .env.example .env.local
npm run doctor
npm run build
npm start
```

Open [http://127.0.0.1:4310/#judge](http://127.0.0.1:4310/#judge).

The copied environment starts safely with deterministic reasoning and simulated evidence. Replace the placeholder keys, set `HISN_AGENT_PROVIDER=GROQ`, and set `HISN_NOKIA_SIMULATOR=true` to enable the hosted agent and Nokia test network. `.env.local` and secrets must remain outside Git.

Useful checks:

```powershell
npm run doctor
npm run verify
npm run test:e2e
npm run audit:deps
```

## Repository guide

- [Architecture and agent graph](docs/architecture.md)
- [Nokia/CAMARA integrations and provenance](docs/integrations.md)
- [Safety and security case](docs/safety-and-security.md)
- [Judge demo and questions](docs/demo-and-judging.md)
- [Verification evidence](docs/verification.md)
- [Product definition](PRODUCT.md)
- [Interface design system](DESIGN.md)

HISN-OT aligns with the MENA Ignite **Industrial & Enterprise AI Automation** theme and uses desalination as its anchor MENA water-security use case. The same network proof-of-authority pattern can extend to energy, ports, oil and gas, factories, airports, and hospitals.
