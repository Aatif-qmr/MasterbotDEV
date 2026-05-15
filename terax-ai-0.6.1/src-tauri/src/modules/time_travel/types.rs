use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StateSnapshot {
    pub id: String, // UUID
    pub project_path: String,
    pub timestamp: i64,
    pub chat_state: Vec<u8>, // Zstd compressed JSON
    pub editor_state: Vec<u8>, // Zstd compressed JSON
    pub label: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[allow(dead_code)]
pub enum CommandType {
    ChatMessage,
    CodeEdit,
    FileCreate,
    FileDelete,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[allow(dead_code)]
pub struct CommandLog {
    pub id: String,
    pub project_path: String,
    pub snapshot_id: String,
    pub command_type: CommandType,
    pub payload: String,
    pub inverse_payload: String,
    pub timestamp: i64,
}
