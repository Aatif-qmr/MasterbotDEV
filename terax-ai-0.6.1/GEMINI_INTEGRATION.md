# Gemini CLI Integration for Cipher AI

This document describes how to integrate Google's Gemini CLI as the **sole AI agent** in Cipher AI, providing complete native control similar to how Cipher operates.

## Overview

The goal is to make Gemini from the Gemini CLI the primary (and only) AI agent in Cipher, with:
- **Full native integration** - Direct access to Cipher's Tauri-based filesystem, shell, and terminal
- **Complete control** - Ability to read/write files, execute commands, manage processes
- **Skills system** - Load custom skills for specialized tasks
- **Persistent sessions** - Resume conversations across app restarts
- **Tool ecosystem** - Access to all Cipher tools through Gemini's tool framework

## Architecture

### Current State (Multi-Agent via Vercel AI SDK)
```
Cipher UI → chatStore → createCipherAgent (Vercel AI SDK) → Multiple Providers (OpenAI, Anthropic, Google, etc.)
                         ↓
                    buildTools() → native.ts → Tauri Commands
```

### Target State (Gemini-Only Native Integration)
```
Cipher UI → chatStore → GeminiAgent (Gemini CLI SDK) → Gemini API
                            ↓
                    GeminiCipherFilesystem + GeminiCipherShell → native.ts → Tauri Commands
                            ↓
                    Skills System + Tool Registry
```

## Implementation Files

### 1. Type Definitions (`gemini-types.ts`)
Mirrors the Gemini CLI SDK types without requiring the full SDK dependency:
- `AgentFilesystem` - File operations interface
- `AgentShell` - Shell execution interface  
- `SessionContext` - Context passed to tools and dynamic instructions
- `GeminiStreamEvent` - Streaming response events
- `Tool`, `SkillReference` - Tools and skills definitions

### 2. Native Bridge (`gemini-native.ts`)
Bridges Gemini's expected interfaces to Cipher's existing native commands:
- `GeminiCipherFilesystem` - Implements `AgentFilesystem` using `native.readFile/writeFile`
- `GeminiCipherShell` - Implements `AgentShell` using `native.runCommand/shellBg*`
- `GEMINI_SYSTEM_PROMPT` - Optimized system prompt for Cipher context
- Helper functions for session context creation

### 3. Agent & Session (`gemini-session.ts`)
Core implementation of Gemini agent and session management:
- `GeminiAgent` - Main entry point, creates sessions
- `GeminiSession` - Handles conversation history, streaming, tool execution
- `createCipherGeminiAgent()` - Factory for pre-configured agent
- `defineTool()`, `skillDir()` - Helpers for extending functionality

## Usage

### Basic Integration

```typescript
import { createCipherGeminiAgent } from './modules/ai/lib/gemini-session';

// Create the sole Gemini agent
const agent = createCipherGeminiAgent({
  customInstructions: 'You are focused on React and TypeScript development',
  debug: false,
});

// Create a session
const session = agent.session();
await session.initialize();

// Send messages and stream responses
for await (const event of session.sendStream('Create a new React component')) {
  if (event.type === 'content') {
    console.log(event.value); // Streamed text
  } else if (event.type === 'tool_call_request') {
    // Handle tool execution
    const result = await executeTool(event.value);
    // Send result back to continue conversation
  }
}
```

### Dynamic Instructions

```typescript
const agent = new GeminiAgent({
  instructions: async (context) => {
    // Context includes: sessionId, transcript, cwd, fs, shell
    const recentFiles = await context.fs.listDirectory(context.cwd);
    return `${GEMINI_SYSTEM_PROMPT}\n\nCurrent project has ${recentFiles.length} files.`;
  },
});
```

### Custom Tools

```typescript
import { defineTool, z } from './modules/ai/lib/gemini-session';

const deployTool = defineTool(
  'deploy_to_preview',
  'Deploy the current project to preview environment',
  z.object({ 
    environment: z.enum(['staging', 'production']),
    branch: z.string().optional(),
  }),
  async (params, context) => {
    const result = await context.shell.exec(`npm run deploy:${params.environment}`);
    return result.exitCode === 0 ? 'Deployed successfully' : `Failed: ${result.stderr}`;
  }
);

const agent = createCipherGeminiAgent({
  tools: [deployTool],
});
```

### Skills System

```typescript
import { skillDir } from './modules/ai/lib/gemini-session';

const agent = createCipherGeminiAgent({
  skills: [
    skillDir('./skills/react-expert'),
    skillDir('./skills/security-audit'),
  ],
  skillsEnabled: true,
});
```

## Configuration

### Environment Variables

```bash
# Required for Gemini API
GOOGLE_API_KEY=your_api_key_here

# Optional: Use specific auth method
GEMINI_AUTH_TYPE=user_key  # or: service_account, oauth

# Optional: Custom model
GEMINI_MODEL=gemini-2.5-pro

# Optional: Enable debug logging
GEMINI_DEBUG=true
```

### Settings Integration

Add to Cipher settings (`src/modules/settings/sections/AISettings.tsx`):

```tsx
interface GeminiSettings {
  enabled: boolean;
  apiKey: string | null;
  model: string;
  useAsSoleAgent: boolean;  // Switch from multi-provider to Gemini-only
  skillsEnabled: boolean;
  customSkillsPath: string[];
}
```

## Migration Path

### Phase 1: Parallel Operation
- Keep existing Vercel AI SDK integration
- Add Gemini agent as an alternative option
- Allow users to switch between providers

### Phase 2: Feature Parity
- Ensure Gemini has access to all existing tools
- Implement session persistence
- Add skills loading support

### Phase 3: Sole Agent Transition
- Make Gemini the default (but allow fallback)
- Deprecate other providers in UI
- Optimize prompts and workflows for Gemini

### Phase 4: Native-Only
- Remove Vercel AI SDK dependency
- Full Gemini CLI SDK integration
- Advanced features: resume sessions, admin skills, etc.

## Benefits

1. **Unified Experience**: One AI with complete context, no switching between providers
2. **Deeper Integration**: Direct access to Gemini CLI's advanced features (skills, memory, policy engine)
3. **Better Performance**: Fewer abstraction layers, optimized for Cipher's architecture
4. **Enhanced Capabilities**: Access to Gemini-specific features like multimodal understanding
5. **Simplified Maintenance**: One integration to maintain instead of multiple provider adapters

## Challenges & Considerations

### Authentication
- Need to handle Google API key management securely (use Tauri secrets module)
- Support multiple auth methods (user key, service account, OAuth)

### API Costs
- Gemini API usage can be expensive for heavy users
- Consider rate limiting and usage tracking

### Feature Gaps
- Some Vercel AI SDK features may not have direct equivalents
- May need to implement custom solutions for certain workflows

### Backward Compatibility
- Existing sessions with other providers need migration strategy
- User preferences and custom instructions should transfer

## Testing Strategy

```typescript
// Unit tests for filesystem bridge
describe('GeminiCipherFilesystem', () => {
  it('reads text files', async () => {
    const fs = new GeminiCipherFilesystem(() => '/workspace');
    const content = await fs.readFile('test.txt');
    expect(content).toBe('test content');
  });
  
  it('handles binary files gracefully', async () => {
    const fs = new GeminiCipherFilesystem(() => '/workspace');
    const content = await fs.readFile('image.png');
    expect(content).toContain('[Binary file]');
  });
});

// Integration tests for session
describe('GeminiSession', () => {
  it('streams responses', async () => {
    const agent = createCipherGeminiAgent();
    const session = agent.session();
    await session.initialize();
    
    const events = [];
    for await (const event of session.sendStream('Hello')) {
      events.push(event);
    }
    
    expect(events.length).toBeGreaterThan(0);
  });
});
```

## Future Enhancements

1. **Multimodal Support**: Leverage Gemini's vision capabilities for screenshot analysis, UI debugging
2. **Advanced Memory**: Long-term project memory across sessions
3. **Custom Skills Marketplace**: Community-contributed skills for common workflows
4. **Offline Mode**: Local model support via LM Studio integration
5. **Collaborative Features**: Shared sessions, pair programming mode

## Resources

- [Gemini CLI GitHub](https://github.com/google-gemini/gemini-cli)
- [Gemini CLI SDK Docs](https://github.com/google-gemini/gemini-cli/tree/main/packages/sdk)
- [Cipher AI Documentation](./TERAX.md)
- [Vercel AI SDK](https://sdk.vercel.ai/docs) (current implementation)

## License

This integration follows Cipher AI's license and Google's Gemini CLI Apache 2.0 license.
