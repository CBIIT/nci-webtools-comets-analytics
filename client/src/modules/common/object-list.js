export default function ObjectList({ className = "", obj = {} }) {
  return (
    <ul className={className}>
      {Object.entries(obj).map(([key, value]) => (
        <li key={`option-${key}-${value}`}>
          <span className="fw-semibold me-1">{key}:</span>
          <span style={{ whiteSpace: "pre" }}>
            {value !== null && typeof value === "object" ? <ObjectList obj={value} /> : String(value)}
          </span>
        </li>
      ))}
    </ul>
  );
}
