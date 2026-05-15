import { useEffect } from 'react';
import { useContextStore } from '@/modules/ai/context/store';
import { contextService } from '@/modules/ai/context/service';
import { Database, RefreshCw, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '../utils';

export function ContextStatusBadge() {
  const { isIndexing, indexedFileCount, lastSync } = useContextStore();

  useEffect(() => {
    contextService.refreshStats();
  }, []);

  const handleReindex = () => {
    contextService.indexProject();
  };

  return (
    <div 
      className={cn(
        "flex items-center space-x-2 px-2 py-1 rounded-md text-[10px] font-medium transition-colors cursor-pointer",
        isIndexing ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
      )}
      onClick={handleReindex}
      title={lastSync ? `Last synced: ${new Date(lastSync).toLocaleString()}` : "Not synced"}
    >
      {isIndexing ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : indexedFileCount > 0 ? (
        <CheckCircle2 className="h-3 w-3 text-green-500" />
      ) : (
        <Database className="h-3 w-3" />
      )}
      <span>
        {isIndexing ? "Indexing..." : `${indexedFileCount} files indexed`}
      </span>
      {!isIndexing && (
        <RefreshCw className="h-2.5 w-2.5 opacity-50" />
      )}
    </div>
  );
}
