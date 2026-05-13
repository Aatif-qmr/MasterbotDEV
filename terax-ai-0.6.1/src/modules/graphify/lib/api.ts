import { invoke } from '@tauri-apps/api/core';
import { type GraphData } from '../types';

export async function generateGraph(projectPath: string): Promise<GraphData> {
  return await invoke<GraphData>('generate_graph', { projectPath });
}
