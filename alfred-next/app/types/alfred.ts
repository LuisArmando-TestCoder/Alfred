export type ProcessingState = 'idle' | 'listening' | 'processing' | 'pondering' | 'speaking' | 'paused';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition: any;
  }
}

export interface CommandAction {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action: (...args: any[]) => Promise<string>;
}

export type CommandsRecord = Record<string, CommandAction>;

export interface CommandMatch {
  command: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any[];
}

export type AgentState = 'idle' | 'processing' | 'success' | 'error';

export interface AlfredCoreState {
  isReady: boolean;
  processingState: ProcessingState;
  statusMessage: string;
  agentStatus: {
    conversation: AgentState;
    command: AgentState;
    context: AgentState;
  };
  lastWordDisplay: string;
  currentWord: string;
}

export type AlfredCoreAction =
  | { type: 'SET_IS_READY'; payload: boolean }
  | { type: 'SET_PROCESSING_STATE'; payload: ProcessingState }
  | { type: 'SET_STATUS_MESSAGE'; payload: string }
  | { type: 'SET_AGENT_STATUS'; payload: Partial<AlfredCoreState['agentStatus']> }
  | { type: 'RESET_AGENT_STATUS' }
  | { type: 'SET_LAST_WORD_DISPLAY'; payload: string }
  | { type: 'SET_CURRENT_WORD'; payload: string };
