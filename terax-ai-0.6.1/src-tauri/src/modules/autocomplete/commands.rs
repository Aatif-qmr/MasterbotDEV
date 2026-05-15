use crate::modules::autocomplete::types::{AutocompleteContext, SuggestionResult};
use serde_json::json;
use tauri::{AppHandle, Manager};
use std::fs;
use serde::Deserialize;

#[derive(Deserialize)]
struct AuthToken {
    access_token: String,
}

fn load_token_from_file() -> Result<String, String> {
    let file_path = dirs::home_dir()
        .ok_or("Could not find home directory")?
        .join(".ccliconfig")
        .join("auth.json");
    let json = fs::read_to_string(file_path).map_err(|e| e.to_string())?;
    let token: AuthToken = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    Ok(token.access_token)
}

#[tauri::command]
pub async fn ac_get_suggestion(
    app: AppHandle,
    context: AutocompleteContext,
) -> Result<SuggestionResult, String> {
    // 1. Get OAuth token from CCli
    let token_string = load_token_from_file()?;

    // 2. Construct optimized prompt
    let mut prompt = format!(
        "You are an expert programmer. Complete the next line of code based on the following context.\n\n"
    );

    if !context.related_files.is_empty() {
        prompt.push_str("### RELEVANT FILES\n");
        for file in context.related_files {
            prompt.push_str(&format!("File: {}\n```\n{}\n```\n", file.path, file.content));
        }
        prompt.push_str("\n");
    }

    prompt.push_str(&format!(
        "### CURRENT FILE ({})\n```{}\n{}\n```\n\nInstruction: Provide ONLY the completion for the next line. No explanations, no markdown blocks. Just the raw code that follows the prefix.",
        context.file_path, context.language, context.prefix
    ));

    // 3. Call Gemini API (Flash model for low latency)
    let client = reqwest::Client::new();
    let response = client
        .post("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent")
        .query(&[("key", &token_string)])
        .json(&json!({
            "contents": [{
                "parts": [{
                    "text": prompt
                }]
            }],
            "generationConfig": {
                "maxOutputTokens": 30,
                "temperature": 0.1,
                "topP": 0.95,
            }
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        let status = response.status();
        let err_text = response.text().await.unwrap_or_default();
        return Err(format!("Gemini API error: {} - {}", status, err_text));
    }

    let res_json: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
    
    // Extract text from Gemini response
    let suggestion = res_json["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .unwrap_or("")
        .trim_matches('`')
        .trim()
        .to_string();

    Ok(SuggestionResult {
        text: suggestion,
        confidence: 0.9, // Heuristic for now
    })
}
