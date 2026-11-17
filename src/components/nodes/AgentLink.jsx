import { Link } from 'react-router-dom'

// The collection agent that made the last attempt on a node, with a link to its page under Settings.
export default function AgentLink({ collection, ...props }) {
  return (
    <Link
      to={`/settings/collection-agents/${collection.agent_id}`}
      className="text-brand hover:text-brand/80 transition-colors"
      {...props}
    >
      {collection.agent_name ?? `Agent ${collection.agent_id}`}
    </Link>
  )
}
