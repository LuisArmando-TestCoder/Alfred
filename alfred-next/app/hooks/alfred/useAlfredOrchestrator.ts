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
  updateAgentStatus: (agent: 'coordinator' | 'commandSearch' | 'conversation' | 'command' | 'context', state: AgentState) => void;
  setAgentStatus: (status: { coordinator: AgentState, commandSearch: AgentState, conversation: AgentState, command: AgentState, context: AgentState }) => void;
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
  stopListening,
  checkRestartListening,
  accumulatedTranscriptRef,
  transcriptBufferRef,
  soundOfCoincidenceRef
}: UseAlfredOrchestratorProps) {
  
  const onSilenceDetected = useCallback(async () => {
    console.log("[alfred-next/app/hooks/alfred/useAlfredOrchestrator.ts] onSilenceDetected() triggered.");
    if (!isConversationDoneRef.current || !isSpeechDoneRef.current || processingStateRef.current !== 'listening') {
      console.log("[alfred-next/app/hooks/alfred/useAlfredOrchestrator.ts] onSilenceDetected() aborted: system not ready to process.");
      return;
    }
    
    const fullText = (accumulatedTranscriptRef.current + transcriptBufferRef.current).trim();
    if (!fullText) {
      console.log("[alfred-next/app/hooks/alfred/useAlfredOrchestrator.ts] onSilenceDetected() aborted: empty transcript.");
      return;
    }

    console.log(`[alfred-next/app/hooks/alfred/useAlfredOrchestrator.ts] onSilenceDetected() Processing text: "${fullText}"`);

    // Clear transcript buffers since we've captured the text for processing
    console.log("[alfred-next/app/hooks/alfred/useAlfredOrchestrator.ts] Clearing transcript buffers for new interaction.");
    accumulatedTranscriptRef.current = '';
    transcriptBufferRef.current = '';
    setLastWordDisplay('');

    isConversationDoneRef.current = false;
    isSpeechDoneRef.current = false;
    stopListening();
    setAgentStatus({ 
      coordinator: 'idle', 
      commandSearch: 'idle',
      conversation: 'idle', 
      command: 'idle', 
      context: 'idle' 
    });
    updateProcessingState('processing');
    setStatusMessage("Processing...");
    cancelSpeech();
    speak("Processing.");

    console.log("[alfred-next/app/hooks/alfred/useAlfredOrchestrator.ts] onSilenceDetected() Phase 1: Requesting Coordinator Agent...");
    updateAgentStatus('coordinator', 'processing');
    const coordinatorResult = await runCoordinatorAgent(fullText);
    updateAgentStatus('coordinator', 'success');
    console.log("[alfred-next/app/hooks/alfred/useAlfredOrchestrator.ts] onSilenceDetected() Coordinator Decision:", coordinatorResult);

    const contextRes = await fetch('http://localhost:8000/api/context/raw');
    const contextData = await contextRes.json();
    const currentContext = contextData.content;

    setMatrixText(''); // Reset at start of new interaction

    // 1. Prepare Background Agents (Command and Context)
    console.log("[alfred-next/app/hooks/alfred/useAlfredOrchestrator.ts] onSilenceDetected() Phase 2: Launching Background Agents in parallel...");
    const backgroundTasks: Promise<void>[] = [];
    let commandResult: { command: string; args: (string | number)[] } | null = null;
    let memoryResult: { content: string; diff: string } | null = null;

    if (coordinatorResult.commands) {
      console.log("[alfred-next/app/hooks/alfred/useAlfredOrchestrator.ts] onSilenceDetected() Triggering Command Agent in background.");
      backgroundTasks.push((async () => {
        updateAgentStatus('command', 'processing');
        try {
          await runCommandAgent(fullText, currentContext, commands, (match) => {
            console.log("[alfred-next/app/hooks/alfred/useAlfredOrchestrator.ts] Command Agent returned a match:", match);
            commandResult = match as { command: string; args: (string | number)[] };
          }, (searchState) => {
            updateAgentStatus('commandSearch', searchState);
          });
          updateAgentStatus('command', 'success');
        } catch (err) {
          updateAgentStatus('command', 'error');
          console.error("[alfred-next/app/hooks/alfred/useAlfredOrchestrator.ts] Command Agent failed:", err);
        }
      })());
    }

    if (coordinatorResult.memory) {
      console.log("[alfred-next/app/hooks/alfred/useAlfredOrchestrator.ts] onSilenceDetected() Triggering Context Agent in background.");
      backgroundTasks.push((async () => {
        updateAgentStatus('context', 'processing');
        try {
          const res = await runContextManager(fullText, currentContext);
          console.log("[alfred-next/app/hooks/alfred/useAlfredOrchestrator.ts] Context Manager returned updated memory.");
          memoryResult = res as { content: string; diff: string };
          setContextText(memoryResult.content);
          updateAgentStatus('context', 'success');
        } catch (err) {
          updateAgentStatus('context', 'error');
          console.error("[alfred-next/app/hooks/alfred/useAlfredOrchestrator.ts] Context Manager failed:", err);
        }
      })());
    }

    // 2. Run Conversation Agent (Blocks main flow until speech starts/streams)
    if (coordinatorResult.conversational) {
      console.log("[alfred-next/app/hooks/alfred/useAlfredOrchestrator.ts] onSilenceDetected() Phase 3: Triggering Conversation Agent (Blocking main flow)...");
      updateAgentStatus('conversation', 'processing');
      await new Promise<void>((resolve, reject) => {
        runConversationAgent(fullText, currentContext, readmeText, {
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
            console.log("[alfred-next/app/hooks/alfred/useAlfredOrchestrator.ts] Conversation Agent streaming complete.");
            updateAgentStatus('conversation', 'success');
            speakChunk(sentence, true, () => {
              console.log("[alfred-next/app/hooks/alfred/useAlfredOrchestrator.ts] Conversation Speech finished.");
              // This is the checkRestartListening logic handled later
              resolve();
            });
          },
          onError: (err: Error) => {
            updateAgentStatus('conversation', 'error');
            reject(err);
          }
        });
      });
    }

    // 3. Wait for all background tasks to finish
    console.log("[alfred-next/app/hooks/alfred/useAlfredOrchestrator.ts] onSilenceDetected() Waiting for background tasks (Command/Context) to settle...");
    await Promise.all(backgroundTasks);
    console.log("[alfred-next/app/hooks/alfred/useAlfredOrchestrator.ts] onSilenceDetected() Background tasks settled.");

    // 4. Handle sequential results of background tasks after conversation
    console.log("[alfred-next/app/hooks/alfred/useAlfredOrchestrator.ts] onSilenceDetected() Phase 4: Enacting effects sequentially...");
    const finalCommandResult = commandResult as { command: string; args: (string | number)[] } | null;
    if (finalCommandResult) {
      const { command, args } = finalCommandResult;
      if (commands[command]) {
        setCurrentWord(command);
        if (soundOfCoincidenceRef.current) {
          soundOfCoincidenceRef.current.play().catch(e => console.log('Audio play failed', e));
        }
        
        // Announce command
        speak(`Command. ${command.replace(/_/g, ' ')}.`);
        
        const resultMsg = await commands[command].action(...args);
        if (resultMsg) {
          speak(resultMsg);
        }
      }
    }

    const finalMemoryResult = memoryResult as { content: string; diff: string } | null;
    if (finalMemoryResult && finalMemoryResult.diff && finalMemoryResult.diff !== "No significant changes.") {
      console.log(`[alfred-next/app/hooks/alfred/useAlfredOrchestrator.ts] Announcing Memory Saved: ${finalMemoryResult.diff}`);
      speak(`Memory saved. ${finalMemoryResult.diff}`);
    }

    console.log("[alfred-next/app/hooks/alfred/useAlfredOrchestrator.ts] onSilenceDetected() Final Synchronization: Setting conversation done and checking for listen restart.");
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
    stopListening,
    checkRestartListening,
    accumulatedTranscriptRef,
    transcriptBufferRef,
    soundOfCoincidenceRef
  ]);

  return { onSilenceDetected };
}
