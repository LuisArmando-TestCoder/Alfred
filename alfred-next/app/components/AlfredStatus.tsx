import { ProcessingState } from "../types/alfred";

export type AgentState = 'idle' | 'processing' | 'success' | 'error';

interface AlfredStatusProps {
  processingState: ProcessingState;
  statusMessage: string;
  agentStatus: {
    coordinator: AgentState;
    commandSearch: AgentState;
    conversation: AgentState;
    command: AgentState;
    context: AgentState;
  };
}

export function AlfredStatus({ processingState, statusMessage, agentStatus }: AlfredStatusProps) {
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

  const getAgentColor = (state: AgentState) => {
    switch (state) {
      case 'processing': return 'bg-yellow-500 shadow-[0_0_10px_#eab308]';
      case 'success': return 'bg-green-500 shadow-[0_0_10px_#22c55e]';
      case 'error': return 'bg-red-500 shadow-[0_0_10px_#ef4444]';
      default: return 'bg-gray-800';
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className={`text-xl font-bold border px-4 py-2 rounded bg-black/80 ${getStateColor()} border-current transition-colors duration-500`}>
        SYSTEM: {processingState.toUpperCase()}
      </div>

      <div className="flex gap-8 px-6 py-3 rounded-full bg-black/40 border border-green-900/30 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${getAgentColor(agentStatus.coordinator)} transition-all duration-300`} />
          <span className="text-[10px] uppercase tracking-tighter text-green-700 font-bold">Coord</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${getAgentColor(agentStatus.commandSearch)} transition-all duration-300`} />
          <span className="text-[10px] uppercase tracking-tighter text-green-700 font-bold">Search</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${getAgentColor(agentStatus.conversation)} transition-all duration-300`} />
          <span className="text-[10px] uppercase tracking-tighter text-green-700 font-bold">Brain</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${getAgentColor(agentStatus.command)} transition-all duration-300`} />
          <span className="text-[10px] uppercase tracking-tighter text-green-700 font-bold">Cmds</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${getAgentColor(agentStatus.context)} transition-all duration-300`} />
          <span className="text-[10px] uppercase tracking-tighter text-green-700 font-bold">Memory</span>
        </div>
      </div>

      {statusMessage && (
        <span className="text-sm text-yellow-400/80 italic font-light tracking-wide max-w-md text-center">
          {statusMessage}
        </span>
      )}
    </div>
  );
}
