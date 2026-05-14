#[path = "src/modules/graphify/types.rs"]
mod types;

use std::fs::File;
use std::io::Write;
use std::path::Path;
use schemars::schema_for;
use types::GraphModuleSchema;

fn main() {
    // Generate JSON Schema for Graphify Module
    let schema = schema_for!(GraphModuleSchema);
    let schema_json = serde_json::to_string_pretty(&schema).unwrap();
    
    // Path to the frontend module where schema should be saved
    let out_dir = Path::new("..").join("src").join("modules").join("graphify");
    let dest_path = out_dir.join("schema.json");
    
    let mut file = File::create(dest_path).unwrap();
    file.write_all(schema_json.as_bytes()).unwrap();

    tauri_build::build();
}
