import { useMemo } from 'react'

/**
 * Persistent usage bar: sums usage across all assistant messages in the
 * session. Always visible while the panel is open; resets on Clear.
 *
 * While streaming, `liveTokens` (client-side estimate: chars/4) is shown and
 * ticks upward; the exact provider-reported totals replace it when the
 * stream finishes.
 */
export default function SessionUsageBar({ messages, streaming = false, liveTokens = null }) {
  const { tokens, cost, co2 } = useMemo(() => {
    let tokens = 0, cost = 0, co2 = 0
    for (const m of messages) {
      if (m.role !== 'assistant' || !m.usage) continue
      tokens += m.usage.total_tokens ?? 0
      cost += m.usage.cost ?? 0
      co2 += m.usage.co2_grams ?? 0
    }
    return { tokens, cost, co2 }
  }, [messages])

  // Waiting for the first token (stream started, nothing received yet)
  const waiting = streaming && (liveTokens == null || liveTokens === 0)
  const displayTokens = liveTokens != null ? tokens + liveTokens : tokens
  const tokenText = waiting ? '…' : liveTokens != null ? `~${displayTokens}` : `${displayTokens}`

  return (
    <div className="px-4 border-t border-edge/50 text-[9px] text-subtle/70 font-mono shrink-0 select-none leading-[22px]" style={{ height: 22 }}>
      usage — tokens: {tokenText} cost: {cost.toFixed(4)} co2: {co2.toFixed(2)} g
    </div>
  )
}
