export interface GraphNode {
  id: string;
  label: string;
  filePath: string;
  nodeType: 'File' | 'Component' | 'Function';
}

export interface GraphEdge {
  source: string;
  target: string;
  edgeType: 'Import' | 'Export' | 'Call';
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ViewportState {
  zoom: number;
  pan: { x: number; y: number };
}

export interface InteractionState {
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
}
