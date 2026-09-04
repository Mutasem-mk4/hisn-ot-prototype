# Live Integration

## Hosted demonstration

The Vercel deployment runs in `DEMO` mode and uses the same Fastify application,
validated configuration, domain state machine, provider ports, and SQLite audit store
as the local build. Vercel's writable filesystem is ephemeral, so the hosted deployment
stores its demonstration database at `/tmp/hisn-ot.db`. A cold runtime may therefore
start a fresh judge run. Durable multi-instance hosting requires an external transactional
audit-store adapter; the local and Docker workflows retain file-backed persistence.

The hosted deployment does not configure Nokia, CAMARA, or LLM credentials. All evidence
and enforcement results remain visibly marked `SIMULATED`.

## Honest status

The Nokia/CAMARA and structured-reasoning adapters are implemented and compile against `network-as-code@10.0.0`; they were not invoked against sandbox or production because no credentials, operator consent, registered devices, attachment resource, or entitled QoS profile was supplied. The delivered judge path is DEMO and labels every fixture `SIMULATED`.

## SANDBOX

Copy `.env.example` to `.env` and load it in the shell or deployment platform. This application does not parse `.env` files itself.

Required as one complete Nokia configuration set:

- `NOKIA_NAC_BASE_URL`, `NOKIA_NAC_API_KEY`, `NOKIA_NAC_ACCESS_TOKEN`
- `HISN_OPERATOR_PHONE` in E.164 format
- `HISN_GATEWAY_NAI`, `HISN_OPERATIONAL_SLICE_ID`
- `HISN_BACKUP_IPV4`, `HISN_APP_SERVER_IPV4`
- `HISN_GEOFENCE_LATITUDE`, `HISN_GEOFENCE_LONGITUDE`, `HISN_GEOFENCE_RADIUS_METERS`

Then set:

```powershell
$env:HISN_MODE = 'SANDBOX'
npm run build
npm start
```

If the configuration set is absent, SANDBOX starts with unavailable providers so the fail-safe path can be inspected. It does not silently use DEMO evidence.

## LIVE

Set `HISN_MODE=LIVE` plus every Nokia value above. Startup validation rejects missing, malformed, out-of-range, or partial configuration. Before operation, the network operator must verify:

1. Application registration, billing/plan, required scopes, and lawful B2B or end-user consent.
2. Number, SIM/device swap, location, and reachability support for the intended operator and identifiers.
3. Facility circle accuracy and the operator's allowed minimum radius.
4. The exact gateway attachment within the configured specialized network. Detachment uses the returned attachment resource ID, not a guessed slice ID.
5. A supported QoS profile. `MISSION_CRITICAL_CONTINUITY` is a policy name in DEMO and must be replaced with an operator-entitled profile before LIVE.
6. The backup/application IPv4 pair and any required public port or NAT mapping. The current adapter represents a no-NAT address by sending it as both public and private address.
7. Site change control, dual authorization, recovery, and an approved OT gateway. The repository intentionally contains no live PLC endpoint.

`LIVE` describes the selected network adapter mode. It does not imply safety certification or operator production approval.

## Structured reasoning provider

The optional provider-neutral adapter sends a server-only authenticated POST to `HISN_LLM_BASE_URL` with:

- `model`
- task `PLAN` or `RECOMMEND`
- a typed, redacted input
- the evidence-tool allowlist and maximum tool-call budget
- `noPhysicalAuthority: true`

The endpoint must return `{ "output": { ... } }` matching the plan or recommendation schema without a `reasoningProvenance` field. HISN-OT assigns provenance after validation. A timeout, non-2xx response, invalid JSON, or malformed output invokes the deterministic reasoner and records `FALLBACK`. Model output is never promoted to physical authority.

## Production gaps requiring operator access

- Nokia application key/token, scopes, consent, plan, and operator coverage
- Registered operator and gateway identifiers
- Existing specialized-network attachment
- Entitled QoS profile and verified application flow
- Facility-approved geofence coordinates and privacy/legal review
- Enterprise IdP and durable recovery authorization
- Certified OT gateway/PLC adapter and site acceptance testing
- Managed, signed/WORM audit storage and secure time source
