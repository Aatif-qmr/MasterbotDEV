/**
 * Native Gemini CLI integration for Terax AI
 * 
 * This module provides deep integration with the Gemini CLI SDK,
 * making Gemini the sole AI agent with full control over Terax.
 */

import type { SessionContext, AgentFilesystem, AgentShell } from './types';
import { native } from '../bridge/native';
import type { CommandOutput } from '../bridge/native';

/**
 * Gemini-native filesystem implementation that bridges to Terax's native Tauri commands
 */
export class GeminiTeraxFilesystem implements AgentFilesystem {
  constructor() {}

  async readFile(path: string): Promise<string | null> {
    try {
      const result = await native.readFile(path);
      if (result.kind === 'text') {
        return result.content;
      } else if (result.kind === 'binary') {
        // Return a placeholder for binary files
        return `[Binary file: ${path}, size: ${result.size} bytes]`;
      } else if (result.kind === 'toolarge') {
        return `[File too large: ${path}, size: ${result.size} bytes, limit: ${result.limit} bytes]`;
      }
      return null;
    } catch (error) {
      console.error(`Failed to read file ${path}:`, error);
      return null;
    }
  }

  async writeFile(path: string, content: string): Promise<void> {
    try {
      await native.writeFile(path, content);
    } catch (error) {
      console.error(`Failed to write file ${path}:`, error);
      throw error;
    }
  }

  async listDirectory(path: string): Promise<string[]> {
    try {
      const entries = await native.readDir(path);
      return entries.map(entry => entry.name);
    } catch (error) {
      console.error(`Failed to list directory ${path}:`, error);
      return [];
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      await native.readFile(path);
      return true;
    } catch {
      try {
        await native.readDir(path);
        return true;
      } catch {
        return false;
      }
    }
  }
}

/**
 * Gemini-native shell implementation that bridges to Terax's Tauri shell commands
 */
export class GeminiTeraxShell implements AgentShell {
  private cwd: string | null = null;

  constructor(getCwd: () => string | null) {
    this.cwd = getCwd();
  }

  async exec(
    command: string, 
    options?: { 
      cwd?: string; 
      timeoutSeconds?: number; 
      env?: Record<string, string>;
    }
  ): Promise<{
    exitCode: number | null;
    output: string;
    stdout: string;
    stderr: string;
    error?: Error;
  }> {
    try {
      const execCwd = options?.cwd ?? this.cwd ?? undefined;
      const timeout = options?.timeoutSeconds ?? 60;
      
      const result: CommandOutput = await native.runCommand(command, execCwd ?? null, timeout);
      
      if (result.timed_out) {
        return {
          exitCode: null,
          output: `Command timed out after ${timeout} seconds`,
          stdout: result.stdout,
          stderr: result.stderr + '\n[TIMEOUT]',
          error: new Error(`Command timed out after ${timeout} seconds`),
        };
      }

      return {
        exitCode: result.exit_code,
        output: result.stdout || result.stderr,
        stdout: result.stdout,
        stderr: result.stderr,
      };
    } catch (error) {
      return {
        exitCode: 1,
        output: '',
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  async spawnBackground(command: string, cwd?: string): Promise<number> {
    try {
      const handle = await native.shellBgSpawn(command, cwd ?? this.cwd ?? null);
      return handle;
    } catch (error) {
      throw new Error(`Failed to spawn background process: ${error}`);
    }
  }

  async getBackgroundLogs(handle: number, sinceOffset?: number): Promise<{
    logs: string;
    nextOffset: number;
    exited: boolean;
    exitCode: number | null;
  }> {
    try {
      const result = await native.shellBgLogs(handle, sinceOffset ?? undefined);
      return {
        logs: result.bytes,
        nextOffset: result.next_offset,
        exited: result.exited,
        exitCode: result.exit_code,
      };
    } catch (error) {
      throw new Error(`Failed to get background logs: ${error}`);
    }
  }

  async killBackground(handle: number): Promise<void> {
    try {
      await native.shellBgKill(handle);
    } catch (error) {
      throw new Error(`Failed to kill background process: ${error}`);
    }
  }

  async listBackgroundProcesses(): Promise<Array<{
    handle: number;
    command: string;
    cwd: string | null;
    startedAt: number;
    exited: boolean;
    exitCode: number | null;
  }>> {
    try {
      const processes = await native.shellBgList();
      return processes.map(p => ({
        handle: p.handle,
        command: p.command,
        cwd: p.cwd,
        startedAt: p.started_at_ms,
        exited: p.exited,
        exitCode: p.exit_code,
      }));
    } catch (error) {
      console.error('Failed to list background processes:', error);
      return [];
    }
  }
}

/**
 * Create a session context for Gemini CLI
 */
export function createGeminiSessionContext(
  sessionId: string,
  transcript: any[],
  getCwd: () => string | null,
): SessionContext {
  const fs = new GeminiTeraxFilesystem();
  const shell = new GeminiTeraxShell(getCwd);

  return {
    sessionId,
    transcript,
    cwd: getCwd() ?? process.cwd(),
    timestamp: new Date().toISOString(),
    fs,
    shell,
    // These will be set by the session
    agent: null as any,
    session: null as any,
  };
}

/**
 * Gemini CLI system prompt optimized for Terax AI
 */
export const GEMINI_SYSTEM_PROMPT = `You are Terax AI, an advanced AI developer assistant powered by Google's Gemini.

## CORE IDENTITY
You are the SOLE AI agent in Terax AI, with complete native integration and control over:
- File system operations (read, write, create, delete, search)
- Terminal/shell execution (commands, background processes, PTY sessions)
- Editor integration (code editing, previews, file management)
- Project awareness and memory

## CAPABILITIES
You have access to powerful tools through the Gemini CLI SDK:
1. **Filesystem Tools**: read_file, write_file, list_directory, grep, glob
2. **Shell Tools**: run_command, background processes, session management
3. **Skills System**: Custom skills can be loaded for specialized tasks
4. **Memory**: Persistent conversation history and project context

## OPERATING PRINCIPLES

### Path Resolution
- All relative paths resolve against the current working directory (cwd)
- Use absolute paths when uncertain
- Always verify parent directories exist before creating files

### File Operations
- Read files before editing them (read-before-edit invariant)
- Use targeted edits (edit/multi_edit) for small changes
- Use write_file only for new files or complete rewrites
- Respect file
- Never attempt to read sensitive files (.env, .ssh/, credentials, etc.)

### Shell Execution
- NEVER run interactive tools (vim, less, top, watch, etc.)
- For long-running processes (dev servers, watchers), use background execution
- Always check for existing dev servers before spawning new ones
- Set appropriate timeouts for commands

### Planning & Execution
- For complex tasks (≥3 steps), create a plan using todo_write
- Execute one step at a time, marking todos as in_progress/completed
- For simple tasks, just do them without formal planning

### Code Navigation
- Use grep for finding code (definitions, usages, references)
- Use glob for file pattern matching
- Don't brute-force read entire directories

### Output Style
- Be concise and direct
- No filler, apologies, or restating questions
- Provide code blocks with proper language fences
- Suggest commands using suggest_command when the answer IS a command

## ERROR HANDLING
- If a tool fails, explain what went wrong and suggest alternatives
- Don't retry refused operations on sensitive files
- Handle timeouts gracefully

## CONTEXT AWARENESS
You receive terminal context including:
- Current working directory
- Recent terminal output
- Active file (if any)
- Workspace root

Use this context as ground truth - don't ask users where they are.`;

/**
 * Default skills configuration for Terax AI
 */
export const DEFAULT_SKILLS_CONFIG = {
  enabled: true,
  adminSkillsEnabled: true,
  // Skills directories can be added here
  skillDirs: [] as string[],
};

/**
 * Configuration for Gemini CLI integration
 */
export interface GeminiIntegrationConfig {
  model?: string;
  debug?: boolean;
  recordResponses?: string;
  fakeResponses?: string;
  skillsEnabled?: boolean;
  customInstructions?: string;
}

/**
 * Default configuration for Gemini in Terax
 */
export const DEFAULT_GEMINI_CONFIG: GeminiIntegrationConfig = {
  model: 'gemini-2.5-pro', // Or let auto-select
  debug: false,
  skillsEnabled: true,
};
