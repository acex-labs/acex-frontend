// A labelled form control. `error` is shown under it (see FieldError); `hint` below that.
// The error carries its own top margin, so a field without an error takes no room for one.
export default function FormField({ label, required, hint, error, children }) {
  return (
    <div className="mb-3">
      <label className="block text-[11px] text-subtle mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <div className="text-[10px] text-red-400">{error}</div>}
      {hint && <p className="mt-1 text-[10px] text-subtle">{hint}</p>}
    </div>
  )
}
