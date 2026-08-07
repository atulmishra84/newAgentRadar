import RiskBadge from './RiskBadge';

export default function AgentTable({ agents, onSelect }) {
  return (
    <div className="glass" style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Env</th>
            <th>Risk</th>
            <th>Flags</th>
            <th>Owner</th>
            <th>Lifecycle</th>
          </tr>
        </thead>
        <tbody>
          {(agents || []).map((a) => (
            <tr key={a.id} onClick={() => onSelect?.(a)}>
              <td>{a.name}</td>
              <td>{a.category}</td>
              <td>{a.environment}</td>
              <td>
                <RiskBadge level={a.risk_level} /> {a.risk_score}
              </td>
              <td>
                {a.shadow && <span className="badge badge-shadow">Shadow</span>}{' '}
                {a.phi_flag && <span className="badge badge-phi">PHI</span>}{' '}
                {a.pii_flag && <span className="badge">PII</span>}
              </td>
              <td>{a.owner || <span className="muted">Unowned</span>}</td>
              <td>{a.lifecycle}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!agents?.length && <p className="muted">No agents match.</p>}
    </div>
  );
}
