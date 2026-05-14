import React, { useRef, useEffect, useState } from 'react';
import { useGraphStore } from '../store/graphStore';
import { cn } from '@/modules/core/utils';

const NODE_COLORS: Record<string, string> = {
  file: '#3B82F6',
  function: '#10B981',
  class: '#8B5CF6',
  interface: '#F59E0B',
  export: '#EF4444',
  completed: '#10B981',
  running: '#3B82F6',
  idle: '#9CA3AF',
  failed: '#EF4444',
};

interface GraphCanvasProps {
  onNodeClick?: (node: any) => void;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({ onNodeClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { 
    data, 
    mode,
    viewport, 
    interaction, 
    setZoom, 
    setPan, 
    selectNode, 
    hoverNode 
  } = useGraphStore();
  
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  const [metrics, setMetrics] = useState({ fps: 0, renderedNodes: 0 });

  // FPS tracking
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;

    const ctx = canvas.getContext('2d', { alpha: false }); // Optimization: disable alpha if possible
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const now = performance.now();
      frameCountRef.current++;
      if (now - lastTimeRef.current > 1000) {
        setMetrics(m => ({ ...m, fps: frameCountRef.current }));
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      const { width, height } = canvas;
      const { zoom, pan } = viewport;

      // 1. Calculate Viewport Bounds for Culling
      const padding = 50; // Extra padding to avoid pop-in
      const left = (-width / 2 - pan.x) / zoom - padding;
      const right = (width / 2 - pan.x) / zoom + padding;
      const top = (-height / 2 - pan.y) / zoom - padding;
      const bottom = (height / 2 - pan.y) / zoom + padding;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.translate(width / 2 + pan.x, height / 2 + pan.y);
      ctx.scale(zoom, zoom);

      // 2. Filter & Render Edges (LOD: skip edges if very zoomed out)
      if (zoom > 0.2) {
        ctx.strokeStyle = 'rgba(156, 163, 175, 0.2)';
        ctx.lineWidth = 1 / zoom;
        data.edges.forEach(edge => {
          const source = data.nodes.find(n => n.id === edge.source);
          const target = data.nodes.find(n => n.id === edge.target);
          
          if (source && target) {
            // Simple edge culling: check if both nodes are outside
            const sIn = source.x > left && source.x < right && source.y > top && source.y < bottom;
            const tIn = target.x > left && target.x < right && target.y > top && target.y < bottom;
            
            if (sIn || tIn) {
              ctx.beginPath();
              ctx.moveTo(source.x, source.y);
              ctx.lineTo(target.x, target.y);
              ctx.stroke();
            }
          }
        });
      }

      // 3. Render Nodes with Batching and Culling
      let renderedCount = 0;
      const nodesByColor: Record<string, any[]> = {};

      data.nodes.forEach(node => {
        // Culling
        if (node.x < left || node.x > right || node.y < top || node.y > bottom) {
          return;
        }

        renderedCount++;
        const color = mode === 'workflow' 
          ? (NODE_COLORS[(node as any).status] || NODE_COLORS.idle)
          : (NODE_COLORS[node.type] || '#9CA3AF');
        
        if (!nodesByColor[color]) nodesByColor[color] = [];
        nodesByColor[color].push(node);
      });

      // Batch draw nodes by color
      Object.entries(nodesByColor).forEach(([color, nodes]) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        nodes.forEach(node => {
          const isHovered = node.id === interaction.hoveredNodeId;
          const size = (node.size || 5) * (isHovered ? 1.5 : 1);
          ctx.moveTo(node.x + size, node.y);
          ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
        });
        ctx.fill();
      });

      // 4. Detailed Pass (LOD: Labels, Selections)
      if (zoom > 0.6 || interaction.hoveredNodeId) {
        data.nodes.forEach(node => {
          if (node.x < left || node.x > right || node.y < top || node.y > bottom) return;

          const isHovered = node.id === interaction.hoveredNodeId;
          const isSelected = node.id === interaction.selectedNodeId;
          
          if (isSelected) {
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2 / zoom;
            ctx.beginPath();
            ctx.arc(node.x, node.y, (node.size || 5) * (isHovered ? 1.5 : 1), 0, Math.PI * 2);
            ctx.stroke();
          }

          // Labels only when zoomed in or hovered
          if (zoom > 0.8 || isHovered) {
            ctx.fillStyle = '#FFFFFF';
            const fontSize = Math.max(12 / zoom, 4);
            ctx.font = `${fontSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(node.label, node.x, node.y + ((node.size || 5) + fontSize) / zoom);
          }
        });
      }

      ctx.restore();
      
      setMetrics(m => ({ ...m, renderedNodes: renderedCount }));
      if (!isLoaded) setIsLoaded(true);
      
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [data, viewport, interaction, mode, isLoaded]);

  const handleWheel = (e: React.WheelEvent) => {
    const delta = -e.deltaY;
    const factor = Math.pow(1.1, delta / 100);
    const newZoom = Math.min(Math.max(viewport.zoom * factor, 0.05), 10);
    setZoom(newZoom);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setPan(viewport.pan.x + dx, viewport.pan.y + dy);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    } else {
      const canvas = canvasRef.current;
      if (!canvas || !data) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left - canvas.width / 2 - viewport.pan.x) / viewport.zoom;
      const y = (e.clientY - rect.top - canvas.height / 2 - viewport.pan.y) / viewport.zoom;
      
      // Optimization: Only check nodes that are likely to be visible
      const hoveredNode = data.nodes.find(node => {
        const dx = node.x - x;
        const dy = node.y - y;
        const size = node.size || 5;
        return (Math.abs(dx) < size * 2 && Math.abs(dy) < size * 2) && Math.sqrt(dx * dx + dy * dy) < size * 1.5;
      });
      
      hoverNode(hoveredNode?.id || null);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDragging) {
      setIsDragging(false);
    } else if (e.button === 0) {
      if (interaction.hoveredNodeId) {
        selectNode(interaction.hoveredNodeId);
        const node = data?.nodes.find(n => n.id === interaction.hoveredNodeId);
        if (node && onNodeClick) {
          onNodeClick(node);
        }
      } else {
        selectNode(null);
      }
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas.parentElement!);
    resize();

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0f172a]">
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#0f172a]">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="text-xs text-slate-400 font-medium">Loading Renderer...</span>
          </div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-crosshair"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsDragging(false);
          hoverNode(null);
        }}
      />

      <div className="absolute top-4 right-4 pointer-events-none flex flex-col items-end gap-1 font-mono text-[9px] text-slate-500 bg-slate-900/40 backdrop-blur-sm px-2 py-1.5 rounded-md border border-slate-800/50">
        <div className="flex gap-2">
          <span>FPS: <span className={cn(metrics.fps < 50 ? "text-orange-400" : "text-emerald-400")}>{metrics.fps}</span></span>
          <span>NODES: <span className="text-slate-300">{metrics.renderedNodes} / {data?.nodes.length || 0}</span></span>
        </div>
        <div className="opacity-60 uppercase tracking-widest">Canvas Optimized</div>
      </div>
    </div>
  );
};
