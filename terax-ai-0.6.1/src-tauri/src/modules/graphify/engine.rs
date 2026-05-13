use std::collections::HashMap;
use petgraph::graph::{DiGraph, NodeIndex};
use rand::Rng;
use crate::modules::graphify::types::*;

pub struct GraphEngine {
    graph: DiGraph<GraphNode, GraphEdge>,
    node_map: HashMap<String, NodeIndex>,
}

impl GraphEngine {
    pub fn new() -> Self {
        Self {
            graph: DiGraph::new(),
            node_map: HashMap::new(),
        }
    }

    pub fn build_from_parsed_files(&mut self, files: &[ParsedFile]) {
        for file in files {
            let node = GraphNode {
                id: file.path.clone(),
                label: self.extract_filename(&file.path),
                file_path: file.path.clone(),
                node_type: NodeType::File,
                x: 0.0,
                y: 0.0,
                size: 10.0,
            };
            
            let idx = self.graph.add_node(node);
            self.node_map.insert(file.path.clone(), idx);
        }
        
        for file in files {
            let source_idx = match self.node_map.get(&file.path) {
                Some(idx) => *idx,
                None => continue,
            };
            
            for import in &file.dependencies.imports {
                // Simplified resolution for demo
                if let Some(target_idx) = self.node_map.get(&import.path) {
                    let edge = GraphEdge {
                        source: file.path.clone(),
                        target: import.path.clone(),
                        edge_type: EdgeType::Import,
                        weight: 1.0,
                    };
                    self.graph.add_edge(source_idx, *target_idx, edge);
                }
            }
        }
    }

    pub fn compute_force_directed_layout(&mut self, iterations: usize) {
        let mut rng = rand::thread_rng();
        let node_count = self.graph.node_count();
        if node_count == 0 { return; }

        for idx in self.graph.node_indices() {
            let node = self.graph.node_weight_mut(idx).unwrap();
            node.x = rng.gen_range(-100.0..100.0);
            node.y = rng.gen_range(-100.0..100.0);
        }
        
        let k = (1000.0 / node_count as f64).sqrt();
        let temperature = 100.0;
        
        for _ in 0..iterations {
            let mut displacements = HashMap::new();
            
            for i in self.graph.node_indices() {
                displacements.insert(i, (0.0, 0.0));
                
                for j in self.graph.node_indices() {
                    if i != j {
                        let node_i = self.graph.node_weight(i).unwrap();
                        let node_j = self.graph.node_weight(j).unwrap();
                        
                        let dx = node_i.x - node_j.x;
                        let dy = node_i.y - node_j.y;
                        let dist = (dx * dx + dy * dy).sqrt().max(0.01);
                        
                        let force = (k * k) / dist;
                        let fx = force * (dx / dist);
                        let fy = force * (dy / dist);
                        
                        let disp = displacements.get_mut(&i).unwrap();
                        disp.0 += fx;
                        disp.1 += fy;
                    }
                }
            }
            
            for edge_idx in self.graph.edge_indices() {
                let (source_idx, target_idx) = self.graph.edge_endpoints(edge_idx).unwrap();
                
                let node_source = self.graph.node_weight(source_idx).unwrap();
                let node_target = self.graph.node_weight(target_idx).unwrap();
                
                let dx = node_target.x - node_source.x;
                let dy = node_target.y - node_source.y;
                let dist = (dx * dx + dy * dy).sqrt().max(0.01);
                
                let force = (dist * dist) / k;
                let fx = force * (dx / dist);
                let fy = force * (dy / dist);
                
                let disp_source = displacements.get_mut(&source_idx).unwrap();
                disp_source.0 -= fx;
                disp_source.1 -= fy;
                
                let disp_target = displacements.get_mut(&target_idx).unwrap();
                disp_target.0 += fx;
                disp_target.1 += fy;
            }
            
            for idx in self.graph.node_indices() {
                let node = self.graph.node_weight_mut(idx).unwrap();
                let (dx, dy) = *displacements.get(&idx).unwrap();
                let dist = (dx * dx + dy * dy).sqrt().max(0.01);
                
                let limited_dist = dist.min(temperature);
                node.x += (dx / dist) * limited_dist;
                node.y += (dy / dist) * limited_dist;
            }
        }
    }

    pub fn export_graph_data(&self) -> GraphData {
        let nodes: Vec<GraphNode> = self.graph.node_weights().cloned().collect();
        let edges: Vec<GraphEdge> = self.graph.edge_weights().cloned().collect();
        
        GraphData {
            nodes: nodes.clone(),
            edges: edges.clone(),
            metadata: GraphMetadata {
                total_nodes: nodes.len(),
                total_edges: edges.len(),
                root_directory: String::new(),
                generated_at: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs(),
            },
        }
    }

    fn extract_filename(&self, path: &str) -> String {
        path.split('/').last().unwrap_or(path).to_string()
    }
}
