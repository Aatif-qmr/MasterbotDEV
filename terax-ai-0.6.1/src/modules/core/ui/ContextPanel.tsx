import { useContextStore } from '@/modules/ai/context/store';
import { contextService } from '@/modules/ai/context/service';
import { Button } from './button';
import { Search, FileText, Info, AlertTriangle } from 'lucide-react';
import { ScrollArea } from './scroll-area';

export function ContextPanel() {
  const { stats, isIndexing } = useContextStore();

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
        <Info className="h-12 w-12 text-muted-foreground opacity-20" />
        <div className="space-y-1">
          <h3 className="font-medium text-sm">No Context Index</h3>
          <p className="text-xs text-muted-foreground">Index your project to enable semantic search and AI awareness.</p>
        </div>
        <Button size="sm" onClick={() => contextService.indexProject()} disabled={isIndexing}>
          {isIndexing ? "Indexing..." : "Start Indexing"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="p-4 border-b border-border/50">
        <h3 className="text-sm font-semibold mb-1 flex items-center">
          <Search className="h-4 w-4 mr-2" />
          Project Context
        </h3>
        <p className="text-[10px] text-muted-foreground italic">
          Automatically providing Gemini with relevant file content.
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">Overview</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-muted/40 p-3 rounded-lg border border-border/30 text-center">
                <div className="text-xl font-bold">{stats.file_count}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Files</div>
              </div>
              <div className="bg-muted/40 p-3 rounded-lg border border-border/30 text-center">
                <div className="text-xl font-bold">{stats.languages.length}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Langs</div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">Top Languages</h4>
            <div className="space-y-2">
              {stats.languages.slice(0, 5).map(([lang, count]: [string, number]) => (
                <div key={lang} className="flex items-center justify-between text-xs p-2 bg-muted/20 rounded border border-border/20">
                  <div className="flex items-center">
                    <FileText className="h-3 w-3 mr-2 text-primary/70" />
                    <span className="capitalize">{lang}</span>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/20 text-orange-200">
             <div className="flex items-start">
               <AlertTriangle className="h-3.5 w-3.5 mr-2 mt-0.5" />
               <div className="text-[10px] leading-relaxed">
                 Terax indices are purely local. File contents never leave your machine except when sent to Gemini as conversation context.
               </div>
             </div>
          </div>
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border/50">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full h-8 text-[11px]" 
          onClick={() => contextService.indexProject()}
          disabled={isIndexing}
        >
          {isIndexing ? "Updating..." : "Update Index"}
        </Button>
      </div>
    </div>
  );
}
