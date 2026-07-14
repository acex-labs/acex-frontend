import { useState } from 'react'
import { X, Copy, Check } from 'lucide-react'
import { API_URL } from '../../config'

const TABS = ['Local', 'Docker Compose', 'Kubernetes']
const IMAGE = 'ghcr.io/acex-labs/acex-collection-agent:latest'

function buildSnippets(agentType, agentId, agentName) {
  const envVar = agentType === 'telemetry' ? 'TELEMETRY_AGENT_ID' : 'COLLECTION_AGENT_ID'
  const slug = agentName.toLowerCase().replace(/[^a-z0-9-]/g, '-')

  const localCollection = `docker run -d --name ${slug} \\
  -e ACEX_API_URL=${API_URL} \\
  -e ${envVar}=${agentId} \\
  --restart unless-stopped \\
  ${IMAGE}`

  const localTelemetry = `# Create a shared volume for Telegraf config
docker volume create ${slug}-config

# Start the ACEX sidecar (writes config to the shared volume)
docker run -d --name ${slug}-sidecar \\
  -e ACEX_API_URL=${API_URL} \\
  -e ${envVar}=${agentId} \\
  -v ${slug}-config:/etc/telegraf \\
  --restart unless-stopped \\
  ${IMAGE}

# Start Telegraf (reads config from the shared volume)
docker run -d --name ${slug}-telegraf \\
  -v ${slug}-config:/etc/telegraf \\
  --restart unless-stopped \\
  telegraf:latest`

  const k8sTelemetry = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${slug}
  labels:
    app: acex-telemetry
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ${slug}
  template:
    metadata:
      labels:
        app: ${slug}
    spec:
      containers:
        - name: telegraf
          image: telegraf:latest
          volumeMounts:
            - name: telegraf-config
              mountPath: /etc/telegraf
        - name: acex-collection-agent
          image: ${IMAGE}
          env:
            - name: ACEX_API_URL
              value: "${API_URL}"
            - name: ${envVar}
              value: "${agentId}"
          volumeMounts:
            - name: telegraf-config
              mountPath: /etc/telegraf
      volumes:
        - name: telegraf-config
          emptyDir: {}`

  const k8sCollection = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${slug}
  labels:
    app: acex-collection-agent
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ${slug}
  template:
    metadata:
      labels:
        app: ${slug}
    spec:
      containers:
        - name: collection-agent
          image: ${IMAGE}
          env:
            - name: ACEX_API_URL
              value: "${API_URL}"
            - name: ${envVar}
              value: "${agentId}"`

  const composeTelemetry = `services:
  telegraf:
    image: telegraf:latest
    volumes:
      - telegraf-config:/etc/telegraf
    restart: unless-stopped

  acex-collection-agent:
    image: ${IMAGE}
    environment:
      - ACEX_API_URL=${API_URL}
      - ${envVar}=${agentId}
    volumes:
      - telegraf-config:/etc/telegraf
    restart: unless-stopped

volumes:
  telegraf-config:`

  const composeCollection = `services:
  ${slug}:
    image: ${IMAGE}
    environment:
      - ACEX_API_URL=${API_URL}
      - ${envVar}=${agentId}
    restart: unless-stopped`

  return {
    'Local':           agentType === 'telemetry' ? localTelemetry : localCollection,
    'Docker Compose':  agentType === 'telemetry' ? composeTelemetry : composeCollection,
    'Kubernetes':      agentType === 'telemetry' ? k8sTelemetry : k8sCollection,
  }
}

function DeployModal({ agentType, agentId, agentName, onClose }) {
  const [tab, setTab] = useState('Kubernetes')
  const [copied, setCopied] = useState(false)
  const snippets = buildSnippets(agentType, agentId, agentName)

  const handleCopy = () => {
    navigator.clipboard.writeText(snippets[tab])
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const desc = agentType === 'telemetry'
    ? 'The ACEX sidecar polls the Telegraf config from ACEX and writes it to a shared volume. Telegraf reads the config as normal.'
    : 'The agent polls its manifest from ACEX, collects device data via SSH, and uploads the results back to ACEX.'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-canvas border border-edge rounded-xl shadow-2xl flex flex-col"
        style={{ width: '780px', maxHeight: '82vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-edge shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-content">Deploy Instructions</h3>
            <p className="text-[11px] text-subtle mt-1 max-w-lg">{desc}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-subtle hover:text-content hover:bg-surface-hi transition-colors ml-4 shrink-0"
          >
            <X size={14} />
          </button>
        </div>

        {/* Tab bar + copy */}
        <div className="flex items-center justify-between px-6 py-2 border-b border-edge bg-surface/50 shrink-0">
          <div className="flex gap-1">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={[
                  'px-3 py-1 text-xs rounded transition-colors',
                  tab === t
                    ? 'text-content bg-surface-hi border border-edge'
                    : 'text-subtle hover:text-content hover:bg-surface-hi',
                ].join(' ')}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-subtle hover:text-content transition-colors px-2 py-1 rounded hover:bg-surface-hi"
          >
            {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* Code block */}
        <div className="flex-1 overflow-auto">
          <pre className="p-6 text-xs leading-relaxed text-content/85 font-mono whitespace-pre">
            {snippets[tab]}
          </pre>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-edge shrink-0">
          <span className="text-[11px] text-subtle font-mono">
            Agent ID: <span className="text-content">{agentId}</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-subtle hover:text-content hover:bg-surface-hi rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DeployInstructionsPanel({ agentType, agentId, agentName }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-subtle hover:text-content transition-colors px-2 py-1 rounded hover:bg-surface-hi border border-edge"
      >
        Show deploy instructions
      </button>

      {open && (
        <DeployModal
          agentType={agentType}
          agentId={agentId}
          agentName={agentName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
