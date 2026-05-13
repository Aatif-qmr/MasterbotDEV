--- TERAX_2026_MASTER_PLAN.md (原始)


+++ TERAX_2026_MASTER_PLAN.md (修改后)
# Terax AI 2026: Master Implementation Plan

## Executive Summary

**Vision**: Transform Terax AI from a multi-provider AI terminal into a **native Gemini-powered IDE** where Google's Gemini CLI is the sole AI agent with complete native control, optimized for Apple M1 MacBook Air (8GB RAM), following 2026 standards for AI-native development environments.

**Current State**: Terax v0.6.1 has partial Gemini integration scaffolding but lacks critical production components including real OAuth authentication, session persistence, skills system implementation, and true native IDE capabilities.

---

## Part 1: Current Project Status Analysis

### ✅ What's Already Built

#### Core Architecture
- **Tauri v2 Application**: Rust-based backend with React frontend
- **Native Bridge**: Complete filesystem and shell access via Tauri commands
- **Code Editor**: CodeMirror 6 integration with multiple themes
- **Terminal Emulator**: xterm.js with PTY support and background process management
- **Multi-tab Interface**: Window management with overlay title bars
- **API Key Management**: System keyring integration (macOS Keychain, Windows Credential Manager)

#### Gemini Integration (Scaffolding Present)
- **Type Definitions** (`src/modules/ai/lib/gemini/types.ts`): Complete TypeScript interfaces mirroring Gemini CLI SDK
- **Native Bridge** (`src/modules/ai/lib/gemini/native.ts`):
  - `GeminiTeraxFilesystem` - File operations via Tauri
  - `GeminiTeraxShell` - Shell execution with background process support
  - System prompt optimized for Terax context
- **Session Management** (`src/modules/ai/lib/gemini/session.ts`):
  - `GeminiAgent` and `GeminiSession` classes
  - Skills loading from `.gemini/skills` directory
  - Dynamic instruction resolution
  - Tool mapping to Vercel AI SDK format
- **Transport Layer** (`src/modules/ai/lib/gemini/transport.ts`): Bridges Gemini to Vercel AI SDK's ChatTransport
- **Documentation**: 267-line `GEMINI_INTEGRATION.md` with architecture and usage examples

#### Configuration
- **Auto-updater Disabled**: `tauri.conf.json` has updater plugin inactive
- **No Terax Authentication**: Local-first design maintained
- **Multi-provider Support**: @ai-sdk packages for Google, Anthropic, OpenAI, Groq, Cerebras, xAI

### ❌ Critical Missing Components

#### 1. Real Gemini CLI SDK Integration
**Problem**: Current implementation uses Vercel AI SDK as a middleman instead of direct Gemini CLI integration
- ❌ No `@google/gemini-cli-core` or `@google/genai` dependencies
- ❌ No direct gRPC/REST communication with Google's Gemini API
- ❌ Transport layer still relies on `streamText()` from Vercel AI SDK
- ❌ Tool call ID tracking uses temporary IDs instead of proper correlation

**Impact**: Cannot leverage Gemini-specific features like native function calling, multi-modal inputs, or advanced reasoning modes.

#### 2. OAuth Browser Authentication
**Problem**: No Google OAuth 2.0 flow implemented
- ❌ No browser-based sign-in for Google AI Pro account
- ❌ No token management (refresh, expiration handling)
- ❌ No OAuth state storage in secure keyring
- ❌ No `tauri-plugin-oauth` or equivalent dependency

**Impact**: Users cannot authenticate with Google accounts; only API key-based access works.

#### 3. Session Persistence
**Problem**: `resumeSession()` is a stub with no actual persistence
- ❌ No SQLite or file-based conversation history storage
- ❌ No session metadata (timestamps, model used, token counts)
- ❌ No lazy-loading of historical conversations
- ❌ No vector embeddings for semantic search across sessions

**Impact**: Conversations lost on app restart; no long-term memory.

#### 4. Skills System Implementation
**Problem**: Skills loading exists but is incomplete
- ⚠️ Basic SKILL.md parser implemented but untested
- ❌ No skill validation or sandboxing
- ❌ No skill marketplace or discovery mechanism
- ❌ No integration with Graphify/Open Design as skills
- ❌ No hot-reload for skill changes

**Impact**: Cannot leverage community skills or specialized workflows.

#### 5. True Native IDE Features
**Problem**: Still a terminal emulator with chat, not an AI-native IDE
- ❌ No Monaco Editor integration (only CodeMirror)
- ❌ No split-pane editor + terminal + preview layout
- ❌ No file tree with AI-assisted navigation
- ❌ No inline AI edits (diff view, accept/reject)
- ❌ No project-wide semantic search
- ❌ No integrated debugger with AI assistance

**Impact**: Cannot compete with Cursor, Windsurf, or Zed as a full IDE.

#### 6. Memory Optimization for M1 8GB
**Status**: 🟡 In Progress
- ✅ **Bun Runtime**: Migrated from npm/pnpm to Bun for superior speed and memory efficiency.
- ❌ No lazy loading of large files (>10MB)
- ❌ No memory-mapped file reading
- ❌ No WASM isolation for heavy computations
- ❌ No Metal GPU acceleration for vector operations
- ❌ No intelligent caching strategy

**Impact**: App may become sluggish with large codebases on 8GB RAM systems.

#### 7. Ecosystem Integrations
**Problem**: Graphify, Open Design, and Dify discussed but not integrated
- ❌ No Graphify knowledge graph generation
- ❌ No Open Design design-to-code workflow
- ❌ No Dify agentic workflow orchestration
- ❌ No MCP server protocol support

**Impact**: Limited to basic coding tasks; no design or complex workflow capabilities.

#### 8. Testing & Quality Assurance
**Problem**: Zero test coverage
- ❌ No unit tests for Gemini integration
- ❌ No integration tests for native bridge
- ❌ No end-to-end tests for OAuth flow
- ❌ No performance benchmarks

**Impact**: Regression risk; cannot guarantee stability.

---

## Part 2: The 2026 Standard Vision

### Core Principles

1. **AI as the Kernel**: The AI is not a feature—it's the operating system of the IDE
2. **Zero-Trust Security**: All credentials in secure enclaves; sandboxed tool execution
3. **Local-First with Cloud Sync**: Primary data local; optional encrypted cloud backup
4. **Sub-Second Latency**: All interactions <500ms; streaming responses <100ms TTFB
5. **Memory Conscious**: <100MB idle RAM; graceful degradation under pressure
6. **Provider Agnostic Core**: Architecture supports any LLM, but Gemini is the default
7. **Extensible by Design**: Skills, tools, and workflows can be added without core changes

### Target Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Terax AI 2026 IDE                        │
├─────────────────────────────────────────────────────────────┤
│  UI Layer (SolidJS + Tailwind + HeadlessUI)                 │
│  ├─ Monaco Editor (with AI inline edits)                    │
│  ├─ Terminal (xterm.js + PTY)                               │
│  ├─ File Explorer (tree-sitter powered)                     │
│  ├─ Preview Canvas (WASM + WGPU)                            │
│  └─ Chat Interface (streaming + reactions)                  │
├─────────────────────────────────────────────────────────────┤
│  AI Kernel (Rust + Direct Gemini SDK)                       │
│  ├─ OAuth Manager (browser flow + keychain)                 │
│  ├─ Session Manager (SQLite + vector embeddings)            │
│  ├─ Tool Orchestrator (sandboxed execution)                 │
│  ├─ Skills Engine (hot-reload + validation)                 │
│  └─ Context Builder (project state + memory)                │
├─────────────────────────────────────────────────────────────┤
│  Native Bridge (Tauri v2 Commands)                          │
│  ├─ Filesystem (read/write/watch/search)                    │
│  ├─ Shell (foreground/background/PTY)                       │
│  ├─ Process Monitor (resource tracking)                     │
│  └─ System Integration (notifications, handoff)             │
├─────────────────────────────────────────────────────────────┤
│  Embedded Services                                          │
│  ├─ Tree-sitter Parsers (incremental AST)                   │
│  ├─ SQLite (with vec0 for vectors)                          │
│  ├─ WASM Modules (Graphify, Open Design)                    │
│  └─ Cache Layer (LRU + predictive preload)                  │
└─────────────────────────────────────────────────────────────┘
```

### Key Differentiators vs. Competition

| Feature | Terax 2026 | Cursor | Windsurf | Continue |
|---------|-----------|--------|----------|----------|
| Sole Agent (Gemini) | ✅ | ❌ Multi | ❌ Multi | ❌ Multi |
| OAuth Browser Login | ✅ | ❌ API Key | ❌ API Key | ❌ API Key |
| Local Knowledge Graph | ✅ | ❌ | ❌ | ❌ |
| Design-to-Code | ✅ | ❌ | ⚠️ Limited | ❌ |
| Agentic Workflows | ✅ | ❌ | ⚠️ Basic | ❌ |
| M1 8GB Optimized | ✅ | ❌ Electron | ❌ Electron | ❌ Electron |
| Idle RAM | ~45MB | ~400MB | ~350MB | ~300MB |
| Launch Time | <0.5s | ~2s | ~1.5s | ~1s |
| Open Source | ✅ MIT | ❌ Proprietary | ❌ Proprietary | ✅ MIT |

---

## Part 3: Phased Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)
**Goal**: Replace Vercel AI SDK with direct Gemini SDK integration

#### Tasks
1. **Dependency Migration**
   - Add `@google/genai` or `@google/gemini-cli-core` to package.json
   - Remove unused provider SDKs (Anthropic, OpenAI, etc.) to reduce bundle size
   - Add `tauri-plugin-oauth` for browser authentication

2. **OAuth Implementation**
   - Register Google OAuth Client ID/Secret for Terax
   - Implement browser redirect flow in Tauri window
   - Store tokens in macOS Keychain / Windows Credential Manager
   - Handle token refresh and expiration

3. **Direct Gemini SDK Integration**
   - Rewrite `GeminiSession` to use `@google/genai` directly
   - Implement native function calling (not Vercel AI SDK wrapper)
   - Add support for multi-modal inputs (images, PDFs)
   - Enable Gemini 2.5 Pro features (reasoning mode, extended context)

4. **Session Persistence**
   - Integrate SQLite via `better-sqlite3` or `sql.js`
   - Design schema for conversations, messages, tool calls
   - Implement `saveSession()` and `loadSession()` methods
   - Add vector embeddings with `sqlite-vec` for semantic search

#### Deliverables
- ✅ Working OAuth browser sign-in for Google AI Pro
- ✅ Direct Gemini API calls (no Vercel middleware)
- ✅ Persistent conversation history across restarts
- ✅ Token count tracking per session

---

### Phase 2: IDE Transformation (Weeks 5-8)
**Goal**: Evolve from terminal+chat to full AI-native IDE

#### Tasks
1. **Monaco Editor Integration**
   - Replace CodeMirror with Monaco Editor (VS Code's engine)
   - Implement inline AI edits with diff view
   - Add "Accept/Reject" buttons for AI suggestions
   - Enable multi-file editing in single operation

2. **Layout Engine**
   - Create resizable split-pane system (editor | terminal | preview)
   - Add tabbed interface for multiple files
   - Implement workspace-aware file explorer
   - Add breadcrumb navigation with AI context

3. **Project Intelligence**
   - Embed tree-sitter parsers for TypeScript, Python, Rust, etc.
   - Build incremental AST for instant symbol lookup
   - Implement "Go to Definition" powered by AI
   - Add "Find Usages" with semantic understanding

4. **Preview & Debugging**
   - Integrated web preview with hot-reload
   - Debug console with AI-assisted breakpoint setting
   - Variable inspection with natural language queries
   - Network tab with AI-powered request analysis

#### Deliverables
- ✅ Monaco-based editor with AI inline edits
- ✅ Split-pane IDE layout
- ✅ Project-wide semantic search
- ✅ Live preview with hot-reload

---

### Phase 3: Ecosystem Integration (Weeks 9-12)
**Goal**: Integrate Graphify, Open Design, and Dify as native capabilities

#### Task 1: Graphify Integration (Knowledge Graph)
**Approach**: Embed as WASM module + Rust native bindings
- Clone `https://github.com/safishamsi/graphify.git`
- Build tree-sitter parser for codebase indexing
- Generate knowledge graph (functions, classes, variables as nodes)
- Expose as Terax tool: `graphify.analyze()`, `graphify.query()`
- Optimize for M1 using Apple Accelerate framework for vector similarity

**Use Cases**:
- "Show me all functions that call `useAuth`"
- "What files would break if I change this interface?"
- "Generate documentation for the entire auth module"

#### Task 2: Open Design Integration (Design-to-Code)
**Approach**: Port design skills + WASM canvas renderer
- Clone `https://github.com/nexu-io/open-design.git`
- Extract design system definitions (72+ brand templates)
- Build WASM-based canvas for live preview
- Create Gemini tool: `design.create()`, `design.toCode()`
- Integrate with Monaco for instant code generation

**Use Cases**:
- "Create a login form matching our brand guidelines"
- "Convert this Figma design to React components"
- "Generate a dark mode variant of this component"

#### Task 3: Dify Integration (Agentic Workflows)
**Approach**: Embed workflow engine as Rust state machine
- Clone `https://github.com/langgenius/dify.git`
- Extract workflow DSL and execution engine
- Implement multi-agent orchestration (Architect, Coder, Critic)
- Create visual workflow builder in Terax UI
- Enable Gemini as workflow manager delegating to sub-agents

**Use Cases**:
- "Refactor this entire module following SOLID principles"
- "Write tests for all uncovered functions"
- "Audit security vulnerabilities and fix them"

#### Deliverables
- ✅ Knowledge graph with instant semantic queries
- ✅ Design canvas with live code generation
- ✅ Multi-agent workflow orchestration
- ✅ Visual workflow builder

---

### Phase 4: M1 8GB Optimization (Weeks 13-14)
**Goal**: Ensure buttery-smooth performance on entry-level Apple Silicon

#### Optimization Strategies

1. **Memory Management**
   - Implement lazy loading for files >5MB
   - Use memory-mapped I/O (`mmap`) for large file reads
   - Set strict heap limits with manual GC triggers
   - Profile and eliminate memory leaks with Instruments

2. **CPU Optimization**
   - Move heavy computations to Web Workers
   - Use WASM for tree-sitter parsing (Rust → WASM)
   - Leverage Apple's Accelerate framework for matrix operations
   - Implement debounced re-parsing (only parse visible files)

3. **GPU Acceleration**
   - Use WGPU for canvas rendering (Metal backend on macOS)
   - Offload vector similarity searches to GPU
   - Enable hardware-accelerated syntax highlighting

4. **Predictive Preloading**
   - Analyze user behavior to predict next actions
   - Pre-fetch related files when opening a project
   - Cache LLM responses for common queries
   - Implement LRU cache with intelligent eviction

#### Performance Targets
| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Cold Launch | <500ms | `time` command on cold start |
| Idle RAM | <50MB | Activity Monitor (no project open) |
| Large Project RAM | <500MB | 10k+ file codebase |
| First Token | <200ms | Network tab + timestamp |
| File Open | <50ms | Click to render time |
| Search Results | <100ms | Query to first result |

#### Deliverables
- ✅ Memory profile report showing <100MB idle
- ✅ Benchmark suite with passing targets
- ✅ Graceful degradation under memory pressure
- ✅ No UI jank during AI operations

---

### Phase 5: Advanced Features (Weeks 15-18)
**Goal**: Add killer features that define the 2026 standard

#### Feature 1: Time Travel & Semantic Undo
- Track logical changes across files (not just text edits)
- Enable "undo this refactoring" across 20 files
- Build timeline view of project evolution
- Allow branching experiments ("what if I tried this approach?")

#### Feature 2: Apple Ecosystem Integration
- Implement Apple Handoff for Mac ↔ iPad ↔ iPhone continuity
- Add Siri Shortcuts for common actions
- Enable Continuity Camera for scanning whiteboards
- Integrate with macOS Focus Modes

#### Feature 3: Zero-Trust Security Vault
- Sandboxed tool execution with restricted profiles
- Encrypted local storage for sensitive data
- Audit log of all AI actions
- "Safe Mode" that prevents destructive operations

#### Feature 4: Collaborative AI Sessions
- Share session state with teammates (encrypted)
- Multi-user editing with AI mediation
- Comment threads with AI-suggested resolutions
- Export sessions as interactive reports

#### Deliverables
- ✅ Semantic undo/redo working across files
- ✅ Handoff working between Apple devices
- ✅ Security audit log with export capability
- ✅ Shared session links (end-to-end encrypted)

---

### Phase 6: Polish & Release (Weeks 19-20)
**Goal**: Production-ready release with documentation and community

#### Tasks
1. **Testing**
   - Write unit tests for all core modules (target: 80% coverage)
   - Create integration tests for OAuth, session persistence, tools
   - Build E2E tests with Playwright for critical user flows
   - Set up CI/CD with GitHub Actions

2. **Documentation**
   - Update `README.md` with new architecture
   - Create user guide for IDE features
   - Write API reference for skills/tools
   - Record video tutorials for YouTube

3. **Community Building**
   - Launch Discord server for users
   - Create template repository for custom skills
   - Set up GitHub Discussions for Q&A
   - Publish on Product Hunt, Hacker News

4. **Release Preparation**
   - Code signing for macOS notarization
   - Create installers for Windows and Linux
   - Set up automatic release notes generation
   - Prepare blog post announcing Terax 2026

#### Deliverables
- ✅ 80%+ test coverage
- ✅ Complete documentation site
- ✅ Signed binaries for all platforms
- ✅ Launch announcement with demo video

---

## Part 4: Custom Advanced Tool Suite

Instead of generic tools, build hyper-specialized Rust-native tools optimized for M1:

### 1. TeraxGrep (Semantic Search)
```rust
// Rust implementation using tree-sitter + grep-regex
#[tauri::command]
async fn terax_grep(
  pattern: String,
  path: String,
  use_semantic: bool,
) -> Vec<SearchResult> {
  if use_semantic {
    // Parse AST, find semantic matches
    tree_sitter_search(&pattern, &path)
  } else {
    // Fast regex search with mmap
    grep_mmap_search(&pattern, &path)
  }
}
```
**Features**:
- AST-aware search ("find all React hooks")
- GPU-accelerated vector similarity
- Incremental results as you type

### 2. TeraxDiff (Intelligent Patching)
```typescript
// LLM-assisted diff generation
const patch = await terax.diff({
  oldFile: "...",
  newFile: "...",
  strategy: "minimal", // or "semantic", "safe"
});
```
**Features**:
- Understands intent, not just text changes
- Suggests safer alternatives for risky edits
- Atomic multi-file commits

### 3. TeraxShell (Safe Execution Sandbox)
```rust
// Sandboxed shell with predictive safety
#[tauri::command]
async fn terax_shell_exec(
  command: String,
  safety_profile: SafetyProfile,
) -> Result<Output, Error> {
  // Analyze command for danger level
  let risk = assess_risk(&command);
  if risk > safety_profile.threshold {
    return Err(Error::TooDangerous);
  }
  execute_in_sandbox(&command)
}
```
**Features**:
- Blocks destructive commands (`rm -rf /`)
- Dry-run mode for dangerous operations
- Automatic rollback on failure

### 4. TeraxGraph (Live Knowledge Graph)
```rust
// In-memory graph with incremental updates
pub struct KnowledgeGraph {
  nodes: DashMap<NodeId, Node>,
  edges: DashMap<EdgeId, Edge>,
  parser: TreeSitterParser,
}

impl KnowledgeGraph {
  pub fn update_file(&mut self, path: &str, content: &str) {
    // Incremental AST update
    let changes = self.parser.diff_parse(content);
    self.apply_delta(changes);
  }

  pub fn query(&self, cypher: &str) -> Vec<Node> {
    // Cypher-like query language
    execute_query(cypher)
  }
}
```
**Features**:
- Real-time graph updates on file save
- Natural language queries ("show me all API endpoints")
- Export to Graphviz or Mermaid

### 5. TeraxDesign (Native Canvas)
```typescript
// WASM-powered design canvas
const canvas = await terax.design.create({
  width: 800,
  height: 600,
  designSystem: 'tailwind',
});

canvas.addComponent('Button', { variant: 'primary' });
const code = await canvas.toCode('react');
```
**Features**:
- Drag-and-drop component builder
- Live code preview side-by-side
- Export to React, Vue, Svelte, plain HTML/CSS

---

## Part 5: Risk Mitigation

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Google changes Gemini API | Medium | High | Abstract behind interface; maintain fallback to Vercel SDK |
| M1 8GB insufficient for large projects | Low | Medium | Implement aggressive lazy loading; offer "Lite Mode" |
| OAuth flow blocked by Google | Low | High | Support both OAuth and API key; document self-hosted option |
| WASM modules too slow | Medium | Medium | Benchmark early; provide native Rust fallback |
| SQLite contention under load | Low | Low | Use WAL mode; batch writes; async queue |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Cursor/Windsurf release similar features | High | Medium | Focus on open-source community; faster iteration |
| Google launches competing IDE | Medium | High | Diversify LLM support; emphasize local-first privacy |
| Insufficient community adoption | Medium | High | Invest in documentation; create starter templates; engage on social media |

---

## Part 6: Success Metrics

### Adoption Metrics (6 months post-launch)
- ⭐ 5,000+ GitHub stars
- 📥 10,000+ monthly downloads
- 💬 1,000+ active Discord members
- 🛠️ 100+ community-contributed skills

### Performance Metrics
- 🚀 App Store rating: 4.8+ stars
- ⏱️ Average session duration: >30 minutes
- 🔄 Weekly active users / Monthly active users: >60%
- 🐛 Crash rate: <0.1% of sessions

### Technical Metrics
- 📦 Binary size: <50MB (macOS ARM64)
- 🧪 Test coverage: >80%
- 🔒 Security audits: 0 critical vulnerabilities
- 📝 Documentation completeness: 100% of public APIs documented

---

## Part 7: Immediate Next Steps (This Week)

### Day 1-2: Audit & Planning
- [ ] Review all existing Gemini integration code
- [ ] Identify exact lines needing changes for direct SDK
- [ ] Create detailed task breakdown in GitHub Projects
- [ ] Set up development environment on M1 MacBook Air

### Day 3-4: OAuth Prototype
- [ ] Register Google OAuth application
- [ ] Implement minimal browser redirect flow
- [ ] Test token storage in Keychain
- [ ] Document any roadblocks

### Day 5-7: SDK Integration Spike
- [ ] Install `@google/genai` package
- [ ] Create proof-of-concept script that calls Gemini directly
- [ ] Compare latency vs. Vercel AI SDK approach
- [ ] Decide on final architecture based on findings

---

## Appendix A: Dependency List

### Required Additions
```json
{
  "dependencies": {
    "@google/genai": "^1.0.0",
    "@tauri-apps/plugin-oauth": "^2.0.0",
    "better-sqlite3": "^11.0.0",
    "sqlite-vec": "^0.1.0",
    "monaco-editor": "^0.52.0",
    "@monaco-editor/react": "^4.6.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "playwright": "^1.45.0",
    "@playwright/test": "^1.45.0"
  }
}
```

### Rust Crate Additions
```toml
[dependencies]
rusqlite = { version = "0.32", features = ["bundled"] }
rusqlite_vec = "0.1"
tree-sitter = "0.23"
tree-sitter-typescript = "0.23"
tree-sitter-rust = "0.23"
tree-sitter-python = "0.23"
wasm-bindgen = "0.2"
wasm-bindgen-futures = "0.4"
metal = "0.29"  # For GPU acceleration on macOS
```

### Can Remove (After Migration)
```json
{
  "removed": [
    "@ai-sdk/anthropic",
    "@ai-sdk/openai",
    "@ai-sdk/groq",
    "@ai-sdk/cerebras",
    "@ai-sdk/xai",
    "@ai-sdk/openai-compatible"
  ]
}
```

---

## Appendix B: File Structure Changes

### New Files to Create
```
terax-ai-0.6.1/
├── src/
│   ├── modules/
│   │   └── ai/
│   │       ├── lib/
│   │       │   └── gemini/
│   │       │       ├── oauth.ts              # NEW: OAuth flow
│   │       │       ├── persistence.ts        # NEW: SQLite storage
│   │       │       └── sdk-adapter.ts        # NEW: Direct Gemini SDK wrapper
│   │       ├── graphify/                     # NEW: Graphify integration
│   │       │   ├── index.ts
│   │       │   ├── parser.ts
│   │       │   └── query.ts
│   │       ├── design/                       # NEW: Open Design integration
│   │       │   ├── index.ts
│   │       │   ├── canvas.ts
│   │       │   └── codegen.ts
│   │       └── workflows/                    # NEW: Dify integration
│   │           ├── index.ts
│   │           ├── orchestrator.ts
│   │           └── visual-builder.tsx
│   ├── editor/                               # NEW: Monaco-based editor
│   │   ├── MonacoEditor.tsx
│   │   ├── InlineEdit.tsx
│   │   └── DiffView.tsx
│   └── layout/                               # NEW: Split-pane system
│       ├── SplitPane.tsx
│       ├── WorkspaceTabs.tsx
│       └── FileTree.tsx
├── src-tauri/
│   ├── src/
│   │   ├── graphify/                         # NEW: Rust graphify bindings
│   │   │   └── mod.rs
│   │   ├── design/                           # NEW: Rust design engine
│   │   │   └── mod.rs
│   │   └── tools/                            # NEW: Custom tool suite
│   │       ├── terax_grep.rs
│   │       ├── terax_diff.rs
│   │       ├── terax_shell.rs
│   │       └── terax_graph.rs
│   └── Cargo.toml                            # UPDATE: Add new crates
├── wasm/                                     # NEW: WASM modules
│   ├── graphify-parser/
│   └── design-canvas/
├── skills/                                   # NEW: Default skills
│   ├── code-reviewer/
│   ├── pr-creator/
│   └── design-assistant/
└── docs/                                     # NEW: Documentation site
    ├── getting-started.md
    ├── oauth-setup.md
    ├── skills-guide.md
    └── api-reference.md
```

### Files to Modify
```
terax-ai-0.6.1/
├── src/modules/ai/lib/gemini/
│   ├── session.ts          # REPLACE: Use direct SDK
│   ├── transport.ts        # REMOVE: No longer needed
│   ├── types.ts            # UPDATE: Align with official SDK
│   └── native.ts           # KEEP: Native bridge still valid
├── src/modules/ai/store/chatStore.ts  # UPDATE: Add session persistence
├── src/App.tsx             # UPDATE: New layout structure
├── package.json            # UPDATE: Dependencies
├── src-tauri/Cargo.toml    # UPDATE: Rust crates
└── src-tauri/tauri.conf.json  # UPDATE: Capabilities for new plugins
```

---

## Appendix C: OAuth Flow Diagram

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│   Terax     │     │   Browser    │     │   Google    │     │   Keychain   │
│     App     │     │   (Tauri)    │     │   OAuth     │     │   (Secure)   │
└──────┬──────┘     └──────┬───────┘     └──────┬──────┘     └──────┬───────┘
       │                   │                    │                   │
       │  User clicks      │                    │                   │
       │  "Sign in with    │                    │                   │
       │  Google"          │                    │                   │
       ├──────────────────>│                    │                   │
       │                   │                    │                   │
       │                   │  Open OAuth URL    │                   │
       │                   ├───────────────────>│                   │
       │                   │                    │                   │
       │                   │   Show login page  │                   │
       │                   │<───────────────────┤                   │
       │                   │                    │                   │
       │                   │   User authenticates                   │
       │                   ├───────────────────>│                   │
       │                   │                    │                   │
       │                   │   Redirect with    │                   │
       │                   │   auth code        │                   │
       │                   │<───────────────────┤                   │
       │                   │                    │                   │
       │  Forward code     │                    │                   │
       │<──────────────────┤                    │                   │
       │                   │                    │                   │
       │  Exchange code    │                    │                   │
       │  for tokens       ├───────────────────────────────────────>│
       │                   │                    │                   │
       │                   │                    │  Store tokens     │
       │                   │                    │<──────────────────┤
       │                   │                    │                   │
       │  Access token     │                    │                   │
       │<───────────────────────────────────────────────────────────┤
       │                   │                    │                   │
       │  Close browser    │                    │                   │
       ├──────────────────>│                    │                   │
       │                   │                    │                   │
       │  Ready to use     │                    │                   │
       │  Gemini API       │                    │                   │
       │                   │                    │                   │
```

---

## Conclusion

This plan transforms Terax AI from a promising AI terminal into the definitive **AI-native IDE for 2026**, with Gemini as the sole agent, complete ecosystem integration, and ruthless optimization for M1 8GB systems.

The phased approach ensures steady progress with measurable deliverables every 4 weeks, while risk mitigation strategies protect against technical and business uncertainties.

**Success requires**:
1. Unwavering focus on performance (every millisecond matters)
2. Deep integration (not wrapping, but becoming native)
3. Community building (open source thrives on contributors)
4. Relentless testing (stability enables adoption)

By following this roadmap, Terax AI will not just compete with Cursor and Windsurf—it will redefine what an AI-powered development environment should be.

---

*Last Updated: December 2025*
*Version: 1.0*
*Author: Terax AI Development Team*