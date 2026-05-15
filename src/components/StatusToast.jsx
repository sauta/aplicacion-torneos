export function StatusToast({ status }) {
  const className = [
    "status-message",
    status?.message ? "is-visible" : "",
    status?.type ? `is-${status.type}` : ""
  ].filter(Boolean).join(" ");

  return (
    <div className={className} role="status" aria-live="polite">
      {status?.message}
    </div>
  );
}
