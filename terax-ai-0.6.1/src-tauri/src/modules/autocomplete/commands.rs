use crate::modules::auth::commands::oauth_get_token;
use crate::modules::autocomplete::types::{AutocompleteContext, SuggestionResult};
use serde_json::json;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub async fn ac_get_suggestion(
    app: AppHandle,
    context: AutocompleteContext,
) -> Result<SuggestionResult, String> {
    // 1. Get OAuth token
    let token = oauth_get_token(app.state()).await?
        .ok_or("Not logged in")?;

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
        .query(&[("key", &token.access_token)])
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
