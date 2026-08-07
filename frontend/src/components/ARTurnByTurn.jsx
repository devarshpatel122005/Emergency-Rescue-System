function formatDistance(meters) {
  const km = Number(meters || 0) / 1000;
  return `${km.toFixed(2)} km`;
}

function formatEta(seconds) {
  const minutes = Math.max(1, Math.round(Number(seconds || 0) / 60));
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function ARTurnByTurn({ route, loading, error }) {
  return (
    <section className="card space-y-3 p-4">
      <h2 className="text-lg font-semibold text-brand-900">Navigation</h2>

      <div className="flex flex-wrap gap-2 text-sm">
        <span className="rounded bg-slate-100 px-2 py-1">Distance: {route ? formatDistance(route.distanceMeters) : '-'}</span>
        <span className="rounded bg-slate-100 px-2 py-1">ETA: {route ? formatEta(route.durationSeconds) : '-'}</span>
      </div>

      {loading ? <p className="text-sm text-slate-500">Updating route...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="max-h-56 space-y-2 overflow-auto rounded-md border border-slate-200 p-3">
        {!route?.steps?.length ? (
          <p className="text-sm text-slate-500">Turn instructions will appear after route is loaded.</p>
        ) : (
          route.steps.map((step, index) => (
            <div key={step.id || `${step.instruction}-${index}`} className="rounded-md border border-slate-200 bg-slate-50 p-2">
              <p className="text-sm font-semibold text-slate-800">
                {index + 1}. {step.instruction}
              </p>
              <p className="text-xs text-slate-600">
                {formatDistance(step.distanceMeters)} | {formatEta(step.durationSeconds)}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default ARTurnByTurn;
