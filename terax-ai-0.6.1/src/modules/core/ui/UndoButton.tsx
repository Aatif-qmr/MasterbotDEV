import { useTimeTravelStore } from '../time_travel/store';
import { timeTravelService } from '../time_travel/service';
import { Button } from './button';
import { Undo2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

export function UndoButton() {
  const { timeline } = useTimeTravelStore();
  const canUndo = timeline.length > 1;

  const handleUndo = async () => {
    if (timeline.length > 1) {
      // Restore to the previous snapshot
      await timeTravelService.restoreSnapshot(timeline[1].id);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={!canUndo}
          onClick={handleUndo}
        >
          <Undo2 className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Undo last major action</p>
      </TooltipContent>
    </Tooltip>
  );
}
