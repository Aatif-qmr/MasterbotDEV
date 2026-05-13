use serde::{Serialize, Deserialize};
use std::fs;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ComplexityMetrics {
    pub cyclomatic_complexity: usize,
    pub nesting_depth: usize,
    pub lines_of_code: usize,
    pub estimated_tokens: usize,
    pub yield_score: usize,
    pub threshold_exceeded: bool,
}

pub fn analyze_complexity(path: &str) -> Result<ComplexityMetrics, String> {
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let char_count = content.len();
    
    let mut complexity = 1;
    let mut max_depth = 0;
    let mut current_depth = 0;
    let mut loc = 0;

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() { continue; }
        loc += 1;

        // Cyclomatic Complexity (Simplified: count keywords)
        // Matches if, for, while, catch, &&, ||, match arms (=>)
        if trimmed.contains("if ") || trimmed.contains("if(") || 
           trimmed.contains("for ") || trimmed.contains("for(") ||
           trimmed.contains("while ") || trimmed.contains("while(") ||
           trimmed.contains("catch") || 
           trimmed.contains("&&") || trimmed.contains("||") ||
           trimmed.contains("=>") {
            complexity += 1;
        }

        // Nesting Depth
        if trimmed.contains('{') {
            current_depth += 1;
            if current_depth > max_depth {
                max_depth = current_depth;
            }
        }
        if trimmed.contains('}') {
            current_depth = current_depth.saturating_sub(1);
        }
    }

    // Token estimation (approx 4 chars per token)
    let estimated_tokens = char_count / 4;
    
    // Yield score (mocked productivity ratio)
    // Higher complexity/nesting reduces efficiency
    let base_yield = 100_isize;
    let penalty = (complexity as isize * 3) + (max_depth as isize * 5);
    let yield_score = (base_yield - penalty).clamp(0, 100) as usize;

    Ok(ComplexityMetrics {
        cyclomatic_complexity: complexity,
        nesting_depth: max_depth,
        lines_of_code: loc,
        estimated_tokens,
        yield_score,
        threshold_exceeded: complexity > 15 || max_depth > 4 || yield_score < 60,
    })
}
