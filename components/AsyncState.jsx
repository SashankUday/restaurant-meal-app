export function LoadingState({ label = "Setting the table…" }) {
  return (
    <div className="status-card" role="status">
      <span className="loading-plate" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="status-card status-error" role="alert">
      <p className="empty-title">Plate could not load.</p>
      <p>{message}</p>
      {onRetry && <button type="button" className="btn-quiet" onClick={onRetry}>Try again</button>}
    </div>
  );
}
