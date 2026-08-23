interface ContextBadgeProps {
  label: string;
  value: string;
  detail: string;
}

/** Compact label-value treatment for facts already present in WorkspaceModel. */
export function ContextBadge({ label, value, detail }: ContextBadgeProps) {
  return (
    <div className="context-badge">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}
