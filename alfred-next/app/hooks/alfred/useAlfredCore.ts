import {
  useReducer,
  useRef,
  useCallback,
  useEffect,
} from 'react';
import {
  ProcessingState,
  AgentState,
  AlfredCoreState,
  AlfredCoreAction,
} from '../../types/alfred';
import { useAlfredStore } from '../../store/useAlfredStore';
import { useAlfredSpeech } from '../useAlfredSpeech';
import { useAlfredKnowledge } from './useAlfredKnowledge';
import { useAlfredEvents } from './useAlfredEvents';
import { useAlfredOrchestrator } from './useAlfredOrchestrator';
import { useAlfredLifecycle } from './useAlfredLifecycle';

const initialState: AlfredCoreState = {
  isReady: false,
  processingState: 'idle',
  statusMessage: '',
  agentStatus: {
    coordinator: 'idle',
    commandSearch: 'idle',
    conversation: 'idle',
    command: 'idle',
    context: 'idle',
  },
  agentTokens: {
    coordinator: 0,
    commandSearch: 0,
    conversation: 0,
    command: 0,
    context: 0,
  },
  lastWordDisplay: '',
  currentWord: '',
};

function alfredCoreReducer(
  state: AlfredCoreState,
  action: AlfredCoreAction,
): AlfredCoreState {
  switch (action.type) {
    case 'SET_IS_READY':
      return { ...state, isReady: action.payload };
    case 'SET_PROCESSING_STATE':
      return { ...state, processingState: action.payload };
    case 'SET_STATUS_MESSAGE':
      return { ...state, statusMessage: action.payload };
    case 'SET_AGENT_STATUS':
      return {
        ...state,
        agentStatus: { ...state.agentStatus, ...action.payload },
      };
    case 'SET_AGENT_TOKENS':
      return {
        ...state,
        agentTokens: { ...state.agentTokens, ...action.payload },
      };
    case 'RESET_AGENT_STATUS':
      return {
        ...state,
        agentStatus: { 
          coordinator: 'idle',
          commandSearch: 'idle',
          conversation: 'idle', 
          command: 'idle', 
          context: 'idle' 
        },
        agentTokens: {
          coordinator: 0,
          commandSearch: 0,
          conversation: 0,
          command: 0,
          context: 0,
        },
      };
    case 'SET_LAST_WORD_DISPLAY':
      return { ...state, lastWordDisplay: action.payload };
    case 'SET_CURRENT_WORD':
      return { ...state, currentWord: action.payload };
    default:
      return state;
  }
}

export function useAlfredCore() {
  const { setMatrixText, setContextText } = useAlfredStore();
  const [state, dispatch] = useReducer(alfredCoreReducer, initialState);

  const processingStateRef = useRef<ProcessingState>('idle');
  const shouldListenRef = useRef(false);
  const isSystemActiveRef = useRef(false);
  const isConversationDoneRef = useRef(true);
  const soundOfCoincidenceRef = useRef<HTMLAudioElement | null>(null);
  
  // To break circular dependency between speech and orchestrator
  const onSilenceDetectedRef = useRef<() => void>(() => {});
  const handleSilenceDetectedProxy = useCallback(() => {
    onSilenceDetectedRef.current();
  }, []);

  const checkRestartListeningRef = useRef<() => void>(() => {});
  const handleSpeechEndProxy = useCallback(() => {
    checkRestartListeningRef.current();
  }, []);

  const updateProcessingState = useCallback((newState: ProcessingState) => {
    dispatch({ type: 'SET_PROCESSING_STATE', payload: newState });
    processingStateRef.current = newState;
    if (['listening', 'idle', 'paused'].includes(newState)) {
      dispatch({ type: 'RESET_AGENT_STATUS' });
    }
  }, []);

  const updateAgentStatus = useCallback(
    (agent: 'coordinator' | 'commandSearch' | 'conversation' | 'command' | 'context', state: AgentState) => {
      dispatch({ type: 'SET_AGENT_STATUS', payload: { [agent]: state } });
    },
    [],
  );

  const setAgentStatus = useCallback(
    (status: { 
      coordinator: AgentState; 
      commandSearch: AgentState;
      conversation: AgentState; 
      command: AgentState; 
      context: AgentState 
    }) => {
      dispatch({ type: 'SET_AGENT_STATUS', payload: status });
    },
    [],
  );

  const updateAgentTokens = useCallback(
    (agent: keyof AlfredCoreState['agentTokens'], tokens: number) => {
      dispatch({ type: 'SET_AGENT_TOKENS', payload: { [agent]: tokens } });
    },
    [],
  );

  const resetAgentTokens = useCallback(() => {
    dispatch({
      type: 'SET_AGENT_TOKENS',
      payload: {
        coordinator: 0,
        commandSearch: 0,
        conversation: 0,
        command: 0,
        context: 0,
      },
    });
  }, []);

  const setStatusMessage = useCallback((message: string) => {
    dispatch({ type: 'SET_STATUS_MESSAGE', payload: message });
  }, []);

  const setLastWordDisplay = useCallback((text: string) => {
    dispatch({ type: 'SET_LAST_WORD_DISPLAY', payload: text });
  }, []);

  const setCurrentWord = useCallback((word: string) => {
    dispatch({ type: 'SET_CURRENT_WORD', payload: word });
  }, []);

  const { readmeText } = useAlfredKnowledge();

  const speech = useAlfredSpeech({
    onStatusChange: setStatusMessage,
    onProcessingStateChange: updateProcessingState,
    onResult: (t, accumulated) => setLastWordDisplay(accumulated + t),
    onSilenceDetected: handleSilenceDetectedProxy,
    onSpeechEnd: handleSpeechEndProxy,
    shouldListenRef,
    processingStateRef,
  });

  const {
    startListening,
    stopListening,
    speak,
    speakChunk,
    cancelSpeech,
    isSpeechDoneRef,
    transcriptBufferRef,
    accumulatedTranscriptRef,
  } = speech;

  const checkRestartListening = useCallback(() => {
    console.log(`[alfred-next/app/hooks/alfred/useAlfredCore.ts] checkRestartListening() start. speechDone=${isSpeechDoneRef.current}, convDone=${isConversationDoneRef.current}, active=${isSystemActiveRef.current}, state=${processingStateRef.current}`);
    
    // Requirement: Global speech must be done
    if (!isSpeechDoneRef.current) {
      console.log("[alfred-next/app/hooks/alfred/useAlfredCore.ts] checkRestartListening() blocked: speech still active.");
      return;
    }

    // Requirement: Main processing (Conversation LLM) must be done
    if (!isConversationDoneRef.current) {
      console.log("[alfred-next/app/hooks/alfred/useAlfredCore.ts] checkRestartListening() blocked: main brain still processing.");
      return;
    }

    // If both done, and system is active, restart listening
    if (isSystemActiveRef.current) {
      if (processingStateRef.current !== 'listening') {
        console.log("[alfred-next/app/hooks/alfred/useAlfredCore.ts] checkRestartListening() conditions met. Triggering startListening(silent=false, preserve=true).");
        // Always preserve transcript on restart check to allow resuming interrupted sessions
        startListening(false, true);
      } else {
        console.log("[alfred-next/app/hooks/alfred/useAlfredCore.ts] checkRestartListening() system already listening.");
      }
    } else {
      console.log("[alfred-next/app/hooks/alfred/useAlfredCore.ts] checkRestartListening() system inactive. Setting state to paused.");
      updateProcessingState('paused');
    }
  }, [updateProcessingState, startListening, isSpeechDoneRef]);

  useEffect(() => {
    checkRestartListeningRef.current = checkRestartListening;
  }, [checkRestartListening]);

  useAlfredLifecycle({
    stopListening,
    soundOfCoincidenceRef,
    setIsReady: (isReady) => dispatch({ type: 'SET_IS_READY', payload: isReady }),
  });

  const { onSilenceDetected } = useAlfredOrchestrator({
    readmeText,
    isConversationDoneRef,
    isSpeechDoneRef,
    shouldListenRef,
    processingStateRef,
    updateProcessingState,
    updateAgentStatus,
    updateAgentTokens,
    resetAgentTokens,
    setAgentStatus,
    setStatusMessage,
    setMatrixText,
    setContextText,
    setLastWordDisplay,
    setCurrentWord,
    speak,
    speakChunk,
    cancelSpeech,
    stopListening,
    checkRestartListening,
    accumulatedTranscriptRef,
    transcriptBufferRef,
    soundOfCoincidenceRef,
  });
  
  useEffect(() => {
    onSilenceDetectedRef.current = onSilenceDetected;
  }, [onSilenceDetected]);

  useAlfredEvents({
    speak,
    checkRestartListening,
    setCurrentWord,
    soundOfCoincidenceRef,
  });

  const toggleListening = useCallback(() => {
    isSystemActiveRef.current = !isSystemActiveRef.current;
    if (isSystemActiveRef.current) {
      if (isConversationDoneRef.current && isSpeechDoneRef.current) {
        startListening();
      }
    } else {
      updateProcessingState('paused');
      stopListening();
      cancelSpeech();
    }
  }, [
    updateProcessingState,
    stopListening,
    cancelSpeech,
    startListening,
    isSpeechDoneRef,
  ]);

  const handleStartManual = useCallback(async () => {
    isSystemActiveRef.current = true;
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      startListening();
    } catch (error) {
      console.error('Error getting user media:', error);
      setStatusMessage('Permission Denied');
    }
  }, [startListening, setStatusMessage]);

  return {
    state,
    actions: {
      toggleListening,
      handleStartManual,
      stopListening,
    },
  };
}
