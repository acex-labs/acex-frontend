export default function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 h-4" aria-label="Thinking">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-brand/60 animate-bounce"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  )
}
