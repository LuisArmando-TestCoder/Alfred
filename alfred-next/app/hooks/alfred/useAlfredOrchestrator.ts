import { useCallback } from 'react';
import { ProcessingState } from '../../types/alfred';
import { AgentState } from '../../components/AlfredStatus';
import { 
  runCoordinatorAgent,
  runConversationAgent, 
  runCommandAgent, 
  runContextManager 
} from '../../services/agentService';
import { commands } from '../../services/commandService';

interface UseAlfredOrchestratorProps {
  // State
  readmeText: string;
  isConversationDoneRef: React.MutableRefObject<boolean>;
  isSpeechDoneRef: React.MutableRefObject<boolean>;
  shouldListenRef: React.MutableRefObject<boolean>;
  processingStateRef: React.MutableRefObject<ProcessingState>;
  
  // Actions
  updateProcessingState: (state: ProcessingState) => void;
  updateAgentStatus: (agent: 'conversation' | 'command' | 'context', state: AgentState) => void;
  setAgentStatus: (status: { conversation: AgentState, command: AgentState, context: AgentState }) => void;
  setStatusMessage: (msg: string) => void;
  setMatrixText: (text: string) => void;
  setContextText: (text: string) => void;
  setLastWordDisplay: (text: string) => void;
  setCurrentWord: (word: string) => void;
  
  // Speech
  speak: (text: string, onEnd?: () => void) => void;
  speakChunk: (text: string, isFinal: boolean, onEnd?: () => void) => void;
  cancelSpeech: () => void;
  stopListening: () => void;
  checkRestartListening: () => void;
  
  // Refs
  accumulatedTranscriptRef: React.MutableRefObject<string>;
  transcriptBufferRef: React.MutableRefObject<string>;
  soundOfCoincidenceRef: React.MutableRefObject<HTMLAudioElement | null>;
}

export function useAlfredOrchestrator({
  readmeText,
  isConversationDoneRef,
  isSpeechDoneRef,
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
  checkRestartListening,
  accumulatedTranscriptRef,
  transcriptBufferRef,
  soundOfCoincidenceRef
}: UseAlfredOrchestratorProps) {
  
  const onSilenceDetected = useCallback(async () => {
    if (!isConversationDoneRef.current || !isSpeechDoneRef.current || processingStateRef.current !== 'listening') return;
    
    const fullText = (accumulatedTranscriptRef.current + transcriptBufferRef.current).trim();
    if (!fullText) return;

    isConversationDoneRef.current = false;
    isSpeechDoneRef.current = false;
    setAgentStatus({ conversation: 'idle', command: 'idle', context: 'idle' });
    updateProcessingState('processing');
    setStatusMessage("Processing...");
    cancelSpeech();
    speak("Processing.");

    const coordinatorResult = await runCoordinatorAgent(fullText);

    const contextRes = await fetch('http://localhost:8000/api/context/raw');
    const contextData = await contextRes.json();
    const currentContext = contextData.content;

    setMatrixText(''); // Reset at start of new interaction
    updateAgentStatus('conversation', 'processing');
    
    await runConversationAgent(fullText, currentContext, readmeText, {
      onWord: (fullResponse) => {
        setLastWordDisplay(fullResponse);
        const hasThoughts = fullResponse.includes('<thought>') || fullResponse.includes('</thought>') || fullResponse.includes('Thinking:');
        if (hasThoughts) {
          setMatrixText(fullResponse);
        } else {
          setMatrixText('');
        }
      },
      onSentence: (sentence) => speakChunk(sentence, false),
      onComplete: (sentence) => {
        updateAgentStatus('conversation', 'success');
        speakChunk(sentence, true, checkRestartListening);
      },
      onError: (err: Error) => {
        console.error("Conversation failed", err);
        updateAgentStatus('conversation', 'error');
        const msg = err.message || "I could not reach the brain.";
        setStatusMessage(msg);
        speak(msg);
      }
    });

    await Promise.all([
      coordinatorResult.commands ? runCommandAgent(fullText, currentContext, commands, async ({ command, args }) => {
        updateAgentStatus('command', 'processing');
        if (commands[command]) {
          setCurrentWord(command);
          if (soundOfCoincidenceRef.current) {
            soundOfCoincidenceRef.current.play().catch(e => console.log('Audio play failed', e));
          }
          const resultMsg = await commands[command].action(...args);
          if (resultMsg) {
            speak(resultMsg, checkRestartListening);
          }
        }
        updateAgentStatus('command', 'success');
      }).catch(err => {
        console.error("Command Agent failed", err);
        updateAgentStatus('command', 'error');
        setStatusMessage(err.message);
      }) : Promise.resolve(),
      coordinatorResult.memory ? runContextManager(fullText, currentContext).then(newCtx => {
        updateAgentStatus('context', 'success');
        setContextText(newCtx);
      }).catch(err => {
        console.error("Context Manager failed", err);
        updateAgentStatus('context', 'error');
        setStatusMessage(err.message);
      }) : Promise.resolve()
    ]);

    isConversationDoneRef.current = true;
    checkRestartListening();
  }, [
    readmeText,
    isConversationDoneRef,
    isSpeechDoneRef,
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
    checkRestartListening,
    accumulatedTranscriptRef,
    transcriptBufferRef,
    soundOfCoincidenceRef
  ]);

  return { onSilenceDetected };
}
