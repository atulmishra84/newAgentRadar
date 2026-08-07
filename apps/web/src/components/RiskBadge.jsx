export default function RiskBadge({ level }) {
  const l = (level || 'low').toLowerCase();
  return <span className={`badge badge-${l}`}>{l}</span>;
}
