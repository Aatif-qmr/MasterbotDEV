use crate::modules::graphify::{engine::GraphEngine, parser::DependencyParser, types::GraphData};
use tauri::command;

#[command]
pub async fn generate_project_graph(project_root: String) -> Result<GraphData, String> {
    let mut parser = DependencyParser::new();
    let parsed_files = parser.scan_directory(&project_root)?;
    
    let mut engine = GraphEngine::new();
    engine.build_from_parsed_files(&parsed_files);
    engine.compute_force_directed_layout(50);
    
    Ok(engine.export_graph_data())
}
