import { ProcessingState } from "../types/alfred";

interface AlfredStatusProps {
  processingState: ProcessingState;
  statusMessage: string;
}

export function AlfredStatus({ processingState, statusMessage }: AlfredStatusProps) {
  const getStateColor = () => {
    switch (processingState) {
      case 'listening': return 'text-green-500';
      case 'processing': return 'text-blue-500';
      case 'pondering': return 'text-orange-500';
      case 'speaking': return 'text-purple-500';
      case 'paused': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className={`text-xl font-bold border px-4 py-2 rounded bg-black/80 ${getStateColor()} border-current`}>
        State: {processingState.toUpperCase()}
      </div>
      {statusMessage && (
        <span className="text-lg text-yellow-400 mb-2 border border-yellow-900 px-2 py-1 rounded bg-black/50">
          {statusMessage}
        </span>
      )}
    </div>
  );
}
