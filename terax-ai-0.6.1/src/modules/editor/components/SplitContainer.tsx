import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { type Orientation } from '../types';

interface SplitContainerProps {
  orientation: Orientation;
  sizes: number[];
  onLayoutChange: (sizes: number[]) => void;
  children: React.ReactNode[];
}

export function SplitContainer({ orientation, sizes, onLayoutChange, children }: SplitContainerProps) {
  return (
    <PanelGroup
      orientation={orientation}
      onLayoutChanged={(sizes: any) => onLayoutChange(sizes as number[])}
    >
      {children.map((child, i) => (
        <>
          <Panel key={`panel-${i}`} defaultSize={sizes[i]}>
            {child}
          </Panel>
          {i < children.length - 1 && <PanelResizeHandle className="w-1 bg-border hover:bg-primary transition-colors" />}
        </>
      ))}
    </PanelGroup>
  );
}
