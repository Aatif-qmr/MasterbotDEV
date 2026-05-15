# Contributing to Terax AI

Thank you for your interest in contributing to Terax! We are building a high-performance, AI-native terminal environment. To maintain our standards, all contributions must adhere to the following strict architectural and security principles.

## 🚀 Mission & Architecture Principles

- **Native-First:** We use **Rust** for all heavy lifting (Filesystem, SQLite, Auth, State Compression, Indexing) to ensure maximum performance and security. TypeScript is reserved strictly for the **UI and State Management**.
- **Gemini-First:** Terax is built exclusively for the **Google Gemini** ecosystem. We do not support other LLM providers in the core engine. All AI requests must use the native Gemini OAuth PKCE flow.
- **M1 Optimized:** Every feature must be optimized for **M1 8GB** base models. The entire application target is **<100MB RAM** overhead. Do not introduce heavy JavaScript libraries or ML runtimes.
- **Strict Types:** We enforce **Strict TypeScript**. `--noImplicitAny` is mandatory. The use of `as any` is forbidden unless bridging unstable external SDKs, in which case it must be wrapped in a type-safe interface.

## 🛠️ Development Setup

### Prerequisites
- **Bun v1.x** (Mandatory)
- **Rust v1.75+**
- macOS (recommended) or Windows with Tauri dependencies installed.

### Installation
```bash
# Clone the repository
git clone https://github.com/Aatif-qmr/MasterbotDEV.git
cd terax-ai-0.6.1

# Install dependencies using Bun
bun install
```

### Development
```bash
# Start the development environment
bun run tauri dev
```

### Quality Checks
All PRs must pass these checks:
```bash
# Type safety check
bun run typecheck

# Rust backend check
cd src-tauri && cargo check
```

## 📂 Domain-Driven Structure Guide

We follow a flat **Domain-Driven Design (DDD)** layout in `src/modules/`. No directory should exceed 3 levels of nesting.

- `src/modules/ai/engine/`: Core Gemini logic (Sessions, OAuth, Native SDK).
- `src/modules/ai/bridge/`: Tool definitions and translation layer.
- `src/modules/ai/ui/`: AI-specific React components.
- `src-tauri/src/modules/`: Native Rust backend modules.

**Rule:** No cross-domain imports (e.g., `editor` importing `explorer`) are allowed without an explicit shared interface or store.

## 🔐 Security & Auth Rules

- **Zero API Keys:** We never use or store static API keys. All authentication must flow through the **Google OAuth 2.0 PKCE** browser-based flow.
- **Keychain Only:** Credentials (Access/Refresh Tokens) must be stored strictly in the **OS Keychain** via the native `keyring` crate. Never use `localStorage` or `.env` for secrets.
- **OAuth Flow:** All AI interactions must route through the `GeminiSession` instance provided by the engine.

## 🧪 Testing & Quality

- **Commit Message Format:** We follow Conventional Commits: `feat(scope): description` or `fix(scope): description`.
- **PR Requirements:**
    - Passes `bun run typecheck`.
    - Passes `cargo check`.
    - **Memory Analysis:** If adding a major feature, include a brief report on its impact on the 100MB RAM target.

## 🚫 What We Don't Accept

- **Python Dependencies:** We are a pure Rust/TS project.
- **Heavy JS Frameworks:** No large animation or utility libraries (stick to `motion` and `lucide-react`).
- **Legacy SDKs:** No Vercel AI SDK (`ai`, `@ai-sdk/*`) code.
- **Hardcoded Secrets:** Any PR containing hardcoded credentials or `.env` files will be rejected immediately.
