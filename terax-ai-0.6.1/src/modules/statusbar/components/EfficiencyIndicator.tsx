import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { cn } from '@/lib/utils';
import { ActivityIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

interface ComplexityMetrics {
  cyclomaticComplexity: number;
  nestingDepth: number;
  estimatedTokens: number;
  yieldScore: number;
  thresholdExceeded: boolean;
}

export const EfficiencyIndicator: React.FC<{ path: string | null }> = ({ path }) => {
  const [metrics, setMetrics] = useState<ComplexityMetrics | null>(null);

  useEffect(() => {
    if (!path) {
      setMetrics(null);
      return;
    }

    const analyze = async () => {
      try {
        const result = await invoke<ComplexityMetrics>('analyze_file_complexity', { path });
        setMetrics(result);
      } catch (e) {
        console.error('Efficiency analysis failed:', e);
      }
    };

    analyze();
    // Re-analyze on path change or every 30s for active file
    const timer = setInterval(analyze, 30000);
    return () => clearInterval(timer);
  }, [path]);

  if (!metrics) return null;

  const lowEfficiency = metrics.yieldScore < 60;

  return (
    <div 
      className={cn(
        "flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium transition-all duration-300",
        metrics.thresholdExceeded 
          ? "bg-red-500/10 text-red-400 border border-red-500/20" 
          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
        lowEfficiency && "animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.2)]"
      )}
      title={`Cyclomatic Complexity: ${metrics.cyclomaticComplexity}\nNesting Depth: ${metrics.nestingDepth}\nEstimated Tokens: ${metrics.estimatedTokens}\nYield Score: ${metrics.yieldScore}%`}
    >
      <HugeiconsIcon icon={ActivityIcon} size={12} strokeWidth={2} />
      <span>Efficiency: {metrics.yieldScore}% (Complexity: {metrics.cyclomaticComplexity})</span>
    </div>
  );
};
