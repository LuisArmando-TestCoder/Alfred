'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ProcessingState } from '../types/alfred';
import { commands } from '../services/commandService';
import { 
  runPonderingAgent, 
  runConversationAgent, 
  runCommandAgent, 
  runContextManager 
} from '../services/agentService';
import { useAlfredSpeech } from '../hooks/useAlfredSpeech';
import { AlfredStatus } from './AlfredStatus';
import { AlfredCommandsList } from './AlfredCommandsList';
import { useAlfredStore } from '../store/useAlfredStore';

export default function AlfredInterface() {
  const { setMatrixText, setContextText } = useAlfredStore();
  const [lastWordDisplay, setLastWordDisplay] = useState('');
  const [currentWord, setCurrentWord] = useState('');
  const [availableCommands] = useState<string[]>(Object.keys(commands));
  const [isReady, setIsReady] = useState(false);
  const [processingState, setProcessingState] = useState<ProcessingState>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  
  const processingStateRef = useRef<ProcessingState>('idle');
  const shouldListenRef = useRef(false);
  const isSystemActiveRef = useRef(false);
  const isConversationDoneRef = useRef(true);
  const soundOfCoincidenceRef = useRef<HTMLAudioElement | null>(null);
  const startListeningRef = useRef<() => void>(() => {});

  const updateProcessingState = useCallback((state: ProcessingState) => {
    setProcessingState(state);
    processingStateRef.current = state;
  }, []);

  const checkRestartListening = useCallback(() => {
    if (isConversationDoneRef.current && isSpeechDoneRef.current) {
      if (isSystemActiveRef.current) {
        startListeningRef.current();
      } else {
        updateProcessingState('paused');
      }
    }
  }, [updateProcessingState]);

  const onSilenceDetected = async () => {
    if (!isConversationDoneRef.current || !isSpeechDoneRef.current || processingStateRef.current !== 'listening') return;
    
    const fullText = (accumulatedTranscriptRef.current + transcriptBufferRef.current).trim();
    if (!fullText) return;

    isConversationDoneRef.current = false;
    shouldListenRef.current = false;
    stopListening();
    updateProcessingState('processing');
    setStatusMessage("Processing...");
    cancelSpeech();

    const contextRes = await fetch('http://localhost:8000/api/context/raw');
    const contextData = await contextRes.json();
    const currentContext = contextData.content;

    // const needsPondering = await runPonderingAgent(fullText);
    // if (needsPondering) {
    //   updateProcessingState('pondering');
    //   await new Promise(resolve => setTimeout(resolve, 2500));
    // }

    setMatrixText(''); // Reset at start of new interaction
    await runConversationAgent(fullText, currentContext, {
      onWord: (fullResponse) => {
        setLastWordDisplay(fullResponse);
        // If there are thoughts (common in some models), show the whole response
        // Otherwise, if no thoughts are detected yet, it stays empty and Matrix shows context.md
        const hasThoughts = fullResponse.includes('<thought>') || fullResponse.includes('</thought>') || fullResponse.includes('Thinking:');
        if (hasThoughts) {
          setMatrixText(fullResponse);
        } else {
          setMatrixText('');
        }
      },
      onSentence: (sentence) => speakChunk(sentence, false),
      onComplete: (sentence) => speakChunk(sentence, true, checkRestartListening),
      onError: (err) => {
        console.error("Conversation failed", err);
        speak("I could not reach the brain.");
      }
    });

    await Promise.all([
      runCommandAgent(fullText, currentContext, commands, async ({ command, args }) => {
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
      }),
      runContextManager(fullText, currentContext).then(newCtx => {
        setContextText(newCtx);
      })
    ]);

    isConversationDoneRef.current = true;
    checkRestartListening();
  };

  const {
    startListening,
    stopListening,
    speak,
    speakChunk,
    cancelSpeech,
    isSpeechDoneRef,
    transcriptBufferRef,
    accumulatedTranscriptRef
  } = useAlfredSpeech({
    onStatusChange: setStatusMessage,
    onProcessingStateChange: updateProcessingState,
    onResult: (t, accumulated) => setLastWordDisplay(accumulated + t),
    onSilenceDetected,
    shouldListenRef,
    processingStateRef
  });

  useEffect(() => {
    // Connect to SSE for server-pulsed commands (Cron jobs)
    const eventSource = new EventSource('http://localhost:8000/api/events');
    
    eventSource.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        const { command, args } = data;
        
        console.log("Pulsed command received:", command, args);
        
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
      } catch (e) {
        console.error("Error parsing pulsed command:", e);
      }
    };

    eventSource.onerror = (err) => {
      console.error("EventSource failed:", err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [speak, checkRestartListening]);

  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  useEffect(() => {
    const fetchContext = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/context/raw');
        const data = await res.json();
        setContextText(data.content);
      } catch (err) {
        console.error("Failed to fetch context", err);
      }
    };
    fetchContext();

    soundOfCoincidenceRef.current = new Audio('/mp3/coincidence.mp3');
    setIsReady(true);
    return () => {
      stopListening();
    };
  }, [stopListening, setContextText]);

  const handleStartManual = () => {
    isSystemActiveRef.current = true;
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => startListening())
      .catch(() => setStatusMessage("Permission Denied"));
  };

  const toggleListening = () => {
    if (isSystemActiveRef.current) {
      isSystemActiveRef.current = false;
      updateProcessingState('paused');
      stopListening();
      cancelSpeech();
    } else {
      isSystemActiveRef.current = true;
      if (isConversationDoneRef.current && isSpeechDoneRef.current) {
        startListening();
      }
    }
  };

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
          <AlfredStatus processingState={processingState} statusMessage={statusMessage} />
          
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
