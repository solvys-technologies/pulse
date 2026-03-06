// [claude-code 2026-03-06] Narratives heatmap/web view — zoomable node graph with tag connections
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Minimize2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useBackend } from '../../lib/backend';
import type { NarrativeItem } from '../../lib/services';

const VOL_FILL: Record<string, string> = {
  low: '#166534',
  gaining: '#F59E0B',
  hot: '#DC2626',
};

interface NodeLayout {
  narrative: NarrativeItem;
  x: number;
  y: number;
  r: number;
}

interface Edge {
  from: NodeLayout;
  to: NodeLayout;
  sharedTags: number;
}

function layoutNodes(narratives: NarrativeItem[], width: number, height: number): NodeLayout[] {
  if (narratives.length === 0) return [];

  // Group by week for horizontal axis placement
  const weeks = [...new Set(narratives.map((n) => n.week))].sort();
  const weekWidth = width / (weeks.length + 1);

  return narratives.map((n, i) => {
    const weekIndex = weeks.indexOf(n.week);
    const weekNarratives = narratives.filter((nn) => nn.week === n.week);
    const indexInWeek = weekNarratives.indexOf(n);
    const verticalSpacing = height / (weekNarratives.length + 1);

    return {
      narrative: n,
      x: weekWidth * (weekIndex + 1),
      y: verticalSpacing * (indexInWeek + 1),
      r: Math.max(12, Math.min(30, n.impact * 3)),
    };
  });
}

function computeEdges(nodes: NodeLayout[]): Edge[] {
  const edges: Edge[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const shared = a.narrative.tags.filter((t) => b.narrative.tags.includes(t)).length;
      if (shared > 0) {
        edges.push({ from: a, to: b, sharedTags: shared });
      }
    }
  }
  return edges;
}

interface NarrativesWebProps {
  onCollapse: () => void;
}

export function NarrativesWeb({ onCollapse }: NarrativesWebProps) {
  const backend = useBackend();
  const [narratives, setNarratives] = useState<NarrativeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Pan and zoom state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  // Fetch all narratives (no week filter — show full web)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    backend.narratives.list().then((res) => {
      if (!cancelled) {
        setNarratives(res.narratives ?? []);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [backend]);

  const canvasW = 1200;
  const canvasH = 700;

  const nodes = useMemo(() => layoutNodes(narratives, canvasW, canvasH), [narratives]);
  const edges = useMemo(() => computeEdges(nodes), [nodes]);
  const weeks = useMemo(() => [...new Set(narratives.map((n) => n.week))].sort(), [narratives]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const scaleDelta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(0.3, Math.min(3, prev.scale * scaleDelta)),
    }));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  }, [transform]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setTransform((prev) => ({
      ...prev,
      x: e.clientX - panStart.current.x,
      y: e.clientY - panStart.current.y,
    }));
  }, [isPanning]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  const resetView = useCallback(() => setTransform({ x: 0, y: 0, scale: 1 }), []);

  return (
    <div className="h-full flex flex-col bg-[#050402]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#D4AF37]/15">
        <div className="text-[13px] font-semibold text-[#f0ead6]">Narratives Web</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTransform((p) => ({ ...p, scale: Math.min(3, p.scale * 1.2) }))}
            className="text-[#D4AF37]/40 hover:text-[#D4AF37] transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setTransform((p) => ({ ...p, scale: Math.max(0.3, p.scale * 0.8) }))}
            className="text-[#D4AF37]/40 hover:text-[#D4AF37] transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={resetView}
            className="text-[#D4AF37]/40 hover:text-[#D4AF37] transition-colors"
            title="Reset view"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onCollapse}
            className="text-[#D4AF37]/40 hover:text-[#D4AF37] transition-colors ml-2"
            title="Back to list"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden relative" style={{ cursor: isPanning ? 'grabbing' : 'grab' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-[11px] text-zinc-500">Loading narratives web...</div>
          </div>
        ) : narratives.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-[11px] text-zinc-500">No narratives yet</div>
          </div>
        ) : (
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox={`0 0 ${canvasW} ${canvasH}`}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="select-none"
          >
            <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
              {/* Week axis labels */}
              {weeks.map((w, i) => {
                const x = (canvasW / (weeks.length + 1)) * (i + 1);
                return (
                  <text
                    key={w}
                    x={x}
                    y={canvasH - 15}
                    textAnchor="middle"
                    fill="#D4AF37"
                    opacity={0.3}
                    fontSize={11}
                    fontFamily="monospace"
                  >
                    {w}
                  </text>
                );
              })}

              {/* Edges */}
              {edges.map((edge, i) => {
                const isHighlighted =
                  hoveredId === edge.from.narrative.id || hoveredId === edge.to.narrative.id;
                return (
                  <line
                    key={i}
                    x1={edge.from.x}
                    y1={edge.from.y}
                    x2={edge.to.x}
                    y2={edge.to.y}
                    stroke="#D4AF37"
                    strokeWidth={Math.min(4, edge.sharedTags * 1.5)}
                    opacity={isHighlighted ? 0.6 : 0.12}
                    strokeDasharray={edge.sharedTags === 1 ? '4 3' : undefined}
                  />
                );
              })}

              {/* Nodes */}
              {nodes.map((node) => {
                const isHovered = hoveredId === node.narrative.id;
                return (
                  <g
                    key={node.narrative.id}
                    onMouseEnter={() => setHoveredId(node.narrative.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Node circle */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.r}
                      fill={VOL_FILL[node.narrative.volatility] ?? VOL_FILL.low}
                      opacity={isHovered ? 0.9 : 0.6}
                      stroke={isHovered ? '#D4AF37' : 'none'}
                      strokeWidth={isHovered ? 2 : 0}
                    />
                    {/* Label */}
                    <text
                      x={node.x}
                      y={node.y - node.r - 6}
                      textAnchor="middle"
                      fill="#f0ead6"
                      fontSize={isHovered ? 12 : 10}
                      opacity={isHovered ? 1 : 0.6}
                      fontWeight={isHovered ? 600 : 400}
                    >
                      {node.narrative.title.length > 25
                        ? node.narrative.title.slice(0, 22) + '...'
                        : node.narrative.title}
                    </text>
                    {/* Impact label inside circle */}
                    {node.r >= 16 && (
                      <text
                        x={node.x}
                        y={node.y + 4}
                        textAnchor="middle"
                        fill="#f0ead6"
                        fontSize={9}
                        opacity={0.8}
                        fontWeight={600}
                      >
                        {node.narrative.impact}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        )}

        {/* Legend */}
        <div className="absolute bottom-3 left-3 flex items-center gap-3 bg-[#0a0a00]/80 rounded-lg px-3 py-1.5 border border-[#D4AF37]/10">
          {[
            { label: 'Low', color: VOL_FILL.low },
            { label: 'Gaining', color: VOL_FILL.gaining },
            { label: 'Hot', color: VOL_FILL.hot },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: color, opacity: 0.7 }} />
              <span className="text-[9px] text-[#f0ead6]/50">{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1 ml-1">
            <div className="w-6 h-px bg-[#D4AF37]/40" />
            <span className="text-[9px] text-[#f0ead6]/50">Shared tags</span>
          </div>
        </div>
      </div>
    </div>
  );
}
