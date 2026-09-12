export function ImpactSummary() {
  return (
    <section className="impact-summary" aria-labelledby="impact-summary-heading">
      <div>
        <span className="eyebrow">Why this matters</span>
        <h2 id="impact-summary-heading">A safety gate for remote industrial commands</h2>
        <p>
          HISN-Oil gives OT security and operations teams network proof before a cellular command
          can change a high-consequence asset.
        </p>
      </div>
      <dl>
        <div>
          <dt>Initial buyer</dt>
          <dd>Industrial operators managing remote pumps, valves, and gateways</dd>
        </div>
        <div>
          <dt>One-site pilot</dt>
          <dd>One facility, one critical command family, and an approved control gateway</dd>
        </div>
        <div>
          <dt>Pilot hypothesis</dt>
          <dd>
            Measure blocked unsafe writes, false blocks, decision latency, and audit completeness
          </dd>
        </div>
      </dl>
    </section>
  );
}
