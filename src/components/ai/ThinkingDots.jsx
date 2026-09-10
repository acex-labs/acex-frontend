export default function ThinkingDots({ label }) {
  return (
    <div className="flex items-center gap-2 h-4" aria-label={label ?? 'Thinking'}>
      <div className="flex items-center gap-1">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-brand/60 animate-bounce"
            style={{ animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>
      {label && <span className="text-[10px] text-subtle">{label}</span>}
    </div>
  )
}
