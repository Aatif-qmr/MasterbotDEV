pub mod complexity;

use tauri::command;
use self::complexity::{analyze_complexity, ComplexityMetrics};

#[command]
pub async fn analyze_file_complexity(path: String) -> Result<ComplexityMetrics, String> {
    analyze_complexity(&path)
}
