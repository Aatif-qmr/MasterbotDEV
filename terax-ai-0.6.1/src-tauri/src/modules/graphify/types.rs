use serde::{Serialize, Deserialize};
use schemars::JsonSchema;

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum NodeType {
    File,
    Function,
    Class,
    Interface,
    Export,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum EdgeType {
    Import,
    Export,
    Extends,
    Implements,
    Calls,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct GraphNode {
    pub id: String,
    pub label: String,
    #[serde(rename = "filePath")]
    pub file_path: String,
    #[serde(rename = "type")]
    pub node_type: NodeType,
    pub x: f64,
    pub y: f64,
    pub size: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct GraphEdge {
    pub source: String,
    pub target: String,
    #[serde(rename = "type")]
    pub edge_type: EdgeType,
    pub weight: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct GraphMetadata {
    pub total_nodes: usize,
    pub total_edges: usize,
    pub root_directory: String,
    pub generated_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct GraphData {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
    pub metadata: GraphMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct GraphModuleSchema {
    pub data: GraphData,
    pub viewport: ViewportState,
    pub interaction: InteractionState,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ViewportState {
    pub zoom: f64,
    pub pan: Point,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct InteractionState {
    pub selected_node_id: Option<String>,
    pub hovered_node_id: Option<String>,
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
