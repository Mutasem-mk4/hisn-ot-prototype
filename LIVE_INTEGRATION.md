# Live Integration

## Deployment status

The Judge Mode is deployed to the existing Vercel production project. Because Vercel function filesystems and SQLite state are instance-local, the judged auto-run completes the bounded workflow in one authenticated request and replays its backend-generated frames in the browser. Local production and Docker workflows retain normal file-backed SQLite interaction. Durable multi-user hosting still requires an external transactional audit-store adapter.

## Honest status

The deployed Judge Mode runs in DEMO with Nokia test-network integration enabled. Public rehearsals have authenticated SIM Swap, Device Swap, Location Verification, Device Reachability, and QoD calls. Each result carries `SANDBOX`, `SIMULATED`, or `LIVE` provenance. Number Verification uses a labeled fixture because its subscriber OAuth token is absent. Specialized-network detachment uses a labeled fixture because no slice attachment is configured. QoD remained `REQUESTED`, so the application reported `PENDING`, released the test session, withheld backup ownership, and safe-stopped the modeled pump.

## SANDBOX

Interactive `/api/` routes are disabled outside DEMO (HTTP 403), and the automatic workflow tick does not advance external modes. This is a deliberate safety boundary: the shipped session is anonymous rehearsal access, not enterprise authentication. The configuration below describes adapter prerequisites, not a supported end-to-end external-control launch procedure.

Copy `.env.example` to `.env` and load it in the shell or deployment platform. This application does not parse `.env` files itself.

Required as one complete Nokia base configuration set:

- `NOKIA_NAC_BASE_URL`, `NOKIA_NAC_API_KEY`
- `NOKIA_NAC_RAPIDAPI_HOST` when the host differs from the default
- `HISN_OPERATOR_PHONE`, `HISN_BACKUP_PHONE` in E.164 format
- `HISN_APP_SERVER_IPV4`
- `HISN_GEOFENCE_LATITUDE`, `HISN_GEOFENCE_LONGITUDE`, `HISN_GEOFENCE_RADIUS_METERS`

Optional capability-specific values:

- `NOKIA_NAC_ACCESS_TOKEN` enables Number Verification V1 with subscriber authorization.
- `HISN_GATEWAY_NAI` and `HISN_OPERATIONAL_SLICE_ID` must be supplied together to enable attachment lookup and detachment.
- `HISN_BACKUP_IPV4` is accepted for future network-flow binding; the current QoD call identifies the backup by `HISN_BACKUP_PHONE`.

To reproduce the public hybrid Judge Mode, keep `HISN_MODE=DEMO` and set `HISN_NOKIA_SIMULATOR=true`. When an individual Nokia test call is unavailable, its deterministic substitute is explicitly labeled `SIMULATED` with a fallback reason.

Then set:

```powershell
$env:HISN_MODE = 'SANDBOX'
npm run build
npm start
```

If the configuration set is absent, SANDBOX constructs unavailable adapters. Interactive inspection remains disabled. It does not silently use DEMO evidence; use the explicit degraded DEMO scenario for offline inspection.

## LIVE

Set `HISN_MODE=LIVE` plus the complete base configuration above. Startup validation rejects missing, malformed, out-of-range, or partial base configuration, and rejects a partial slice pair. Before operation, the network operator must verify:

1. Application registration, billing/plan, required scopes, and lawful B2B or end-user consent.
2. Number, SIM/device swap, location, and reachability support for the intended operator and identifiers.
3. Facility circle accuracy and the operator's allowed minimum radius.
4. The exact gateway attachment within the configured specialized network. Detachment uses the returned attachment resource ID, not a guessed slice ID.
5. Support for the configured `QOS_L` QoS profile and the application's phone-to-server flow.
6. The backup phone, application-server IPv4 address, and any required public port or NAT mapping.
7. Site change control, dual authorization, recovery, and an approved OT gateway. The repository intentionally contains no live PLC endpoint.

`LIVE` describes the selected network adapter configuration. It does not enable the interactive application or establish safety certification or operator production approval.

## Hosted reasoning provider

The optional reasoner calls a server-side OpenAI-compatible chat-completions endpoint. The judged configuration uses Groq's free tier with `openai/gpt-oss-20b`. An authenticated plan-and-recommendation smoke test completed on September 9 with `LIVE` provenance and a `BLOCK_AND_CONTAIN` recommendation, and the key is stored as a masked production secret. Offline demonstrations use the policy-driven deterministic reasoner and must not be presented as a live model run.

Set the following values together:

- `HISN_LLM_BASE_URL=https://api.groq.com/openai/v1/chat/completions`
- `HISN_LLM_API_KEY` to the server-only Groq key
- `HISN_LLM_MODEL=openai/gpt-oss-20b`

The request uses JSON-object response mode, a zero temperature, a bounded output, low reasoning effort, a typed redacted input, and a server-supplied JSON schema. HISN-OT validates the returned plan or recommendation against its Zod contract and independently checks that every policy-required evidence tool is present. A timeout, non-2xx response, invalid JSON, malformed output, or incomplete plan invokes the deterministic reasoner and records `FALLBACK`. Model output never receives physical authority.

## Production gaps requiring operator access

Several gaps also require implementation: enterprise session validation, durable command-to-enrolled-gateway binding, command-bound expiring step-up approvals, provider-specific reconciliation, and an industrial command dispatch adapter. Credentials alone do not complete these features. An accepted detach request is not confirmed isolation; the adapter only reports success for a DETACHED response. QoD only reports success for AVAILABLE. Neither result proves that the local process traverses an industrial network slice.

- Nokia application key/token, scopes, consent, plan, and operator coverage
- Registered operator and gateway identifiers
- Existing specialized-network attachment
- Entitled QoS profile and verified application flow
- Facility-approved geofence coordinates and privacy/legal review
- Enterprise IdP and durable recovery authorization
- Certified OT gateway/PLC adapter and site acceptance testing
- Managed, signed/WORM audit storage and secure time source
