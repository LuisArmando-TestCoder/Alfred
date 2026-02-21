export type ProcessingState = 'idle' | 'listening' | 'processing' | 'pondering' | 'speaking' | 'paused';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export interface CommandAction {
  action: (...args: any[]) => Promise<string>;
}

export type CommandsRecord = Record<string, CommandAction>;

export interface CommandMatch {
  command: string;
  args: any[];
}
