export type NodeType = 'file' | 'function' | 'class' | 'interface' | 'export';
export type EdgeType = 'import' | 'export' | 'extends' | 'implements' | 'calls';

export interface GraphNode {
  id: string;
  label: string;
  filePath: string;
  type: NodeType;
  x: number;
  y: number;
  size: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: EdgeType;
  weight: number;
}

export interface GraphMetadata {
  totalNodes: number;
  totalEdges: number;
  rootDirectory: string;
  generatedAt: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: GraphMetadata;
}

export interface ViewportState {
  zoom: number;
  pan: { x: number; y: number };
}

export interface InteractionState {
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
}
