'use client';

import { AlfredStatus } from './AlfredStatus';
import { AlfredCommandsList } from './AlfredCommandsList';
import { useAlfredCore } from '../hooks/alfred/useAlfredCore';
import { commands } from '../services/commandService';

const availableCommands = Object.keys(commands);

export default function AlfredInterface() {
  const { state, actions } = useAlfredCore();
  const { 
    isReady, 
    processingState, 
    statusMessage, 
    agentStatus, 
    agentTokens,
    lastWordDisplay, 
    currentWord,
    memoryDiff
  } = state;
  const { toggleListening, handleStartManual } = actions;

  if (!isReady) return <div className="text-xl text-green-500">Loading Alfred System...</div>;

  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-screen font-sans text-center">
      {processingState === 'idle' ? (
        <div className="flex flex-col items-center">
          <button onClick={handleStartManual} className="px-6 py-3 text-2xl font-bold text-green-500 border-2 border-green-500 rounded hover:bg-green-500 hover:text-black transition">
            Click to Activate
          </button>
          {statusMessage && <div className="mt-4 text-red-500 bg-black/80 px-4 py-2 rounded border border-red-900">{statusMessage}</div>}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-8">
          <AlfredStatus 
            processingState={processingState} 
            statusMessage={statusMessage} 
            agentStatus={agentStatus}
            agentTokens={agentTokens}
            memoryDiff={memoryDiff}
          />
          
          <span className="text-2xl text-green-400 opacity-80 max-w-3xl px-4">{lastWordDisplay}</span>
          <h1 className="text-6xl font-bold text-green-500 tracking-widest uppercase glow">{currentWord}</h1>
          
          <AlfredCommandsList availableCommands={availableCommands} />
          
          <div className="flex flex-col gap-4">
            <button onClick={toggleListening} className="px-6 py-2 font-bold text-yellow-500 border border-yellow-500 rounded hover:bg-yellow-500 hover:text-black transition-colors">
              {processingState === 'paused' ? 'RESUME' : 'PAUSE'}
            </button>
            <button onClick={() => window.location.reload()} className="px-4 py-2 text-sm text-red-500 border border-red-500 rounded hover:bg-red-500 hover:text-white">
              Reset System
            </button>
          </div>
        </div>
      )}
      <style jsx global>{`
        .glow { text-shadow: 0 0 10px #00ff41, 0 0 20px #00ff41; }
      `}</style>
    </div>
  );
}
