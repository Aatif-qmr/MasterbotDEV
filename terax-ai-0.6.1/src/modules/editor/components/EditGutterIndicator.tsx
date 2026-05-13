import { type InlineEdit } from '../types';

interface EditGutterIndicatorProps {
  edit: InlineEdit;
}

export function EditGutterIndicator({ edit }: EditGutterIndicatorProps) {
  const color = edit.status === 'pending' ? 'bg-yellow-500' : edit.status === 'accepted' ? 'bg-green-500' : 'bg-red-500';
  
  return (
    <div className={`w-1.5 h-1.5 rounded-full ${color}`} title={edit.status} />
  );
}
