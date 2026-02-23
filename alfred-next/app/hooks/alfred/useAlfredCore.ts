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
    conversation: 'idle',
    command: 'idle',
    context: 'idle',
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
    case 'RESET_AGENT_STATUS':
      return {
        ...state,
        agentStatus: { conversation: 'idle', command: 'idle', context: 'idle' },
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

  const updateProcessingState = useCallback((newState: ProcessingState) => {
    dispatch({ type: 'SET_PROCESSING_STATE', payload: newState });
    processingStateRef.current = newState;
    if (['listening', 'idle', 'paused'].includes(newState)) {
      dispatch({ type: 'RESET_AGENT_STATUS' });
    }
  }, []);

  const updateAgentStatus = useCallback(
    (agent: 'conversation' | 'command' | 'context', state: AgentState) => {
      dispatch({ type: 'SET_AGENT_STATUS', payload: { [agent]: state } });
    },
    [],
  );

  const setAgentStatus = useCallback(
    (status: { conversation: AgentState; command: AgentState; context: AgentState }) => {
      dispatch({ type: 'SET_AGENT_STATUS', payload: status });
    },
    [],
  );

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
    if (!isSpeechDoneRef.current) return;

    if (isConversationDoneRef.current) {
      if (
        isSystemActiveRef.current &&
        processingStateRef.current !== 'listening'
      ) {
        startListening();
      } else if (!isSystemActiveRef.current) {
        updateProcessingState('paused');
      }
    } else {
      if (
        isSystemActiveRef.current &&
        processingStateRef.current !== 'listening'
      ) {
        startListening(true);
      }
    }
  }, [updateProcessingState, startListening, isSpeechDoneRef]);

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
