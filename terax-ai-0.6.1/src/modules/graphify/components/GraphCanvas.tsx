import React, { useRef, useEffect, useState } from 'react';
import { useGraphStore } from '../store/graphStore';
import { type GraphNode, type NodeType } from '../types';

const COLORS: Record<NodeType, string> = {
  file: '#3B82F6',
  function: '#10B981',
  class: '#8B5CF6',
  interface: '#F59E0B',
  export: '#EF4444',
};

interface GraphCanvasProps {
  onNodeClick?: (node: GraphNode) => void;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({ onNodeClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { 
    data, 
    viewport, 
    interaction, 
    setZoom, 
    setPan, 
    selectNode, 
    hoverNode 
  } = useGraphStore();
  
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const { width, height } = canvas;
      const { zoom, pan } = viewport;

      ctx.clearRect(0, 0, width, height);
      ctx.save();
      
      // Apply transform: center then pan then scale
      ctx.translate(width / 2 + pan.x, height / 2 + pan.y);
      ctx.scale(zoom, zoom);

      // Draw Edges
      ctx.strokeStyle = 'rgba(156, 163, 175, 0.3)';
      ctx.lineWidth = 1 / zoom;
      data.edges.forEach(edge => {
        const source = data.nodes.find(n => n.id === edge.source);
        const target = data.nodes.find(n => n.id === edge.target);
        if (source && target) {
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();
        }
      });

      // Draw Nodes
      data.nodes.forEach(node => {
        const isHovered = node.id === interaction.hoveredNodeId;
        const isSelected = node.id === interaction.selectedNodeId;
        
        ctx.fillStyle = COLORS[node.type] || '#9CA3AF';
        ctx.beginPath();
        const size = node.size || 5;
        ctx.arc(node.x, node.y, size * (isHovered ? 1.5 : 1), 0, Math.PI * 2);
        ctx.fill();

        if (isSelected) {
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2 / zoom;
          ctx.stroke();
        }

        // Draw Labels if zoomed in or hovered
        if (zoom > 0.8 || isHovered) {
          ctx.fillStyle = '#FFFFFF';
          // Scale font size inversely with zoom to keep it readable, but with a floor
          const fontSize = Math.max(12 / zoom, 4);
          ctx.font = `${fontSize}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(node.label, node.x, node.y + (size + fontSize) / zoom);
        }
      });

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [data, viewport, interaction]);

  const handleWheel = (e: React.WheelEvent) => {
    const delta = -e.deltaY;
    const factor = Math.pow(1.1, delta / 100);
    const newZoom = Math.min(Math.max(viewport.zoom * factor, 0.1), 5);
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
      
      const hoveredNode = data.nodes.find(node => {
        const dx = node.x - x;
        const dy = node.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < (node.size || 5) * 1.5; // Slightly larger hit area for hover
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
    <canvas
      ref={canvasRef}
      className="w-full h-full block cursor-crosshair"
      style={{ background: '#0f172a' }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        setIsDragging(false);
        hoverNode(null);
      }}
    />
  );
};
