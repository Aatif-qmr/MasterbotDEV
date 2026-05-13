use tree_sitter::{Parser, Node};
use tree_sitter_typescript::TYPESCRIPT;
use walkdir::WalkDir;
use crate::modules::graphify::types::{FileDependencies, Dependency, ParsedFile};

pub struct DependencyParser {
    parser: Parser,
}

impl DependencyParser {
    pub fn new() -> Self {
        let mut parser = Parser::new();
        parser.set_language(&TYPESCRIPT.into()).expect("Failed to load TS grammar");
        Self { parser }
    }

    pub fn parse_file(&mut self, file_path: &str) -> Result<FileDependencies, String> {
        let content = std::fs::read_to_string(file_path)
            .map_err(|e| format!("Failed to read file: {}", e))?;
        
        let tree = self.parser.parse(&content, None)
            .ok_or("Failed to parse syntax tree")?;
        
        let root = tree.root_node();
        let mut imports = Vec::new();
        let mut exports = Vec::new();
        
        self.extract_imports_exports(root, &content, &mut imports, &mut exports);
        
        Ok(FileDependencies { imports, exports })
    }

    pub fn scan_directory(&mut self, root_dir: &str) -> Result<Vec<ParsedFile>, String> {
        let mut files = Vec::new();
        
        for entry in WalkDir::new(root_dir)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| {
                e.path().extension()
                    .map(|ext| ext == "ts" || ext == "tsx" || ext == "js" || ext == "jsx")
                    .unwrap_or(false)
            })
        {
            if let Ok(deps) = self.parse_file(entry.path().to_str().unwrap()) {
                files.push(ParsedFile {
                    path: entry.path().to_str().unwrap().to_string(),
                    dependencies: deps,
                });
            }
        }
        
        Ok(files)
    }

    fn extract_imports_exports<'a>(&self, node: Node<'a>, source: &'a str, imports: &mut Vec<Dependency>, exports: &mut Vec<Dependency>) {
        let mut cursor = node.walk();
        for child in node.children(&mut cursor) {
            match child.kind() {
                "import_statement" => {
                    if let Some(path) = self.get_string_literal(child.child_by_field_name("source"), source) {
                        imports.push(Dependency { path, specifiers: Vec::new() });
                    }
                }
                "export_declaration" | "export_statement" => {
                    // Logic to extract exports if needed
                }
                _ => {}
            }
            self.extract_imports_exports(child, source, imports, exports);
        }
    }

    fn get_string_literal(&self, node: Option<Node>, source: &str) -> Option<String> {
        node.map(|n| {
            let text = &source[n.start_byte()..n.end_byte()];
            text.trim_matches(|c| c == '\'' || c == '"').to_string()
        })
    }
}
