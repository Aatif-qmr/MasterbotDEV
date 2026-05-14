use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DbMessage {
    pub id: String,
    pub role: String, // "user" | "assistant" | "system"
    pub content: String, // JSON string of UIMessagePart[]
    pub tool_calls: Option<String>, // JSON string of ToolCall[]
    pub timestamp: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectContext {
    pub project_path: String,
    pub db_path: String,
}
