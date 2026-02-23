import { useRef, useEffect, useCallback } from 'react';
import { ProcessingState } from '../types/alfred';

interface UseAlfredSpeechProps {
  onStatusChange: (message: string) => void;
  onProcessingStateChange: (state: ProcessingState) => void;
  onResult: (transcript: string, accumulated: string) => void;
  onSilenceDetected: () => void;
  onSpeechEnd?: () => void;
  shouldListenRef: React.MutableRefObject<boolean>;
  processingStateRef: React.MutableRefObject<ProcessingState>;
}

export function useAlfredSpeech({
  onStatusChange,
  onProcessingStateChange,
  onResult,
  onSilenceDetected,
  onSpeechEnd,
  shouldListenRef,
  processingStateRef
}: UseAlfredSpeechProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const isRecognitionRunningRef = useRef(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptBufferRef = useRef('');
  const accumulatedTranscriptRef = useRef('');
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const isSpeechDoneRef = useRef(true);
  const utterancesRef = useRef<Set<SpeechSynthesisUtterance>>(new Set());

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    
    if (processingStateRef.current !== 'speaking') {
      onProcessingStateChange('speaking');
    }
    
    if (isRecognitionRunningRef.current) {
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch { /* ignore */ }
        }
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterancesRef.current.add(utterance);

    let voices = voicesRef.current;
    if (voices.length === 0) {
      voices = window.speechSynthesis.getVoices();
      voicesRef.current = voices;
    }
    const voice = voices.find(v => v.name === 'Google UK English Male') || voices[0];
    if (voice) utterance.voice = voice;
    utterance.rate = 0.9;
    utterance.pitch = 0.8;
    isSpeechDoneRef.current = false;
    utterance.onend = () => {
      utterancesRef.current.delete(utterance);
      isSpeechDoneRef.current = true;
      if (onEnd) onEnd();
      if (onSpeechEnd) onSpeechEnd();
    };
    utterance.onerror = () => {
      utterancesRef.current.delete(utterance);
      isSpeechDoneRef.current = true;
    };
    window.speechSynthesis.speak(utterance);
  }, [onProcessingStateChange, processingStateRef, onSpeechEnd]);

  const speakChunk = useCallback((text: string, isFinal: boolean = false, onEnd?: () => void) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (!text && !isFinal) return;

    if (processingStateRef.current !== 'speaking') {
      onProcessingStateChange('speaking');
    }
    isSpeechDoneRef.current = false;
    
    if (isRecognitionRunningRef.current) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* ignore */ }
      }
    }

    const textToSpeak = text || " ";
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterancesRef.current.add(utterance);

    let voices = voicesRef.current;
    if (voices.length === 0) {
      voices = window.speechSynthesis.getVoices();
      voicesRef.current = voices;
    }
    const voice = voices.find(v => v.name === 'Google UK English Male') || voices[0];
    if (voice) utterance.voice = voice;
    utterance.rate = 0.9;
    utterance.pitch = 0.8;

    utterance.onend = () => {
      utterancesRef.current.delete(utterance);
      if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
        isSpeechDoneRef.current = true;
        if (onEnd) onEnd();
        if (onSpeechEnd) onSpeechEnd();
      }
    };

    utterance.onerror = () => {
      utterancesRef.current.delete(utterance);
      if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
        isSpeechDoneRef.current = true;
        if (onSpeechEnd) onSpeechEnd();
      }
    };
    
    window.speechSynthesis.speak(utterance);
  }, [onProcessingStateChange, processingStateRef, onSpeechEnd]);

  const startListening = useCallback((silent: boolean = false) => {
    shouldListenRef.current = true;
    
    if (silent) {
        onProcessingStateChange('listening');
        onStatusChange("Listening...");
        transcriptBufferRef.current = '';
        accumulatedTranscriptRef.current = '';
        if (recognitionRef.current && !isRecognitionRunningRef.current) {
          try { 
            recognitionRef.current.start(); 
          } catch { /* ignore */ }
        }
    } else {
        onStatusChange("Sir is about to speak...");
        // NEW: Alfred announces he is listening
        speak("Sir, I am listening", () => {
            onProcessingStateChange('listening');
            onStatusChange("Listening...");
            transcriptBufferRef.current = '';
            accumulatedTranscriptRef.current = '';
            if (recognitionRef.current && !isRecognitionRunningRef.current) {
              try { 
                recognitionRef.current.start(); 
              } catch { /* ignore */ }
            }
        });
    }
  }, [onProcessingStateChange, onStatusChange, shouldListenRef, speak]);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    }
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
  }, [shouldListenRef]);

  const cancelSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      utterancesRef.current.clear();
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      onStatusChange("Browser does not support Speech Recognition");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      if (!shouldListenRef.current) {
        try { recognition.stop(); } catch { /* ignore */ }
        return;
      }
      isRecognitionRunningRef.current = true;
      if (processingStateRef.current === 'idle') {
        onProcessingStateChange('listening');
      }
      onStatusChange("Listening...");
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      if (!shouldListenRef.current) {
        return;
      }
      let t = '';
      for (let i = 0; i < event.results.length; ++i) {
        t += event.results[i][0].transcript;
      }
      transcriptBufferRef.current = t;
      onResult(t, accumulatedTranscriptRef.current);
      
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        if (shouldListenRef.current && processingStateRef.current === 'listening') {
          onSilenceDetected();
        }
      }, 2000);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (e: any) => {
      if (e.error === 'no-speech') return;
      if (e.error === 'network') {
        try { recognition.stop(); } catch { /* ignore */ }
      } else {
        if (e.error !== 'aborted') {
          onProcessingStateChange('idle');
          shouldListenRef.current = false;
        }
      }
    };

    recognition.onend = () => {
      isRecognitionRunningRef.current = false;
      if (shouldListenRef.current && processingStateRef.current === 'listening') {
        accumulatedTranscriptRef.current += transcriptBufferRef.current + ' ';
        transcriptBufferRef.current = '';
        try { recognition.start(); } catch { /* ignore */ }
      }
    };

    recognitionRef.current = recognition;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        voicesRef.current = window.speechSynthesis.getVoices();
      };
      voicesRef.current = window.speechSynthesis.getVoices();
    }

    const watchdog = setInterval(() => {
      if (shouldListenRef.current &&
        processingStateRef.current === 'listening' &&
        !isRecognitionRunningRef.current) {
        console.log("Watchdog: Restarting recognition...");
        try { recognition.start(); } catch { /* ignore */ }
      }
    }, 5000);

    return () => {
      clearInterval(watchdog);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { /* ignore */ }
      }
    };
  }, [onStatusChange, onProcessingStateChange, onResult, onSilenceDetected, shouldListenRef, processingStateRef]);

  return {
    startListening,
    stopListening,
    speak,
    speakChunk,
    cancelSpeech,
    isSpeechDoneRef,
    transcriptBufferRef,
    accumulatedTranscriptRef
  };
}
