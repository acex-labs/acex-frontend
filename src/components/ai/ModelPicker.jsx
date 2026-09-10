import { TriangleAlert } from 'lucide-react'
import { useAiStore } from '../../context/AiContext'

/**
 * Read-only indicator of which model the chat chain currently answers with.
 * Not selectable — chat always runs the fast chain, and task-specific
 * starters always run the backend's dedicated analysis chain. The model to
 * use is entirely the backend's call (its per-task failover chain).
 */
export default function ModelPicker() {
  const { aiProviders, selectedModel } = useAiStore()

  if (!aiProviders || aiProviders === 'error') return null
  if (!aiProviders.providers?.length) return null

  const unreachable = aiProviders.providers.some(p => p.status !== 'ok')
  const shortName = (id) => id?.split('/').pop() ?? id

  return (
    <span
      className="flex items-center gap-1 text-[10px] text-subtle font-mono max-w-[160px] truncate"
      title={selectedModel ? `${selectedModel.provider}/${selectedModel.model}` : 'model'}
    >
      {unreachable && (
        <span title="A provider is unreachable"><TriangleAlert size={10} className="text-amber-500 shrink-0" /></span>
      )}
      <span className="truncate">{shortName(selectedModel?.model) ?? 'model'}</span>
    </span>
  )
}
