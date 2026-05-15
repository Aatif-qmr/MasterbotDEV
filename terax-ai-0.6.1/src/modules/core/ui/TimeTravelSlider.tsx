import { useEffect } from 'react';
import { useTimeTravelStore } from '../time_travel/store';
import { timeTravelService } from '../time_travel/service';
import { Button } from './button';
import { Clock, Rewind } from 'lucide-react';
import { cn } from '../utils';

export function TimeTravelSlider() {
  const { timeline, currentSnapshotId } = useTimeTravelStore();

  useEffect(() => {
    timeTravelService.refreshTimeline();
  }, []);

  const handleRestore = async (id: string) => {
    if (window.confirm("Rewind to this point? Current unsaved changes will be lost.")) {
      await timeTravelService.restoreSnapshot(id);
    }
  };

  if (timeline.length === 0) return null;

  return (
    <div className="flex flex-col space-y-2 p-2 bg-muted/30 rounded-lg border border-border/50">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center space-x-2 text-xs font-medium text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Project Timeline</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 px-2 text-[10px]"
          onClick={() => timeTravelService.createSnapshot("Manual Bookmark")}
        >
          Snapshot
        </Button>
      </div>
      
      <div className="flex items-center space-x-2 px-1 overflow-x-auto no-scrollbar py-1">
        {timeline.map((snap) => (
          <button
            key={snap.id}
            onClick={() => handleRestore(snap.id)}
            className={cn(
              "flex-shrink-0 w-3 h-3 rounded-full border-2 transition-all hover:scale-125",
              currentSnapshotId === snap.id 
                ? "bg-primary border-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" 
                : "bg-muted border-muted-foreground/30 hover:border-primary/50"
            )}
            title={`${snap.label || 'Snapshot'} - ${new Date(snap.timestamp).toLocaleTimeString()}`}
          />
        ))}
      </div>
      
      {currentSnapshotId && (
        <div className="px-2 text-[10px] text-muted-foreground italic flex items-center">
          <Rewind className="h-2 w-2 mr-1" />
          Viewing historical state
          <Button 
            variant="link" 
            className="h-auto p-0 ml-2 text-[10px]"
            onClick={() => useTimeTravelStore.getState().setCurrentSnapshotId(null)}
          >
            Back to Live
          </Button>
        </div>
      )}
    </div>
  );
}
