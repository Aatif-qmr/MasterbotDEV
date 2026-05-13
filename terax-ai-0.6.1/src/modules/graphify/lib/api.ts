import { invoke } from '@tauri-apps/api/core';
import { type GraphData } from '../types';

export async function generateGraph(projectRoot: string): Promise<GraphData> {
  return await invoke<GraphData>('generate_project_graph', { projectRoot });
}
