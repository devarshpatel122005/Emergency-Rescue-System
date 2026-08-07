function VerificationCard({ rescuer, onApprove, onReject }) {
  const imageUrl = rescuer.idCardImage
    ? `${(import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api').replace(/\/api\/?$/, '')}${rescuer.idCardImage}`
    : '';

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="font-semibold text-slate-900">{rescuer.name}</p>
      <p className="text-sm text-slate-600">{rescuer.department}</p>
      <p className="text-sm text-slate-600">{rescuer.phone}</p>

      {imageUrl ? (
        <a href={imageUrl} target="_blank" rel="noreferrer" className="mt-2 block">
          <img src={imageUrl} alt={`${rescuer.name} id card`} className="h-40 w-full rounded-md object-cover" />
        </a>
      ) : (
        <p className="mt-2 text-sm text-slate-500">No ID card image</p>
      )}

      <div className="mt-3 flex gap-2">
        <button type="button" className="btn-primary" onClick={() => onApprove(rescuer._id)}>
          Approve
        </button>
        <button type="button" className="btn-secondary" onClick={() => onReject(rescuer._id)}>
          Reject
        </button>
      </div>
    </div>
  );
}

export default VerificationCard;
