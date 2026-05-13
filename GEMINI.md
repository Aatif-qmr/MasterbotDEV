# MasterbotDEV Workspace Documentation

This document provides a comprehensive overview of the `MasterbotDEV` workspace, detailing the architecture, purpose, and inner workings of its core projects: `gemini-cli` and `terax-ai`.

## Table of Contents
1. [Workspace Overview](#workspace-overview)
2. [Gemini CLI (v0.41.2)](#gemini-cli-v0412)
    - [Core Implementation](#core-implementation)
    - [Terminal UI](#terminal-ui)
    - [Evals & SDK](#evals--sdk)
3. [Terax AI (v0.5.9)](#terax-ai-v059)
    - [Frontend Architecture (React)](#frontend-architecture-react)
    - [Backend Implementation (Rust)](#backend-implementation-rust)
4. [Cross-Project Integration](#cross-project-integration)

---

## Workspace Overview

The `MasterbotDEV` workspace is an integrated environment for developing next-generation AI-native developer tools. It combines a powerful, agentic CLI (`gemini-cli`) with a high-performance, desktop terminal/workspace GUI (`terax-ai`).

- **Root Directory:** `/Users/aatifquamre/Downloads/download-now-sort-later/MasterbotDEV/`
- **Primary Projects:**
    - `gemini-cli-0.41.2`: A Node.js-based AI agent for the terminal.
    - `terax-ai-0.5.9`: A Tauri/Rust-based terminal and editor GUI.

---

## Gemini CLI (v0.41.2)

Gemini CLI is an open-source AI agent that brings the power of Gemini directly into the terminal.

### Core Implementation (`packages/core/src/`)
The "brain" of the agent, handling LLM orchestration and tool execution.

- **`agent/agent-session.ts`**
  - **Purpose:** Manages the lifecycle and state of an agent interaction.
  - **Working:** Wraps the agent protocol to provide an `AsyncIterable` stream of events. Supports replaying history and reattaching to streams.
- **`agents/registry.ts`**
  - **Purpose:** Central registry for all available agent definitions.
  - **Working:** Discovers and loads agents from built-in sources, local directories (`.gemini/agents/`), and remote A2A endpoints.
- **`tools/tool-registry.ts`**
  - **Purpose:** Manages the discovery and registration of tools.
  - **Working:** Maintains a map of all known tools (built-in, project-specific, and MCP). Handles aliasing and function declaration generation.
- **`prompts/promptProvider.ts`**
  - **Purpose:** Orchestrates the construction of the system prompt.
  - **Working:** Gathers context, tools, skills, and memory to build a comprehensive system prompt using modular snippets.
- **`agents/local-executor.ts`**
  - **Purpose:** Executes agent tasks on the local machine.
  - **Working:** Interfaces with the environment to run tools, manage files, and handle shell commands.

### Terminal UI (`packages/cli/src/`)
Interactive terminal interface using React and Ink.

- **`ui/AppContainer.tsx`**
  - **Purpose:** Primary container for the Ink-based UI.
  - **Working:** Manages global state (auth, history, tasks) and orchestrates sub-hooks for streaming and input processing.
- **`gemini.tsx`**
  - **Purpose:** Main entry point for the CLI application.
  - **Working:** Initializes config and starts the Ink render loop.
- **`interactiveCli.tsx`**
  - **Purpose:** Logic for the interactive prompt session.
  - **Working:** Manages the input/output loop, integrating with terminal features like alternate buffers.
- **`hooks/useGeminiStream.ts`**
  - **Purpose:** Custom hook for managing the LLM interaction stream.
  - **Working:** Connects the UI to the `GeminiClient`, handling state transitions (thinking, tool use, etc.).

### Evals & SDK
Evaluation framework and programmatic SDK.

- **`evals/`**
  - **Purpose:** Vitest-based framework for behavioral evaluations of LLM agents.
  - **Working:** Uses a `TestRig` to simulate workspaces and enforce policies like `ALWAYS_PASSES`.
- **`packages/sdk/src/`**
  - **Purpose:** Programmatic SDK for embedding Gemini CLI capabilities.
  - **Working:** Centers around `GeminiCliAgent` and `GeminiCliSession` for managed LLM interaction and tool use.

---

## Terax AI (v0.5.9)

Terax AI is a high-performance terminal emulator and AI-native workspace.

### Frontend Architecture (React) (`src/`)
Modular React application integrated with Tauri.

- **`modules/ai/store/chatStore.ts`**
  - **Purpose:** Manages AI sessions and tool approvals.
  - **Working:** Zustand store coordinating session history and status with backend AI services.
- **`modules/editor/EditorPane.tsx`**
  - **Purpose:** Multi-tab code editor based on CodeMirror 6.
  - **Working:** Integrates with Tauri's FS API and provides AI-driven completions and Vim support.
- **`modules/terminal/TerminalPane.tsx`**
  - **Purpose:** Integrated terminal powered by `xterm.js`.
  - **Working:** Connects to backend PTY sessions via custom hooks.
- **`modules/explorer/FileExplorer.tsx`**
  - **Purpose:** File system navigation.
  - **Working:** Maintains a tree view and invokes Tauri FS commands for operations.
- **`modules/tabs/TabBar.tsx`**
  - **Purpose:** Layout and tab management.
  - **Working:** Tracks open tabs (editors, terminals, previews) and manages the active workspace view.

### Backend Implementation (Rust) (`src-tauri/src/`)
OS-level operations and PTY management.

- **`modules/pty/mod.rs`**
  - **Purpose:** Manages interactive terminal sessions.
  - **Working:** Uses `portable_pty` to stream stdout/stderr via Tauri Channels.
- **`modules/fs/file.rs`**
  - **Purpose:** Safe filesystem operations.
  - **Working:** Implements atomic writes and read limits.
- **`modules/shell/mod.rs`**
  - **Purpose:** Shell command execution.
  - **Working:** Handles one-shot and persistent shell sessions.
- **`modules/secrets.rs`**
  - **Purpose:** Secure secret storage.
  - **Working:** Interfaces with native OS keychains (macOS/Windows).

---

## Cross-Project Integration

The projects are designed to work in tandem:
1. **Context Sync:** `terax-ai` uses `geminiSync.ts` to write workspace context (open files, terminal buffer) to a `live.json` file.
2. **Agentic Interaction:** `gemini-cli` reads this context to provide informed assistance.
3. **GUI Bridge:** `terax-ai` intercepts `gemini-cli` tool calls to present them as interactive Diffs for user approval.
