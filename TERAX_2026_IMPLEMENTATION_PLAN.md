--- TERAX_2026_IMPLEMENTATION_PLAN.md (原始)


+++ TERAX_2026_IMPLEMENTATION_PLAN.md (修改后)
# Terax AI 2026 - Comprehensive Implementation Plan

## Executive Summary

**Vision**: Transform Terax AI from a terminal emulator with chat into a native IDE where Gemini is the sole AI agent with complete filesystem/shell control, optimized for Apple M1 8GB RAM, using official Google OAuth authentication.

**Current State**: Partial Gemini integration scaffolding exists but relies on Vercel AI SDK as middleware. No real OAuth, no session persistence, no true IDE features.

**Target**: Single Rust binary with embedded Monaco editor, direct Google SDK integration, SQLite + vec0 for vector search, <100MB idle RAM.

---

## Part 1: Current Project State Analysis

### ✅ What's Already Built

#### 1. Tauri v2 Application Structure
- **Location**: `/workspace/terax-ai-0.6.1/`
- **Frontend**: React 19 + TypeScript + Tailwind v4 + CodeMirror 6
- **Backend**: Rust (Tauri v2.0) with native modules
- **Platform Support**: macOS (primary), Windows, Linux

#### 2. Native Rust Modules (`src-tauri/src/modules/`)
```
modules/
├── fs/           # Filesystem operations
│   ├── file.rs   # read/write files
│   ├── tree.rs   # directory tree listing
│   ├── mutate.rs # create/rename/delete
│   ├── search.rs # semantic search stub
│   └── grep.rs   # regex/glob search
├── shell/        # Shell command execution
│   ├── commands.rs
│   └── sessions.rs
├── pty/          # Pseudo-terminal management
├── secrets.rs    # API key storage (macOS Keychain)
└── net.rs        # HTTP utilities
```

**Key Features Working**:
- ✅ Native file read/write/create/delete/rename
- ✅ Shell command execution with background processes
- ✅ PTY terminal emulation (xterm.js)
- ✅ Secret storage via macOS Keychain (no plaintext configs)
- ✅ Multi-tab UI with terminal + chat split view
- ✅ Settings window with API key management

#### 3. Gemini Integration Scaffolding (`src/modules/ai/lib/gemini/`)

**Files Present**:
- `types.ts` (3.7KB) - Type definitions for Gemini events, tools, sessions
- `native.ts` (8.9KB) - Terax-native filesystem/shell adapters
- `session.ts` (11.9KB) - `GeminiAgent` and `GeminiSession` classes
- `transport.ts` (3.1KB) - Bridges Gemini to Vercel AI SDK
- `index.ts` (1.7KB) - Public API exports

**What These Files Actually Do**:
```typescript
// Current architecture (INCOMPLETE):
User Input → Vercel AI SDK → Gemini API (via @ai-sdk/google)
                ↓
        buildTools() → Terax native commands
```

**Critical Limitation**: The current implementation uses `@ai-sdk/google` (Vercel's wrapper) instead of direct `@google/genai` SDK. This means:
- ❌ No official Google OAuth flow
- ❌ No access to latest Gemini CLI features
- ❌ Middleware overhead
- ❌ Limited tool call precision

#### 4. Dependencies Analysis

**package.json** (Current AI-related deps):
```json
{
  "@ai-sdk/anthropic": "^3.0.71",
  "@ai-sdk/google": "^3.0.64",      // ← Vercel wrapper, NOT official SDK
  "@ai-sdk/openai": "^3.0.53",
  "@ai-sdk/react": "^3.0.170",
  "ai": "^6.0.168",                 // ← Vercel AI SDK core
  // ... multi-provider support still present
}
```

**Cargo.toml** (Rust deps):
```toml
[dependencies]
tauri = "2"
keyring = "3.6"         # ✅ macOS Keychain working
tauri-plugin-store = "2" # ⚠️ Could be replaced with SQLite
# Missing: rusqlite, tree-sitter, oauth2
```

#### 5. Authentication Status

**Current**:
- API keys stored in macOS Keychain via `secrets.rs`
- User manually enters Gemini API key in settings
- ❌ No OAuth browser flow
- ❌ No Google account sign-in
- ❌ No token refresh mechanism

**Required**:
- Official Google OAuth 2.0 with browser popup
- Access token + refresh token storage in Keychain
- Automatic token renewal
- Support for Gemini Advanced (Pro) accounts

#### 6. Session Management Status

**Current** (`session.ts` lines 61-65):
```typescript
async resumeSession(sessionId: string): Promise<GeminiSession> {
  // For now, create a new session with the given ID
  // In the future, this should load history from a persistent store
  return new GeminiSession(this.options, sessionId, this);
}
```

**Problem**:
- ❌ No persistence layer implemented
- ❌ Conversation history lost on app restart
- ❌ No SQLite database created
- ❌ `tauri-plugin-store` not actually used for sessions

#### 7. Skills System Status

**Current** (`session.ts` lines 119-144):
```typescript
private async loadWorkspaceSkills(): Promise<void> {
  const skillsDir = `${workspaceRoot}/.gemini/skills`;
  const entries = await native.readDir(skillsDir);
  // Parses SKILL.md files...
}
```

**Problem**:
- ✅ Parser logic exists
- ❌ No `.gemini/skills` directory structure created
- ❌ No skill examples provided
- ❌ No UI for managing skills
- ❌ Not tested or documented

#### 8. IDE Features Status

**Current Editor**: CodeMirror 6 (`@uiw/react-codemirror`)
- ✅ Syntax highlighting for 10+ languages
- ✅ Basic autocomplete
- ✅ Theme support (GitHub, Nord, Tokyo Night, etc.)

**Missing IDE Features**:
- ❌ No Monaco Editor (VS Code's engine)
- ❌ No split-pane file explorer
- ❌ No inline AI edits (diff view acceptance)
- ❌ No multi-file context awareness
- ❌ No symbol navigation (go to definition)
- ❌ No integrated debugger
- ❌ No problem diagnostics panel

---

## Part 2: Critical Gaps Summary

| Component | Status | Priority | Effort |
|-----------|--------|----------|--------|
| **Direct Gemini SDK** | ❌ Missing (using Vercel wrapper) | P0 | 3 days |
| **Google OAuth Flow** | ❌ Not implemented | P0 | 2 days |
| **SQLite Persistence** | ❌ Not implemented | P0 | 2 days |
| **Session History Load/Save** | ❌ Stub only | P0 | 1 day |
| **Monaco Editor Integration** | ❌ Using CodeMirror | P1 | 4 days |
| **Split-Pane IDE Layout** | ❌ Terminal+chat only | P1 | 3 days |
| **Graphify Integration** | ❌ Not started | P2 | 5 days |
| **Open Design Integration** | ❌ Not started | P2 | 5 days |
| **Dify Workflow Engine** | ❌ Not started | P2 | 4 days |
| **M1 Memory Optimization** | ❌ Not optimized | P1 | 3 days |
| **Custom Tool Suite** | ❌ Partial (grep exists) | P2 | 7 days |
| **Time Travel / Undo** | ❌ Not started | P3 | 5 days |
| **Apple Handoff** | ❌ Not started | P3 | 3 days |
| **Test Suite** | ❌ Zero tests | P1 | 5 days |

---

## Part 3: Recommended Architecture (2026 Standard)

### Target Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Terax AI 2026                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  Frontend (React + Monaco)            │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────┐ │  │
│  │  │ File Explorer│  │ Monaco Editor│  │ Chat Panel    │ │  │
│  │  │ (Split Pane) │  │ (Inline Edits)│  │ (Gemini Only) │ │  │
│  │  └─────────────┘  └─────────────┘  └───────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
│                            ↓ Tauri IPC                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Rust Core (Single Binary)                │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  Gemini Native Host (Direct @google/genai)      │  │  │
│  │  │  - OAuth Token Management                        │  │  │
│  │  │  - Session State Machine                         │  │  │
│  │  │  - Tool Call Router                              │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐   │  │
│  │  │ SQLite + vec0│  │ Tree-sitter  │  │ Custom     │   │  │
│  │  │ (Sessions,   │  │ (Parsing)    │  │ Tools      │   │  │
│  │  │  Vectors)    │  │              │  │            │   │  │
│  │  └──────────────┘  └──────────────┘  └────────────┘   │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  Native OS Access                               │  │  │
│  │  │  - Filesystem (tokio + mmap)                    │  │  │
│  │  │  - Shell (portable-pty sandboxed)               │  │  │
│  │  │  - Keychain (credentials)                       │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                            ↓                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              External Services                        │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  │  │
│  │  │ Google OAuth│  │ Gemini API  │  │ Graphify     │  │  │
│  │  │ (Browser)   │  │ (gRPC/HTTP2)│  │ (WASM/Rust)  │  │  │
│  │  └─────────────┘  └─────────────┘  └──────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

#### 1. Remove Vercel AI SDK Completely
**Why**: Unnecessary abstraction layer, limits access to latest Gemini features, adds bundle size.

**Replace with**:
```rust
// Rust side: Direct Google SDK via reqwest
use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct GeminiRequest {
    contents: Vec<Content>,
    tools: Vec<Tool>,
    system_instruction: Option<SystemInstruction>,
}

// Or use official Node SDK directly in frontend
import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: await getOAuthToken() });
```

#### 2. SQLite with vec0 Extension
**Schema Design**:
```sql
-- Sessions table
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    model_id TEXT,
    workspace_root TEXT
);

-- Messages table
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user', 'model')),
    content TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    tool_calls_json TEXT,  -- JSON array of tool calls
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Vector embeddings for semantic search
CREATE VIRTUAL TABLE message_embeddings USING vec0(
    embedding FLOAT[768],
    message_id INTEGER,
    session_id TEXT
);

-- Skills cache
CREATE TABLE skills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    instructions TEXT NOT NULL,
    path TEXT UNIQUE,
    loaded_at INTEGER
);
```

**Rust Implementation** (`src-tauri/src/modules/db.rs`):
```rust
use rusqlite::{Connection, Result};
use rusqlite::vtab::vec;

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn init(app_handle: &tauri::AppHandle) -> Result<Self> {
        let db_path = app_handle
            .path()
            .app_data_dir()?
            .join("terax.db");

        let mut conn = Connection::open(&db_path)?;

        // Enable WAL mode for better concurrency
        conn.execute("PRAGMA journal_mode=WAL", [])?;
        conn.execute("PRAGMA synchronous=NORMAL", [])?;
        conn.execute("PRAGMA cache_size=-64000", [])?; // 64MB cache

        // Load vec0 extension
        vec::register_module(&conn)?;

        // Create tables
        Self::create_tables(&mut conn)?;

        Ok(Database { conn })
    }

    pub fn save_session(&self, session: &Session) -> Result<()> {
        let tx = self.conn.transaction()?;
        tx.execute(
            "INSERT OR REPLACE INTO sessions (id, title, created_at, updated_at, model_id, workspace_root)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![session.id, session.title, session.created_at, session.updated_at, session.model_id, session.workspace_root],
        )?;
        tx.commit()?;
        Ok(())
    }

    pub fn load_session(&self, session_id: &str) -> Result<Option<Session>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, title, created_at, updated_at, model_id, workspace_root
             FROM sessions WHERE id = ?1"
        )?;
        let session = stmt.query_row(params![session_id], |row| {
            Ok(Session {
                id: row.get(0)?,
                title: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
                model_id: row.get(4)?,
                workspace_root: row.get(5)?,
            })
        }).optional()?;
        Ok(session)
    }

    pub fn semantic_search(&self, query_embedding: &[f32], limit: usize) -> Result<Vec<Message>> {
        let mut stmt = self.conn.prepare(
            "SELECT m.id, m.session_id, m.role, m.content, m.timestamp
             FROM messages m
             JOIN message_embeddings e ON m.id = e.message_id
             WHERE distance_cosine(e.embedding, ?1) < 0.3
             ORDER BY distance_cosine(e.embedding, ?1)
             LIMIT ?2"
        )?;
        let rows = stmt.query_map(params![query_embedding, limit], |row| {
            Ok(Message {
                id: row.get(0)?,
                session_id: row.get(1)?,
                role: row.get(2)?,
                content: row.get(3)?,
                timestamp: row.get(4)?,
            })
        })?;
        rows.collect()
    }
}
```

#### 3. OAuth 2.0 Flow Implementation

**Frontend Trigger** (`src/modules/auth/oauth.ts`):
```typescript
import { invoke } from '@tauri-apps/api/core';

export async function startGoogleOAuth(): Promise<string> {
  // Open browser via Tauri opener plugin
  const authUrl = await invoke<string>('start_oauth_flow');

  // Tauri will open default browser automatically
  // User signs in with Google Pro account
  // Browser redirects to localhost callback

  // Wait for callback via Tauri event
  return new Promise((resolve, reject) => {
    const unsubscribe = listen('oauth-callback', (event) => {
      const { access_token, refresh_token, expires_in } = event.payload;

      // Store securely in Keychain
      invoke('store_google_tokens', {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: Date.now() + expires_in * 1000,
      });

      resolve(access_token);
      unsubscribe();
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      reject(new Error('OAuth timeout'));
      unsubscribe();
    }, 300000);
  });
}
```

**Rust OAuth Handler** (`src-tauri/src/modules/auth/oauth.rs`):
```rust
use oauth2::basic::BasicClient;
use oauth2::{
    AuthUrl, ClientId, ClientSecret, RedirectUrl, Scope, TokenUrl,
    CsrfToken, AuthorizationCode, PkceCodeChallenge,
};
use tauri::{Manager, Emitter};

const GOOGLE_CLIENT_ID: &str = env!("GOOGLE_OAUTH_CLIENT_ID");
const GOOGLE_CLIENT_SECRET: &str = env!("GOOGLE_OAUTH_CLIENT_SECRET");

#[tauri::command]
pub async fn start_oauth_flow(app: AppHandle) -> Result<String, String> {
    let client = BasicClient::new(
        ClientId::new(GOOGLE_CLIENT_ID.to_string()),
        Some(ClientSecret::new(GOOGLE_CLIENT_SECRET.to_string())),
        AuthUrl::new("https://accounts.google.com/o/oauth2/v2/auth".to_string()).unwrap(),
        Some(TokenUrl::new("https://oauth2.googleapis.com/token".to_string()).unwrap()).unwrap(),
    )
    .set_redirect_uri(RedirectUrl::new("http://localhost:14523/callback".to_string()).unwrap());

    let scopes = vec![
        "https://www.googleapis.com/auth/cloud-platform",
        "https://www.googleapis.com/auth/generative-language",
    ];

    let (pkce_challenge, pkce_verifier) = PkceCodeChallenge::new_random_sha256();

    let (auth_url, csrf_token) = client
        .authorize_url(CsrfToken::new_random)
        .add_scopes(scopes.into_iter().map(|s| Scope::new(s.to_string())))
        .set_pkce_challenge(pkce_challenge)
        .url();

    // Store PKCE verifier for callback validation
    app.manage(OAuthState {
        csrf_token,
        pkce_verifier,
    });

    // Open browser
    opener::open(auth_url.as_str()).map_err(|e| e.to_string())?;

    // Start local HTTP server to catch callback
    tokio::spawn(async move {
        listen_for_callback(app).await;
    });

    Ok(auth_url.to_string())
}

async fn listen_for_callback(app: AppHandle) {
    use axum::{routing::get, Router, extract::Query};
    use serde::Deserialize;

    #[derive(Deserialize)]
    struct CallbackParams {
        code: String,
        state: String,
    }

    let app_state = app.clone();
    let router = Router::new().route(
        "/callback",
        get(move |Query(params): Query<CallbackParams>| async move {
            // Exchange code for tokens
            let tokens = exchange_code_for_tokens(params.code, /* pkce_verifier */).await;

            // Emit to frontend
            app_state.emit("oauth-callback", tokens).unwrap();

            "Authentication successful! You can close this window."
        }),
    );

    let listener = tokio::net::TcpListener::bind("127.0.0.1:14523").await.unwrap();
    axum::serve(listener, router).await.unwrap();
}
```

#### 4. Monaco Editor Integration

**Replace CodeMirror** (`src/components/editor/MonacoEditor.tsx`):
```tsx
import { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') return new jsonWorker();
    if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker();
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker();
    if (label === 'typescript' || label === 'javascript') return new tsWorker();
    return new editorWorker();
  },
};

interface MonacoEditorProps {
  value: string;
  language: string;
  onChange: (value: string) => void;
  onAIEdit?: (edits: monaco.editor.IIdentifiedSingleEditOperation[]) => void;
}

export function MonacoEditor({ value, language, onChange, onAIEdit }: MonacoEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    editorRef.current = monaco.editor.create(containerRef.current, {
      value,
      language,
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 14,
      scrollBeyondLastLine: false,
      renderWhitespace: 'selection',
      suggest: {
        showKeywords: true,
        showSnippets: true,
      },
    });

    editorRef.current.onDidChangeModelContent(() => {
      const newValue = editorRef.current!.getValue();
      onChange(newValue);
    });

    // Register AI edit command
    monaco.editor.registerCommand('ai.applyEdits', (accessor, edits) => {
      onAIEdit?.(edits as monaco.editor.IIdentifiedSingleEditOperation[]);
      return undefined;
    });

    return () => {
      editorRef.current?.dispose();
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
}
```

---

## Part 4: Phase-by-Phase Roadmap

### Phase 1: Foundation (Week 1-3) - P0 Critical

#### Week 1: Direct Gemini SDK + OAuth
**Goals**:
- [ ] Remove all `@ai-sdk/*` dependencies
- [ ] Install `@google/genai` official SDK
- [ ] Implement OAuth browser flow (Rust + frontend)
- [ ] Store tokens in macOS Keychain
- [ ] Test with Gemini Advanced account

**Deliverables**:
- Working Google sign-in popup
- Token auto-refresh mechanism
- Direct Gemini API calls without Vercel middleware

#### Week 2: SQLite Persistence Layer
**Goals**:
- [ ] Add `rusqlite` + `sqlite-vec` to Cargo.toml
- [ ] Create database schema (sessions, messages, embeddings)
- [ ] Implement CRUD operations for sessions
- [ ] Auto-save conversation history
- [ ] Load sessions on app startup

**Deliverables**:
- Persistent session list in sidebar
- Resume conversations after restart
- Semantic search across past chats

#### Week 3: Session Management UI
**Goals**:
- [ ] Sidebar with session list (sorted by date)
- [ ] Search/filter sessions
- [ ] Delete/archive sessions
- [ ] Export session to Markdown
- [ ] Session metadata (model used, token count, duration)

**Deliverables**:
- Complete session management interface
- One-click resume any past conversation

---

### Phase 2: IDE Transformation (Week 4-7) - P1 High

#### Week 4-5: Monaco Editor Integration
**Goals**:
- [ ] Replace CodeMirror with Monaco Editor
- [ ] Configure workers for TS/JS/CSS/HTML/Python/Rust
- [ ] Add IntelliSense, go-to-definition, find references
- [ ] Implement inline AI edits with diff preview
- [ ] Add AI chat context from selected code

**Deliverables**:
- VS Code-like editing experience
- Accept/reject AI suggestions inline

#### Week 6: Split-Pane IDE Layout
**Goals**:
- [ ] Three-pane layout: File Explorer | Editor | Chat
- [ ] Resizable panes (react-resizable-panels)
- [ ] File tree with git status indicators
- [ ] Tabbed editor (multiple files open)
- [ ] Breadcrumb navigation

**Deliverables**:
- Professional IDE interface
- Seamless workflow between browsing, editing, chatting

#### Week 7: M1 Memory Optimization
**Goals**:
- [ ] Profile memory usage with Instruments
- [ ] Implement lazy loading for large files (>10MB)
- [ ] Use memory-mapped files (mmap) for reads
- [ ] Optimize Monaco worker threads
- [ ] Set RAM budget: <100MB idle, <500MB active

**Deliverables**:
- Smooth performance on 8GB MacBook Air
- No lag when opening large projects

---

### Phase 3: Ecosystem Integration (Week 8-14) - P2 Medium

#### Week 8-9: Graphify Integration
**Goals**:
- [ ] Embed tree-sitter parsers (Rust)
- [ ] Build knowledge graph of codebase
- [ ] Store graph in SQLite
- [ ] Expose to Gemini as tool: `search_symbols(query)`
- [ ] Visualize graph in sidebar (force-directed layout)

**Deliverables**:
- Instant code navigation via semantic search
- Gemini understands entire project structure

#### Week 10-11: Open Design Integration
**Goals**:
- [ ] Port design skills as WASM modules
- [ ] Add canvas component for live preview
- [ ] Implement design-to-code generation
- [ ] Brand token system (colors, typography, spacing)
- [ ] Hot-reload design changes

**Deliverables**:
- Generate UI components from descriptions
- Live preview of generated designs

#### Week 12-14: Dify Workflow Engine
**Goals**:
- [ ] Embed Dify workflow logic as Rust state machine
- [ ] Multi-agent orchestration (Architect, Coder, Critic)
- [ ] Visual workflow builder (drag-drop nodes)
- [ ] Save/load workflows as JSON
- [ ] Execute workflows with single command

**Deliverables**:
- Complex task automation
- Reusable workflow templates

---

### Phase 4: Advanced Features (Week 15-18) - P3 Low

#### Week 15-16: Time Travel & Undo
**Goals**:
- [ ] Track all file changes in SQLite
- [ ] Semantic undo (by logical change, not keystroke)
- [ ] Branching timelines (what-if scenarios)
- [ ] Compare versions with diff viewer
- [ ] Restore any previous state

**Deliverables**:
- Never lose work again
- Experiment freely with confidence

#### Week 17: Apple Ecosystem Integration
**Goals**:
- [ ] Implement Apple Handoff API
- [ ] Continue editing on iPhone/iPad
- [ ] macOS Shortcuts actions
- [ ] Share extensions (send code to Terax)
- [ ] iCloud sync for settings (not code)

**Deliverables**:
- Seamless cross-device workflow

#### Week 18: Security Hardening
**Goals**:
- [ ] Sandboxed shell execution (seatbelt profiles)
- [ ] Encrypted SQLite database (SQLCipher)
- [ ] Audit log for all AI actions
- [ ] Permission prompts for sensitive operations
- [ ] Security scan before executing AI-generated code

**Deliverables**:
- Enterprise-grade security
- Compliance ready

---

### Phase 5: Polish & Launch (Week 19-20)

#### Week 19: Testing
**Goals**:
- [ ] Unit tests for all Rust modules (cargo test)
- [ ] Integration tests for Gemini flows
- [ ] E2E tests with Playwright
- [ ] Performance benchmarks
- [ ] Memory leak detection

**Coverage Target**: >80%

#### Week 20: Documentation & Community
**Goals**:
- [ ] Write user guide (mdbook)
- [ ] API documentation (rustdoc + typedoc)
- [ ] Video tutorials
- [ ] Example projects
- [ ] GitHub Actions CI/CD
- [ ] Homebrew formula for macOS

**Deliverables**:
- Production-ready release
- Community contribution guidelines

---

## Part 5: Custom Tool Suite Specifications

### TeraxGrep (Semantic Search)
```rust
// src-tauri/src/tools/grep.rs
use tree_sitter::{Parser, Query, QueryCursor};

pub struct TeraxGrep {
    parser: Parser,
    queries: HashMap<Language, Query>,
}

impl TeraxGrep {
    pub fn search(&self, pattern: &str, path: &Path) -> Vec<SearchResult> {
        // Parse file with tree-sitter
        let tree = self.parser.parse(content, None).unwrap();

        // Execute semantic query (not regex!)
        let matches = self.query_cursor.matches(&query, tree.root_node(), content.as_bytes());

        // Return structured results
        matches.map(|m| SearchResult {
            file: path.to_string(),
            line: m.range().start_point.row,
            symbol: m.captures[0].node.utf8_text(content.as_bytes()).unwrap(),
            context: self.get_context(m, content),
        }).collect()
    }
}

#[tauri::command]
pub fn terax_grep(query: String, path: String) -> Vec<SearchResult> {
    // GPU-accelerated with Metal on macOS
}
```

### TeraxDiff (Intelligent Patching)
```typescript
// src/tools/diff.ts
interface AIPatch {
  filePath: string;
  originalHash: string;
  hunks: Array<{
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
    content: string;
  }>;
}

export async function applyAIPatch(patch: AIPatch): Promise<boolean> {
  // Verify file hasn't changed (hash check)
  const currentHash = await hashFile(patch.filePath);
  if (currentHash !== patch.originalHash) {
    // Conflict detected - show merge UI
    return showMergeConflictUI(patch);
  }

  // Apply patch atomically
  await atomicWrite(patch.filePath, applyHunks(patch));
  return true;
}
```

### TeraxShell (Sandboxed Execution)
```rust
// src-tauri/src/tools/shell.rs
use portable_pty::{CommandBuilder, PtySize, MasterPty};

pub struct SandboxedShell {
    profile: SeatbeltProfile,
}

impl SandboxedShell {
    pub fn spawn(&self, cmd: &str, cwd: &Path) -> Result<PtyProcess> {
        // Apply seatbelt profile (macOS sandbox)
        let mut builder = CommandBuilder::new("sh");
        builder.arg("-c").arg(cmd);
        builder.cwd(cwd);

        // Restrict network, filesystem, process access
        builder.env("TERAX_SANDBOX", "true");

        self.pty_backend.spawn_command(builder)
    }

    pub fn is_safe_command(&self, cmd: &str) -> SafetyReport {
        // Analyze command for dangerous patterns
        // rm -rf /, curl | sh, etc.
        // Return risk score + explanation
    }
}
```

### TeraxGraph (Knowledge Graph)
```rust
// src-tauri/src/tools/graph.rs
use rusqlite::Connection;
use tree_sitter_rust::language as rust_lang;

pub struct CodeGraph {
    db: Connection,
}

impl CodeGraph {
    pub fn index_project(&mut self, root: &Path) -> Result<usize> {
        let mut count = 0;
        for entry in walkdir::WalkDir::new(root) {
            let entry = entry?;
            if is_source_file(entry.path()) {
                self.index_file(entry.path())?;
                count += 1;
            }
        }
        Ok(count)
    }

    fn index_file(&mut self, path: &Path) -> Result<()> {
        let content = std::fs::read_to_string(path)?;
        let tree = self.parser.parse(&content, None).unwrap();

        // Extract symbols (functions, structs, modules, etc.)
        let symbols = self.extract_symbols(&tree, &content);

        // Insert into graph database
        let tx = self.db.transaction()?;
        for symbol in symbols {
            tx.execute(
                "INSERT INTO symbols (name, kind, file, line, parent) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![symbol.name, symbol.kind, path.to_str(), symbol.line, symbol.parent],
            )?;
        }
        tx.commit()?;

        Ok(())
    }

    pub fn query(&self, query: &str) -> Vec<Symbol> {
        // Semantic search across indexed symbols
        self.db.prepare(
            "SELECT name, kind, file, line FROM symbols
             WHERE name LIKE ?1 OR description LIKE ?1"
        )
        .unwrap()
        .query_map(params![format!("%{}%", query)], |row| {
            Ok(Symbol {
                name: row.get(0)?,
                kind: row.get(1)?,
                file: row.get(2)?,
                line: row.get(3)?,
            })
        })
        .unwrap()
        .filter_map(Result::ok)
        .collect()
    }
}
```

### TeraxDesign (Live Canvas)
```tsx
// src/components/design/DesignCanvas.tsx
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

export function DesignCanvas({ design }: { design: DesignSpec }) {
  return (
    <Canvas camera={{ position: [0, 0, 5] }}>
      <ambientLight intensity={0.5} />
      <DesignElements elements={design.elements} />
      <EffectComposer>
        <Bloom luminanceThreshold={0.9} />
      </EffectComposer>
    </Canvas>
  );
}

// Gemini can manipulate design in real-time
export function useDesignAI(canvasRef: RefObject<Canvas>) {
  return {
    applyDesign: (prompt: string) => {
      // Parse prompt → update design spec → re-render
      const updates = parseDesignPrompt(prompt);
      canvasRef.current?.updateDesign(updates);
    },
  };
}
```

---

## Part 6: Risk Mitigation

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Google OAuth breaks | Low | High | Fallback to API key auth |
| SQLite vec0 unstable | Medium | Medium | Keep pure-text search fallback |
| Monaco too heavy for 8GB | Low | High | Lazy-load workers, disable unused features |
| Tree-sitter parsing slow | Low | Medium | Incremental parsing, background indexing |
| Memory leaks in Rust | Low | High | Regular profiling with Instruments |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Gemini API pricing changes | Medium | High | Support multiple providers as fallback |
| Apple App Store rejection | Low | Medium | Distribute via Homebrew + direct download |
| Competitor releases similar tool | High | Medium | Focus on niche: Gemini-native + design integration |
| Open source fork fragments community | Low | Medium | Strong governance, clear roadmap, active maintenance |

---

## Part 7: Success Metrics

### Technical KPIs
- **Idle RAM**: <100MB (target), <200MB (acceptable)
- **Launch Time**: <0.5s cold start, <0.1s warm start
- **File Open**: <50ms for files <1MB
- **AI Response**: <2s first token, <10s complete response
- **Crash Rate**: <0.1% sessions

### Community KPIs (6 months post-launch)
- **GitHub Stars**: 5,000+
- **Monthly Downloads**: 10,000+
- **Contributors**: 50+
- **Discord Members**: 2,000+
- **Extension/Skill Contributions**: 100+

### Business KPIs (12 months)
- **Pro Users**: 1,000+ (if monetized)
- **Enterprise Pilots**: 10+
- **Integration Partners**: 5+ (Graphify, Open Design, etc.)

---

## Part 8: Immediate Next Steps (This Week)

### Day 1-2: Setup & Planning
1. [ ] Create feature branch: `feature/gemini-native-2026`
2. [ ] Set up Google Cloud project for OAuth
3. [ ] Register OAuth client ID/secret
4. [ ] Document current architecture decisions

### Day 3-4: OAuth Implementation
1. [ ] Add `oauth2`, `axum` to Cargo.toml
2. [ ] Implement `start_oauth_flow` command
3. [ ] Create callback listener
4. [ ] Test browser sign-in flow

### Day 5-7: Direct SDK Migration
1. [ ] Remove `@ai-sdk/*` from package.json
2. [ ] Install `@google/genai`
3. [ ] Rewrite `session.ts` to use direct SDK
4. [ ] Update `transport.ts` or remove entirely
5. [ ] Test basic chat functionality

### Weekend: SQLite Foundation
1. [ ] Add `rusqlite` to Cargo.toml
2. [ ] Create initial migration script
3. [ ] Implement `save_session`, `load_session`
4. [ ] Test persistence across restarts

---

## Appendix A: Environment Setup

### Prerequisites
```bash
# macOS (M1)
brew install rust sqlite tree-sitter

# Node.js 20+
nvm install 20
nvm use 20

# Google Cloud SDK
brew install --cask google-cloud-sdk
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### Google OAuth Configuration
1. Go to https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID
3. Application type: Web application
4. Authorized redirect URIs: `http://localhost:14523/callback`
5. Download JSON, extract `client_id` and `client_secret`
6. Add to `.env`:
```env
GOOGLE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your-secret
```

### Build Commands
```bash
# Development
cd terax-ai-0.6.1
pnpm install
pnpm tauri dev

# Production build
pnpm tauri build

# Run tests
cd src-tauri
cargo test
```

---

## Appendix B: File Structure After Implementation

```
terax-ai/
├── src/
│   ├── components/
│   │   ├── editor/
│   │   │   ├── MonacoEditor.tsx       # NEW
│   │   │   └── DiffViewer.tsx         # NEW
│   │   ├── explorer/
│   │   │   └── FileTree.tsx           # NEW
│   │   ├── design/
│   │   │   └── DesignCanvas.tsx       # NEW
│   │   └── auth/
│   │       └── OAuthButton.tsx        # NEW
│   ├── modules/
│   │   ├── ai/
│   │   │   └── lib/
│   │   │       ├── gemini/
│   │   │       │   ├── session.ts     # REWRITTEN
│   │   │       │   ├── oauth.ts       # NEW
│   │   │       │   └── types.ts
│   │   │       └── transport.ts       # REMOVED
│   │   └── db/
│   │       └── sqlite.ts              # NEW
│   └── App.tsx                        # UPDATED
├── src-tauri/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── db.rs                  # NEW
│   │   │   ├── auth/
│   │   │   │   ├── mod.rs             # NEW
│   │   │   │   └── oauth.rs           # NEW
│   │   │   └── tools/
│   │   │       ├── grep.rs            # ENHANCED
│   │   │       ├── diff.rs            # NEW
│   │   │       └── graph.rs           # NEW
│   │   └── lib.rs                     # UPDATED
│   ├── Cargo.toml                     # UPDATED
│   └── entitlements.plist             # NEW (sandbox)
├── migrations/
│   └── 001_initial.sql                # NEW
├── .env.example                       # UPDATED
└── TERAX_2026_MASTER_PLAN.md          # THIS FILE
```

---

## Conclusion

This plan transforms Terax AI from a terminal-with-chat into a production-grade, Gemini-native IDE optimized for Apple Silicon. By following the phased approach, you'll achieve:

✅ **Native Performance**: <100MB RAM, instant launch
✅ **Seamless Authentication**: One-click Google Pro sign-in
✅ **Persistent Intelligence**: Never lose conversation context
✅ **Professional IDE**: Monaco editor, split panes, git integration
✅ **Ecosystem Power**: Graphify + Open Design + Dify built-in
✅ **Future-Proof**: 2026-standard architecture

**Estimated Timeline**: 20 weeks (5 months) to full release
**Team Size**: 1-2 developers (you + optional collaborator)
**Budget**: $0 (all open source tools)

Start with Phase 1 this week. The foundation is critical—get OAuth and SQLite right, and everything else builds naturally on top.