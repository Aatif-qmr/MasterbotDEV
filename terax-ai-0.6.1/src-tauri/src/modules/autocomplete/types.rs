use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct SuggestionResult {
    pub text: String,
    pub confidence: f32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AutocompleteContext {
    pub file_path: String,
    pub prefix: String,
    pub language: String,
    pub related_files: Vec<RelatedFile>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RelatedFile {
    pub path: String,
    pub content: String,
}
