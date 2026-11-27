import { useInternalNode, getBezierPath, BaseEdge, EdgeLabelRenderer, Position } from '@xyflow/react'

function getCenter(node) {
  const { positionAbsolute: pos } = node.internals
  const w = node.measured?.width  ?? 160
  const h = node.measured?.height ?? 70
  return { x: pos.x + w / 2, y: pos.y + h / 2 }
}

function getBorderPoint(node, other) {
  const c  = getCenter(node)
  const hw = (node.measured?.width  ?? 160) / 2
  const hh = (node.measured?.height ?? 70)  / 2
  const dx = other.x - c.x
  const dy = other.y - c.y
  if (!dx && !dy) return c
  const t = Math.min(
    dx ? hw / Math.abs(dx) : Infinity,
    dy ? hh / Math.abs(dy) : Infinity,
  )
  return { x: c.x + dx * t, y: c.y + dy * t }
}

function getSide(node, borderPoint) {
  const c  = getCenter(node)
  const hw = (node.measured?.width  ?? 160) / 2
  const hh = (node.measured?.height ?? 70)  / 2
  const dx = borderPoint.x - c.x
  const dy = borderPoint.y - c.y
  return Math.abs(dx / hw) > Math.abs(dy / hh)
    ? (dx > 0 ? Position.Right : Position.Left)
    : (dy > 0 ? Position.Bottom : Position.Top)
}

// Moves a point sideways from the line a→b, so parallel edges of one pair don't overlap.
function shift(point, a, b, offset) {
  if (!offset) return point
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  return { x: point.x - (dy / len) * offset, y: point.y + (dx / len) * offset }
}

export default function FloatingEdge({ id, source, target, style, label, data }) {
  const srcNode = useInternalNode(source)
  const tgtNode = useInternalNode(target)

  if (!srcNode?.internals?.positionAbsolute || !tgtNode?.internals?.positionAbsolute) return null

  // Offsets are measured along one direction of the pair, whichever node is the source.
  const offset = (data?.offset ?? 0) * (source < target ? 1 : -1)
  const sc = getCenter(srcNode)
  const tc = getCenter(tgtNode)
  const sp = shift(getBorderPoint(srcNode, tc), sc, tc, offset)
  const tp = shift(getBorderPoint(tgtNode, sc), sc, tc, offset)

  const [path, lx, ly] = getBezierPath({
    sourceX:         sp.x,
    sourceY:         sp.y,
    sourcePosition:  getSide(srcNode, sp),
    targetX:         tp.x,
    targetY:         tp.y,
    targetPosition:  getSide(tgtNode, tp),
    curvature:       0.25,
  })

  return (
    <>
      <BaseEdge id={id} path={path} style={style} />
      {label && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan"
            style={{
              position:   'absolute',
              transform:  `translate(-50%, -50%) translate(${lx}px, ${ly}px)`,
              fontSize:   9,
              fontFamily: 'monospace',
              color:      'var(--subtle)',
              background: 'var(--canvas)',
              padding:    '2px 5px',
              borderRadius: 3,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
