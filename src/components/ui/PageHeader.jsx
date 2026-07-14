export default function PageHeader({ title, description, actions }) {
  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-edge shrink-0">
      <div>
        <h1 className="text-sm font-semibold text-content">{title}</h1>
        {description && <p className="text-[11px] text-subtle mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
