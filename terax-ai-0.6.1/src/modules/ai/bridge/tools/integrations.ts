import { tool } from "../../engine/types";
import { z } from "zod";
import { DesignEngine } from "../../../design/engine";
import { invoke } from "@tauri-apps/api/core";
import { type ToolContext } from "./context";

export function buildIntegrationTools(_ctx: ToolContext) {
  const design = new DesignEngine();

  return {
    /**
     * Look up the strict TSX schema/interface for a component in the design system.
     * Use this to ensure generated UI code matches existing component props and styles.
     */
    design_system_lookup: tool({
      description: "Get the TypeScript interface/schema for a component in the design system.",
      inputSchema: z.object({
        componentName: z.string().describe("The name of the component (e.g., Button, Card).")
      }),
      execute: async ({ componentName }) => {
        const schema = await design.getComponentSchema(componentName);
        const voice = design.getEditorialVoiceSnippet();
        return `Component Schema:\n${schema}\n\n${voice}`;
      }
    }),

    /**
     * Analyze a file's cyclomatic complexity and nesting depth using the Rust optimizer.
     * Use this to identify areas that need refactoring or optimization.
     */
    analyze_complexity: tool({
      description: "Analyze code complexity and nesting depth using the high-performance Rust engine.",
      inputSchema: z.object({
        path: z.string().describe("The path to the file to analyze.")
      }),
      execute: async ({ path }) => {
        return await invoke("analyze_file_complexity", { path });
      }
    })
  } as const;
}
