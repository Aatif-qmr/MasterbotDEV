import React, { useEffect } from 'react';
import { GraphCanvas } from './GraphCanvas';
import { useGraphStore } from '../store/graphStore';

interface GraphViewProps {
  projectRoot: string;
  onOpenFile: (path: string) => void;
}

export const GraphView: React.FC<GraphViewProps> = ({ projectRoot, onOpenFile }) => {
  const { loadGraph, isLoading, error, data } = useGraphStore();

  useEffect(() => {
    if (projectRoot) {
      loadGraph(projectRoot);
    }
  }, [projectRoot, loadGraph]);

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0f172a] text-slate-400">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p>Generating project graph...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0f172a] text-red-400 p-8 text-center">
        <div>
          <h2 className="text-xl font-bold mb-2">Failed to generate graph</h2>
          <p className="opacity-80">{error}</p>
          <button 
            onClick={() => loadGraph(projectRoot)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <GraphCanvas onNodeClick={(node) => onOpenFile(node.filePath)} />
      
      {/* Overlay UI */}
      <div className="absolute top-4 left-4 p-3 bg-slate-900/80 backdrop-blur border border-slate-700 rounded-lg shadow-xl pointer-events-none">
        <h2 className="text-sm font-semibold text-slate-200 mb-2">Project Dependency Graph</h2>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="w-2 h-2 rounded-full bg-[#3B82F6]"></div>
            <span>Files</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="w-2 h-2 rounded-full bg-[#10B981]"></div>
            <span>Functions</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="w-2 h-2 rounded-full bg-[#8B5CF6]"></div>
            <span>Classes</span>
          </div>
        </div>
        {data && (
          <div className="mt-3 pt-3 border-t border-slate-700 text-[10px] text-slate-500">
            {data.metadata.totalNodes} nodes • {data.metadata.totalEdges} edges
          </div>
        )}
      </div>

      <div className="absolute bottom-4 right-4 text-[10px] text-slate-500 bg-slate-900/50 px-2 py-1 rounded">
        Scroll to zoom • Drag to pan • Click to open
      </div>
    </div>
  );
};
