use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum NodeType {
    File,
    Function,
    Class,
    Interface,
    Export,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EdgeType {
    Import,
    Export,
    Extends,
    Implements,
    Calls,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphNode {
    pub id: String,
    pub label: String,
    pub file_path: String,
    pub node_type: NodeType,
    pub x: f64,
    pub y: f64,
    pub size: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphEdge {
    pub source: String,
    pub target: String,
    pub edge_type: EdgeType,
    pub weight: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphMetadata {
    pub total_nodes: usize,
    pub total_edges: usize,
    pub root_directory: String,
    pub generated_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphData {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
    pub metadata: GraphMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeDetails {
    pub id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedFile {
    pub path: String,
    pub dependencies: FileDependencies,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileDependencies {
    pub imports: Vec<Dependency>,
    pub exports: Vec<Dependency>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Dependency {
    pub path: String,
    pub specifiers: Vec<String>,
}
