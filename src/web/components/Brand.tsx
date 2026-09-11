export function Brand() {
  return (
    <a className="brand" href="#judge" aria-label="HISN-Oil Judge Mode">
      <svg className="brand__mark" viewBox="0 0 44 44" aria-hidden="true">
        <path d="M5 4h34v9H14v18h16v-8H20v-8h19v25H5z" />
        <path className="brand__signal" d="M14 22h6M30 22h9" />
      </svg>
      <span>
        <b>HISN—Oil</b>
        <small>Agentic safety for remote energy</small>
      </span>
    </a>
  );
}
