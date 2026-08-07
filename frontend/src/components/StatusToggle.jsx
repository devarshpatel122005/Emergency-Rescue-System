function StatusToggle({ checked, onChange, label, disabled = false }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-3">
      <span className="text-sm font-medium text-slate-700">{label}</span>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 rounded-full transition-colors ${
          checked ? 'bg-emerald-500' : 'bg-slate-400'
        } ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}

export default StatusToggle;
